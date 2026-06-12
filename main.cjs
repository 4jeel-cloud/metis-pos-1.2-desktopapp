const { app, BrowserWindow, dialog } = require('electron');
const { spawn, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');

// Disable sandbox — required for PHP subprocess and preload on some Windows installs
if (process.platform === 'win32' || !app.isPackaged) {
  app.commandLine.appendSwitch('no-sandbox');
}

const IS_PACKAGED = app.isPackaged;
const APP_DIR = IS_PACKAGED ? path.join(process.resourcesPath, 'app.asar.unpacked') : __dirname;
const RESOURCES_DIR = IS_PACKAGED ? process.resourcesPath : __dirname;
const PUBLIC_DIR = path.join(APP_DIR, 'public');
const ROUTER_SCRIPT = path.join(PUBLIC_DIR, 'router.php');

// Data directory: user-writable, persists across reinstalls
const USER_DATA_DIR = app.getPath('userData');
const DB_PATH = path.join(USER_DATA_DIR, 'database.sqlite');
const ENV_PATH = path.join(USER_DATA_DIR, '.env');
const STORAGE_PATH = path.join(USER_DATA_DIR, 'storage');

// ── PHP Config Resolution ────────────────────────────────────────
function getPhpConfig() {
  const config = { binary: 'php', args: [] };

  const bundledDir = path.join(RESOURCES_DIR, 'php-binary');
  const bundledExe = path.join(bundledDir, process.platform === 'win32' ? 'php.exe' : 'php');
  if (fs.existsSync(bundledExe)) {
    config.binary = bundledExe;
    if (process.platform === 'win32') {
      const iniPath = path.join(bundledDir, 'php.ini');
      if (fs.existsSync(iniPath)) {
        config.args.push('-c', bundledDir);
      }
    }
    return config;
  }
  if (fs.existsSync(bundledExe)) {
    config.binary = bundledExe;
    return config; // static PHP has SQLite built in, no flags needed
  }

  // System PHP — check if SQLite PDO is already available
  try {
    require('child_process').execFileSync(config.binary, [...config.args, '-r', 'new PDO("sqlite::memory:");'], { stdio: 'pipe', timeout: 5000 });
    return config; // system PHP already has SQLite
  } catch {}

  // Try common SQLite extension paths
  const searchDirs = [
    '/tmp/opencode/php-ext',
    '/usr/lib/php/extensions',
    '/usr/lib/php',
    '/usr/local/lib/php/extensions',
  ];
  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir);
    const pdo = files.find(f => f.startsWith('pdo_sqlite'));
    const sqlite3 = files.find(f => f.startsWith('sqlite3'));
    if (pdo) config.args.push(`-d extension=${path.join(dir, pdo)}`);
    if (sqlite3 && sqlite3 !== pdo) config.args.push(`-d extension=${path.join(dir, sqlite3)}`);
    if (pdo || sqlite3) break;
  }

  return config;
}

// Prevent PHP max_execution_time from aborting migrations/setup
const PHP_TIMEOUT_ARGS = ['-d', 'max_execution_time=0', '-d', 'max_input_time=600'];

