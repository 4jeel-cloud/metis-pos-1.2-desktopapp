# MetisPOS

> **Forked from [NexoPOS](https://github.com/Blair2004/NexoPOS)** — the original POS system by Blair2004, licensed under GPL-3.0.

MetisPOS is a **desktop Point of Sale system** built with **Laravel 12**, **TailwindCSS 4**, **Vue.js 3**, and **Electron**. It includes inventory management, customer management, orders, payments, reporting, and more — all running locally with a bundled PHP server.

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

## Default Credentials

- **Username:** `admin`
- **Password:** `metisadmin`

Change these after first login.

---

## License

GNU General Public License v3.0. See [LICENSE](LICENSE).

Original work copyright (c) Blair2004. Modified work copyright (c) 4jeel-cloud.
