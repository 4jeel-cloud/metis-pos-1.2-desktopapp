<p align="center">
  <img src="main logo.png" alt="MetisPOS Logo" width="180"/>
</p>

<h1 align="center">MetisPOS</h1>

<p align="center">
  A desktop Point of Sale system — runs entirely offline, no server required.
</p>

<p align="center">
  <a href="https://github.com/4jeel-cloud/metis-pos-1.2-desktopapp/releases/tag/v1.0.0">
    <img src="https://img.shields.io/badge/version-v1.0.0-blue?style=flat-square" alt="Version"/>
  </a>
  <a href="https://github.com/4jeel-cloud/metis-pos-1.2-desktopapp/releases/tag/v1.0.0">
    <img src="https://img.shields.io/badge/platform-Windows%20x64-brightgreen?style=flat-square&logo=windows" alt="Windows"/>
  </a>
  <a href="https://github.com/4jeel-cloud/metis-pos-1.2-desktopapp/blob/master/LICENSE">
    <img src="https://img.shields.io/badge/license-GPL--3.0-orange?style=flat-square" alt="License"/>
  </a>
</p>

---

## Download

| Platform | Type | Link |
|----------|------|------|
| Windows x64 | Installer (recommended) | [metis-pos-1.0.0-x64.exe](https://github.com/4jeel-cloud/metis-pos-1.2-desktopapp/releases/download/v1.0.0/metis-pos-1.0.0-x64.exe) |
| Windows x64 | Portable (no install needed) | [metis-pos-1.0.0-x64-portable.exe](https://github.com/4jeel-cloud/metis-pos-1.2-desktopapp/releases/download/v1.0.0/metis-pos-1.0.0-x64-portable.exe) |

> All releases: [github.com/4jeel-cloud/metis-pos-1.2-desktopapp/releases](https://github.com/4jeel-cloud/metis-pos-1.2-desktopapp/releases)

**First launch credentials:** username `admin` / password `metisadmin`

---

## What's Fixed in v1.0.0

- **No JavaScript errors on launch** — removed MySQL/Telescope dependency that caused startup crashes
- **White logo in sidebar** — sidebar always uses the white logo (sidebar background is always dark)
- **Persistent login sessions** — app now uses a fixed port (8686) so session cookies stay valid across restarts; no more "sign in / sign up" screen on every relaunch
- **30-day session lifetime** — you stay logged in for 30 days without re-entering credentials
- **SQLite bundled** — fully offline, no external database required

---

> **Forked from [NexoPOS](https://github.com/Blair2004/NexoPOS)** — the original POS system by Blair2004, licensed under GPL-3.0.

MetisPOS is a **desktop Point of Sale system** built with **Laravel 12**, **TailwindCSS 4**, **Vue.js 3**, and **Electron**. It includes inventory management, customer management, orders, payments, reporting, and more — all running locally with a bundled PHP server and SQLite database.

---

## Quick Start (Desktop App)

### Prerequisites

- **Node.js** 22.x+ ([nvm](https://github.com/nvm-sh/nvm) recommended)
- **Composer** 2.x
- **PHP** 8.2+ with SQLite and PDO support (or use the bundled static PHP)

### Setup

```bash
# 1. Install JS dependencies
npm install

# 2. Install PHP dependencies
composer install --no-scripts
composer install

# 3. Build frontend assets
npm run build

# 4. Download bundled PHP for your platform
node scripts/download-php.mjs

# 5. Run the desktop app
npm start
```

On first launch, MetisPOS will:
- Create a SQLite database in the user data directory
- Run database migrations
- Set up the admin account (username: `admin`, password: `metisadmin`)
- Start the PHP development server on a random port
- Open the Electron window

---

## Building Installers

Build distributable installers for your platform:

```bash
# Linux (AppImage + .deb)
npm run dist:linux

# Windows (.exe installer + portable)
npm run dist:win

# macOS (.dmg)
npm run dist:mac

# All platforms
npm run dist:all
```

Installers are output to `dist-electron/`.

---

## Development (Web Mode)

For frontend-only development with hot-reload:

```bash
# Terminal 1: Start Vite dev server
npm run dev

# Terminal 2: Start Laravel dev server
php artisan serve --port=8000
```

Visit `http://127.0.0.1:8000` in your browser.

---

## Project Structure

```
metis-pos-app/
├── main.cjs              # Electron main process (window, PHP server, first-run setup)
├── preload.cjs            # Electron preload script (context bridge)
├── vite.config.js         # Vite build configuration
├── scripts/
│   └── download-php.mjs   # Downloads bundled PHP binary for distribution
├── php-binary/            # Bundled PHP binaries (gitignored, populated by download-php.mjs)
├── dist-electron/         # Built installers (gitignored)
├── app/                   # Laravel application code
├── resources/             # Vue.js components, TypeScript, CSS
├── public/                # Web root (build output in public/build/)
├── database/              # Migrations, seeders, factories
├── config/                # Laravel configuration
├── routes/                # Laravel routes
├── modules/               # Modular extensions
├── tests/                 # PHPUnit + Playwright tests
└── playwright/            # E2E test configuration
```

---

## CI / CD

Three GitHub Actions workflows:

| Workflow | Trigger | Description |
|---|---|---|
| `build.yml` | Push/PR to `master` | Builds frontend assets |
| `laravel.yml` | Push/PR to `master` | Runs PHPUnit tests |
| `build-installer.yml` | Tag push (`v*`) | Builds platform installers and uploads to GitHub Release |

To trigger a release build:

```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## Testing

```bash
# PHPUnit tests
php artisan test

# E2E tests (Playwright)
npm run test:e2e

# E2E with UI
npm run test:e2e:ui
```

---

## License

GNU General Public License v3.0. See [LICENSE](LICENSE).

Original work copyright (c) Blair2004. Modified work copyright (c) 4jeel-cloud.