function phpArgs(extensions, ...extra) {
  return [...extensions, ...PHP_TIMEOUT_ARGS, ...extra];
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

function generateAppKey() {
  return `base64:${require('crypto').randomBytes(32).toString('base64')}`;
}

function writeEnvFile() {
  const envContent = [
    'APP_NAME="MetisPOS"',
    'APP_ENV=production',
    `APP_KEY=${generateAppKey()}`,
    'APP_DEBUG=false',
    'APP_URL=http://127.0.0.1',
    'DB_CONNECTION=sqlite',
    'DB_HOST=',
    `DB_DATABASE=${DB_PATH}`,
    'DB_USERNAME=',
    'DB_PASSWORD=',
    'DB_PREFIX=ns_',
    'SESSION_DRIVER=file',
    'SESSION_LIFETIME=120',
    'SESSION_DOMAIN=127.0.0.1',
    'SESSION_COOKIE=metis-pos_session',
    'CACHE_DRIVER=file',
    'QUEUE_CONNECTION=sync',
    // Telescope is a dev tool that requires MySQL; disable it in the desktop app
    // to prevent "could not find driver" MySQL errors that cause blank screens.
    'TELESCOPE_ENABLED=false',
    '',
  ].join('\n');
  fs.writeFileSync(ENV_PATH, envContent, 'utf-8');
  return ENV_PATH;
}

/** Repair .env from older installs (bad APP_KEY format breaks Laravel encryption). */
function ensureEnvFile() {
  ensureDirectories();

  if (!fs.existsSync(ENV_PATH)) {
    writeEnvFile();
    return;
  }

  let content = fs.readFileSync(ENV_PATH, 'utf-8');
  let changed = false;

  const upsert = (key, value) => {
    const pattern = new RegExp(`^${key}=.*$`, 'm');
    if (pattern.test(content)) {
      const next = content.replace(pattern, `${key}=${value}`);
      if (next !== content) {
        content = next;
        changed = true;
      }
    } else {
      content += `${key}=${value}\n`;
      changed = true;
    }
  };

  const keyMatch = content.match(/^APP_KEY=(.*)$/m);
  if (!keyMatch) {
    upsert('APP_KEY', generateAppKey());
  } else {
    const raw = keyMatch[1].trim().replace(/^["']|["']$/g, '');
    let valid = false;
    if (raw.startsWith('base64:')) {
      try {
        valid = Buffer.from(raw.slice(7), 'base64').length === 32;
      } catch {}
    } else {
      try {
        valid = Buffer.from(raw, 'base64').length === 32;
        if (valid) {
          upsert('APP_KEY', `base64:${raw}`);
        }
      } catch {}
    }
    if (!valid) {
      upsert('APP_KEY', generateAppKey());
    }
  }

  for (const key of ['DB_HOST', 'DB_USERNAME', 'DB_PASSWORD']) {
    if (!new RegExp(`^${key}=`, 'm').test(content)) {
      upsert(key, '');
    }
  }

  if (!/^DB_CONNECTION=/m.test(content)) {
    upsert('DB_CONNECTION', 'sqlite');
  }
  if (!/^DB_DATABASE=/m.test(content)) {
    upsert('DB_DATABASE', DB_PATH);
  }
  if (!/^DB_PREFIX=/m.test(content)) {
    upsert('DB_PREFIX', 'ns_');
  }

  // Ensure Telescope is disabled — it requires MySQL which isn't bundled
  if (!/^TELESCOPE_ENABLED=/m.test(content)) {
    upsert('TELESCOPE_ENABLED', 'false');
  } else {
    // Force it off regardless of what the existing value is
    const current = content.match(/^TELESCOPE_ENABLED=(.*)$/m)?.[1]?.trim();
    if (current !== 'false') {
      upsert('TELESCOPE_ENABLED', 'false');
    }
  }

  if (changed) {
    fs.writeFileSync(ENV_PATH, content, 'utf-8');
    console.log('[Env] Repaired .env file');
  }
}

function ensureDirectories() {
  const dirs = [
    path.dirname(DB_PATH),
    STORAGE_PATH,
    path.join(STORAGE_PATH, 'logs'),
    path.join(STORAGE_PATH, 'framework'),
    path.join(STORAGE_PATH, 'framework', 'cache'),
    // Laravel's file cache driver requires this 'data' subdirectory;
    // without it Blade compilation fails with "Please provide a valid cache path"
    path.join(STORAGE_PATH, 'framework', 'cache', 'data'),
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
    // Explicitly set SQLite so it is never overridden by a stale system env var
    DB_CONNECTION: 'sqlite',
    DB_DATABASE: DB_PATH,
    APP_STORAGE_PATH: STORAGE_PATH,
    APP_ENV_PATH: ENV_PATH,
    APP_ENV: 'production',
    APP_DEBUG: 'false',
    // Disable Telescope — it tries to use MySQL which isn't bundled
    TELESCOPE_ENABLED: 'false',
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
    execFileSync(phpBin, phpArgs(extensions, path.join(APP_DIR, 'artisan'), 'migrate', '--force'), {
      cwd: APP_DIR,
      env: phpEnv,
      stdio: 'pipe',
      timeout: 300000,
    });
  } catch (err) {
    console.error('[Setup] Migration failed:', err.stderr?.toString() || err.message);
    throw err;
  }

  // Run ns:setup to complete the installation non-interactively
  console.log('[Setup] Running ns:setup...');
  try {
    execFileSync(phpBin, phpArgs(extensions, path.join(APP_DIR, 'artisan'), 'ns:setup',
      '--store_name=MetisPOS',
      '--admin_username=admin',
      '--admin_email=admin@metis-pos.com',
      '--admin_password=metisadmin',
      '--language=en',
    ), {
      cwd: APP_DIR,
      env: phpEnv,
      stdio: 'pipe',
      timeout: 600000,
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
    ...phpArgs(extensions),
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

  // Wait until the server is ready (TCP ping, not HTTP — avoids triggering Laravel boot)
  await new Promise((resolve, reject) => {
    const maxAttempts = 60;
    let attempts = 0;
    const RETRY_DELAY = 1000;
    const check = () => {
      attempts++;
      const socket = new net.Socket();
      socket.setTimeout(3000);
      socket.on('connect', () => {
        socket.destroy();
        console.log(`[HealthCheck] Server ready on attempt ${attempts}`);
        resolve(port);
      });
      socket.on('error', () => {
        socket.destroy();
        if (attempts >= maxAttempts) {
          reject(new Error('PHP server failed to start'));
        } else {
          setTimeout(check, RETRY_DELAY);
        }
      });
      socket.on('timeout', () => {
        socket.destroy();
        console.log(`[HealthCheck] attempt ${attempts}/${maxAttempts} timed out`);
        if (attempts >= maxAttempts) {
          reject(new Error('PHP server timed out'));
        } else {
          setTimeout(check, RETRY_DELAY);
        }
      });
      socket.connect(port, '127.0.0.1');
    };
    // Give PHP a moment to initialize before the first check
    setTimeout(check, 3000);
  });

  return { phpProcess, port };
}

// ── Application Window ───────────────────────────────────────────
function createWindow(port) {
  const iconCandidates = [
    path.join(__dirname, 'main logo.png'),
    path.join(__dirname, 'build', 'icon.ico'),
    path.join(APP_DIR, 'public', 'svg', 'metis-pos-logo.png'),
  ];
  const iconPath = iconCandidates.find(p => fs.existsSync(p));
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: iconPath || undefined,
    title: 'MetisPOS',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  let loadAttempts = 0;
  const MAX_LOAD_ATTEMPTS = 5;
  function loadApp() {
    loadAttempts++;
    win.loadURL(`http://127.0.0.1:${port}`);
  }
  loadApp();
  win.setTitle('MetisPOS');

  // Retry on load failure (white screen prevention)
  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`[Renderer] Load failed (attempt ${loadAttempts}/${MAX_LOAD_ATTEMPTS}): ${errorDescription} (${errorCode})`);
    if (loadAttempts < MAX_LOAD_ATTEMPTS) {
      console.log(`[Renderer] Retrying in 2s...`);
      setTimeout(loadApp, 2000);
    }
  });

  // Log renderer console messages to help debug white screen
  win.webContents.on('console-message', (_event, level, message) => {
    const tag = ['log', 'info', 'warn', 'error'][level] || 'log';
    console.log(`[Renderer:${tag}] ${message}`);
  });

  // Log unhandled renderer errors
  win.webContents.on('render-process-gone', (_event, details) => {
    console.error(`[Renderer] Process gone: ${details.reason}`);
  });
  win.webContents.on('unresponsive', () => {
    console.warn('[Renderer] Unresponsive');
  });

  // Open DevTools in development
  if (process.env.DEBUG) {
    win.webContents.openDevTools();
  }

  return win;
}

// ── App Lifecycle ────────────────────────────────────────────────
let phpProcess = null;

app.whenReady().then(async () => {
  ensureEnvFile();

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
