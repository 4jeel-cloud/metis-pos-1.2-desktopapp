const { app, BrowserWindow, dialog } = require('electron');
const { spawn, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');

// Disable sandbox in dev (non-packaged) mode for Linux compatibility
if (!app.isPackaged) {
  app.commandLine.appendSwitch('no-sandbox');
}

const APP_DIR = __dirname;
const PUBLIC_DIR = path.join(APP_DIR, 'public');
const ROUTER_SCRIPT = path.join(PUBLIC_DIR, 'router.php');
const IS_PACKAGED = app.isPackaged;

// Data directory: user-writable, persists across reinstalls
const USER_DATA_DIR = app.getPath('userData');
const DB_PATH = path.join(USER_DATA_DIR, 'database.sqlite');
const ENV_PATH = path.join(USER_DATA_DIR, '.env');
const STORAGE_PATH = path.join(USER_DATA_DIR, 'storage');

// ── PHP Config Resolution ────────────────────────────────────────
function getPhpConfig() {
  const config = { binary: 'php', args: [] };

  if (process.platform === 'win32') {
    const bundledDir = path.join(APP_DIR, 'php-binary', 'win');
    const bundledExe = path.join(bundledDir, 'php.exe');
    if (fs.existsSync(bundledExe)) {
      config.binary = bundledExe;
      const iniPath = path.join(bundledDir, 'php.ini');
      if (fs.existsSync(iniPath)) {
        config.args.push('-c', bundledDir);
      }
    }
    return config;
  }

  // Linux / macOS — prefer bundled PHP (has SQLite compiled in)
  const bundledDir = path.join(APP_DIR, 'php-binary', process.platform);
  const bundledExe = path.join(bundledDir, 'php');
  if (fs.existsSync(bundledExe)) {
    config.binary = bundledExe;
    return config; // static PHP has SQLite built in, no flags needed
  }

  // System PHP — may need SQLite extensions loaded explicitly
  const extPaths = [
    '/tmp/opencode/php-ext/pdo_sqlite.so',
    '/tmp/opencode/php-ext/sqlite3.so',
  ];
  const pdo = extPaths.find((p) => fs.existsSync(p));
  const sqlite = extPaths.find((p) => p.endsWith('sqlite3.so') && fs.existsSync(p));
  if (pdo) config.args.push(`-d extension=${pdo}`);
  if (sqlite && sqlite !== pdo) config.args.push(`-d extension=${sqlite}`);

  return config;
}

// ── First-Run Setup ──────────────────────────────────────────────
function databaseNeedsSetup() {
  if (!fs.existsSync(DB_PATH)) return true;
  try {
    const info = fs.statSync(DB_PATH);
    if (info.size === 0) return true;
  } catch { return true; }
  return false;
}

function writeEnvFile() {
  const envContent = [
    'APP_NAME="MetisPOS"',
    'APP_ENV=production',
    `APP_KEY=${require('crypto').randomBytes(32).toString('base64')}`,
    'APP_DEBUG=false',
    'APP_URL=http://127.0.0.1',
    'DB_CONNECTION=sqlite',
    `DB_DATABASE=${DB_PATH}`,
    'DB_PREFIX=ns_',
    'SESSION_DRIVER=file',
    'SESSION_LIFETIME=120',
    'SESSION_DOMAIN=127.0.0.1',
    'SESSION_COOKIE=metis-pos_session',
    'CACHE_DRIVER=file',
    'QUEUE_CONNECTION=sync',
    '',
  ].join('\n');
  fs.writeFileSync(ENV_PATH, envContent, 'utf-8');
  return ENV_PATH;
}

function ensureDirectories() {
  const dirs = [
    path.dirname(DB_PATH),
    STORAGE_PATH,
    path.join(STORAGE_PATH, 'logs'),
    path.join(STORAGE_PATH, 'framework'),
    path.join(STORAGE_PATH, 'framework', 'cache'),
    path.join(STORAGE_PATH, 'framework', 'sessions'),
    path.join(STORAGE_PATH, 'framework', 'views'),
    path.join(STORAGE_PATH, 'app'),
    path.join(STORAGE_PATH, 'app', 'public'),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

function getPhpEnv(port) {
  return {
    ...process.env,
    APP_URL: port ? `http://127.0.0.1:${port}` : 'http://127.0.0.1',
    SANCTUM_STATEFUL_DOMAINS: port ? `127.0.0.1:${port},localhost,127.0.0.1` : '127.0.0.1,localhost',
    DB_DATABASE: DB_PATH,
    APP_STORAGE_PATH: STORAGE_PATH,
    APP_ENV: 'production',
    APP_DEBUG: 'false',
  };
}

async function runSetup() {
  const { binary: phpBin, args: extensions } = getPhpConfig();

  ensureDirectories();

  // Create the SQLite file so PDO can connect
  fs.closeSync(fs.openSync(DB_PATH, 'w'));

  // Write .env into user data directory
  writeEnvFile();

  const phpEnv = getPhpEnv();

  console.log('[Setup] Running migrations...');
  try {
    execFileSync(phpBin, [...extensions, path.join(APP_DIR, 'artisan'), 'migrate', '--force'], {
      cwd: APP_DIR,
      env: phpEnv,
      stdio: 'pipe',
      timeout: 60000,
    });
  } catch (err) {
    console.error('[Setup] Migration failed:', err.stderr?.toString() || err.message);
    throw err;
  }

  // Run ns:setup to complete the installation non-interactively
  console.log('[Setup] Running ns:setup...');
  try {
    execFileSync(phpBin, [...extensions, path.join(APP_DIR, 'artisan'), 'ns:setup',
      '--store_name=MetisPOS',
      '--admin_username=admin',
      '--admin_email=admin@metis-pos.com',
      '--admin_password=metisadmin',
      '--language=en',
    ], {
      cwd: APP_DIR,
      env: phpEnv,
      stdio: 'pipe',
      timeout: 120000,
    });
  } catch (err) {
    console.error('[Setup] ns:setup failed:', err.stderr?.toString() || err.message);
    throw err;
  }

  console.log('[Setup] Setup complete.');
}

// ── PHP Server ───────────────────────────────────────────────────
function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

async function startPhpServer() {
  const port = await getAvailablePort();
  const { binary: phpBin, args: extensions } = getPhpConfig();

  const args = [
    ...extensions,
    '-S', `127.0.0.1:${port}`,
    '-t', PUBLIC_DIR,
    ROUTER_SCRIPT,
  ];

  // Ensure writable directories exist
  ensureDirectories();

  const phpEnv = getPhpEnv(port);

  const phpProcess = spawn(phpBin, args, {
    cwd: APP_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: phpEnv,
  });

  phpProcess.stderr.on('data', (data) => {
    console.error(`[PHP] ${data}`);
  });

  phpProcess.on('close', (code) => {
    console.log(`[PHP] Server exited with code ${code}`);
  });

  // Wait until the server is ready
  await new Promise((resolve, reject) => {
    const maxAttempts = 30;
    let attempts = 0;
    const check = () => {
      attempts++;
      const http = require('http');
      const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
        resolve(port);
      });
      req.on('error', () => {
        if (attempts >= maxAttempts) {
          reject(new Error('PHP server failed to start'));
        } else {
          setTimeout(check, 200);
        }
      });
      req.setTimeout(1000, () => {
        req.destroy();
        if (attempts >= maxAttempts) {
          reject(new Error('PHP server timed out'));
        } else {
          setTimeout(check, 200);
        }
      });
    };
    check();
  });

  return { phpProcess, port };
}

// ── Application Window ───────────────────────────────────────────
function createWindow(port) {
  const iconPath = path.join(PUBLIC_DIR, 'svg', 'metis-pos-logo.png');
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    title: 'MetisPOS',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(`http://127.0.0.1:${port}`);
  win.setTitle('MetisPOS');

  // Open DevTools in development
  if (process.env.DEBUG) {
    win.webContents.openDevTools();
  }

  return win;
}

// ── App Lifecycle ────────────────────────────────────────────────
let phpProcess = null;

app.whenReady().then(async () => {
  // First-run setup: create database, run migrations, seed data
  if (databaseNeedsSetup()) {
    try {
      await runSetup();
    } catch (err) {
      dialog.showErrorBox('Setup Failed',
        `MetisPOS could not complete the initial setup:\n\n${err.message}\n\n` +
        'Please check that PHP 8.3+ with SQLite support is available.');
      app.quit();
      return;
    }
  }

  // Start the PHP server and open the window
  try {
    const server = await startPhpServer();
    phpProcess = server.phpProcess;
    const win = createWindow(server.port);

    win.on('closed', () => {
      if (phpProcess) {
        phpProcess.kill();
        phpProcess = null;
      }
    });
  } catch (err) {
    dialog.showErrorBox('Startup Failed',
      `MetisPOS could not start:\n\n${err.message}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (phpProcess) {
    phpProcess.kill();
    phpProcess = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    // macOS: re-create window
  }
});

app.on('before-quit', () => {
  if (phpProcess) {
    phpProcess.kill();
    phpProcess = null;
  }
});
