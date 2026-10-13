#!/usr/bin/env node

import { createWriteStream, existsSync, mkdirSync, chmodSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { get } from 'https';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { tmpdir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_DIR = join(__dirname, '..');
const PHP_DIR = join(APP_DIR, 'php-binary');

const platform = (process.argv[2] || process.platform).toLowerCase();
const PHP_VERSION = '8.5.7';

async function downloadFile(url, dest) {
  const dir = dirname(dest);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  try { execSync(`curl -fL# -o "${dest}" "${url}"`, { stdio: 'inherit' }); return; } catch {}
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    const doGet = (u) => {
      get(u, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          doGet(response.headers.location); return;
        }
        const total = parseInt(response.headers['content-length'], 10);
        let downloaded = 0, lastLog = 0;
        response.on('data', (chunk) => {
          downloaded += chunk.length; file.write(chunk);
          if (!total) return;
          const pct = ((downloaded / total) * 100).toFixed(1);
          if (pct - lastLog >= 10 || pct === '100.0') { lastLog = pct; console.log(`  ${pct}% (${(downloaded / 1024 / 1024).toFixed(1)}MB)`); }
        });
        response.on('end', () => { file.end(); resolve(); });
        response.on('error', reject);
      }).on('error', reject);
    };
    doGet(url);
  });
}

const STATIC_BASE = 'https://dl.static-php.dev/static-php-cli/bulk';

async function downloadUnix(type) {
  const arch = type === 'mac' ? 'macos' : 'linux';
  const destDir = join(PHP_DIR, type === 'mac' ? 'mac' : 'linux');
  const destPath = join(destDir, 'php');
  if (existsSync(destPath)) { console.log('  php already exists, skipping'); return; }

  const ext = process.argv[3] || 'x86_64';
  const url = `${STATIC_BASE}/php-${PHP_VERSION}-cli-${arch}-${ext}.tar.gz`;
  const tmp = join(destDir, `php-${PHP_VERSION}-cli-${arch}-${ext}.tar.gz`);

  console.log(`  Downloading PHP ${PHP_VERSION} for ${type}...`);
  await downloadFile(url, tmp);

  console.log('  Extracting...');
  execSync(`tar xzf "${tmp}" -C "${destDir}"`, { stdio: 'pipe' });
  try { execSync(`rm "${tmp}"`, { stdio: 'pipe' }); } catch {}

  const extracted = join(destDir, 'php-cli');
  if (existsSync(extracted)) execSync(`mv "${extracted}" "${destPath}"`, { stdio: 'pipe' });
  chmodSync(destPath, 0o755);
  console.log(`  Extracted to ${destPath}`);
}

async function downloadWin() {
  const destDir = join(PHP_DIR, 'win');
  if (existsSync(join(destDir, 'php.exe'))) { console.log('  php.exe already exists, skipping'); return; }

  // Find latest PHP version from Windows directory listing
  const html = execSync('curl -sL https://windows.php.net/downloads/releases/', { encoding: 'utf-8' });
  const matches = html.match(/php-8\.\d+\.\d+-nts-Win32-vs17-x64\.zip/g);
  if (!matches || matches.length === 0) throw new Error('Could not find Windows PHP download URL');
  const latest = matches.sort().pop();
  const version = latest.replace('php-', '').replace('-nts-Win32-vs17-x64.zip', '');
  const zipUrl = `https://windows.php.net/downloads/releases/${latest}`;
  const tmpZip = join(destDir, latest);

  console.log(`  Downloading PHP ${version} for Windows...`);
  await downloadFile(zipUrl, tmpZip);

  console.log('  Extracting php.exe, DLLs, and SQLite extensions...');
  const extDir = join(destDir, 'ext');
  if (!existsSync(extDir)) mkdirSync(extDir, { recursive: true });

  // Write extraction script to temp file to avoid shell escaping issues
  const tmpDir = mkdtempSync(join(tmpdir(), 'php-extract-'));
  const scriptPath = join(tmpDir, 'extract.py');
  writeFileSync(scriptPath, `import zipfile, os, sys

zip_path = r'${tmpZip}'
dest_dir = r'${destDir}'
ext_dir = r'${extDir}'

z = zipfile.ZipFile(zip_path)
for entry in z.namelist():
    name = os.path.basename(entry)
    if not name:
        continue
    # Root-level .exe and .dll files
    if '/' not in entry and not entry.startswith('_'):
        if name.endswith('.exe') or name.endswith('.dll'):
            z.extract(entry, dest_dir)
    # Extension DLLs from ext/ subdirectory
    elif entry.startswith('ext/') and name.endswith('.dll'):
        out = os.path.join(ext_dir, name)
        with open(out, 'wb') as f:
            f.write(z.read(entry))
`);
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  execSync(`"${pythonCmd}" "${scriptPath}"`, { stdio: 'pipe' });

  // Clean up temp dir and zip
  try {
    execSync(`rm -rf "${tmpDir}" "${tmpZip}"`, { stdio: 'pipe' });
  } catch {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    try { rmSync(tmpZip, { force: true }); } catch {}
  }

  // Generate php.ini enabling SQLite
  const iniPath = join(destDir, 'php.ini');
  if (!existsSync(iniPath)) {
    writeFileSync(iniPath, [
      '[PHP]',
      'extension_dir = "ext"',
      'extension=php_bz2.dll',
      'extension=php_curl.dll',
      'extension=php_fileinfo.dll',
      'extension=php_gd.dll',
      'extension=php_gettext.dll',
      'extension=php_intl.dll',
      'extension=php_mbstring.dll',
      'extension=php_openssl.dll',
      'extension=php_pdo_sqlite.dll',
      'extension=php_sockets.dll',
      'extension=php_sodium.dll',
      'extension=php_sqlite3.dll',
      'extension=php_xsl.dll',
      'extension=php_zip.dll',
      'max_execution_time = 0',
      'max_input_time = 600',
      'default_socket_timeout = 300',
      'memory_limit = 512M',
      'display_errors = Off',
      'log_errors = On',
      'error_log = php_errors.log',
    ].join('\n'));
  }

  console.log('  Extracted php.exe + SQLite extensions to php-binary/win/');
}

async function main() {
  const map = { linux: 'linux', darwin: 'mac', mac: 'mac', win32: 'win', win: 'win' };
  const target = map[platform];
  if (!target) { console.error(`Unknown: ${platform}`); process.exit(1); }

  console.log(`Downloading PHP for ${platform}...`);
  if (target === 'linux') await downloadUnix('linux');
  else if (target === 'mac') await downloadUnix('mac');
  else if (target === 'win') await downloadWin();
  console.log('Done!');
  console.log(''); console.log('To build the installer:'); console.log(`  npm run dist:${target}`);
}

main().catch((err) => { console.error('Download failed:', err.message); process.exit(1); });
