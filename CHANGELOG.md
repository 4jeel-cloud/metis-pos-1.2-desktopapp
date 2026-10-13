# Changelog

All notable changes to MetisPOS are documented here.

MetisPOS is a fork of [NexoPOS](https://github.com/Blair2004/NexoPOS) by Blair2004, licensed under GPL-3.0. This changelog tracks all modifications made to the original codebase.

---

## [1.0.1] — 2026-10-13

Security and installer hardening release. First-run setup now succeeds on read-only installs and no shared default credentials exist.

### Security
- **Resolved all 29 composer security advisories** across 6 packages: `dompdf` 3.1.5 → 3.1.6, `guzzlehttp/guzzle` 7.12.3 → 7.15.5, `laravel/framework` 12.62.0 → 12.69.3, `league/commonmark` 2.8.2 → 2.10.3, `league/flysystem` 3.35.1 → 3.36.0, `phpoffice/phpspreadsheet` 5.8.0 → 5.10.0. `composer audit --locked` reports **0 advisories**.
- **Removed the shared default admin password** (`metisadmin`). Each install now generates a unique 16-character admin password (crypto-random), shows it once in a dialog after setup, and prompts the user to change it after first login.
- Confirmed server hardening: PHP binds to `127.0.0.1` only, `APP_DEBUG=false`, `TELESCOPE_ENABLED=false`, and `APP_KEY` is unique per install (crypto-random, generated on first run).

### Fixed
- **First-run on read-only installs** (e.g. `/opt/MetisPOS` under a `.deb`): removed `realpath()` from `config/view.php` compiled-view path so Blade cache resolution works before `storage/framework/views` exists.
- **SQLite bootstrap guard**: `app/Providers/AppServiceProvider.php` only auto-creates `database/database.sqlite` when the unresolved DB path points to the bundled tree — no more `Permission denied` on read-only bundles.
- **Setup skips bundle writes**: `app/Services/SetupService.php::runMigration` no longer runs `vendor:publish` / `ns:translate --symlink` in desktop mode (both wrote into the read-only bundle). Sanctum's table ships with the core migrations.
- **DB-wipe paths hardened**: `SetupService` and `ResetService` use the resolved SQLite config path instead of always the bundled `database/database.sqlite`.
- **Visible setup errors**: the install failure dialog now surfaces the process `stderr` under a "Details" section so first-run errors are diagnosable.
- `main.cjs` pulled the missing `crypto` import for key/password generation.

### Changed
- **Linux installers build from a clean tree**: icons are regenerated (`gen:icon.mjs`) before packing so `build/icon.png` always exists; installers no longer embed machine-specific `public/storage` symlinks. Verified clean `npm run dist:linux` → 170 MB `.deb` + 212 MB AppImage.

### Verification
- Full first-run (migrations + `ns:setup`) validated end-to-end on a read-only bundle snapshot with a fresh user data directory; seeds: 1 admin (bcrypt), 5 roles, 134 permissions, store `MetisPOS`.
- PHPUnit suite: **129 passed** on the upgraded dependency tree.

---

## [1.0.0] — 2026-06-13

### Added
- Electron desktop wrapper — runs entirely offline with no external server required
- Bundled PHP 8.3 binary for Windows (no system PHP needed)
- SQLite database stored in `%APPDATA%\MetisPOS\` — persists across reinstalls
- Auto-migration and first-run setup on initial launch (creates DB, runs migrations, seeds admin account)
- Fixed port `8686` for the PHP dev server so session cookies stay valid across restarts
- 30-day session lifetime so users stay logged in between app launches
- White logo in sidebar (sidebar background is always dark regardless of theme)
- `CHANGELOG.md` for GPL-3.0 attribution compliance

### Changed (from NexoPOS original)

#### Frontend / UI
- **Font**: Sidebar navigation now uses **Nunito Sans** (Google Fonts). Rest of app keeps Jost.
- **Profile widget**: Replaced DiceBear cartoon avatar with a clean initials circle using brand colors.
- **Income widget** (`ns-sale-card-widget.vue`): Color changed from hardcoded blue gradient to theme `success-secondary → success-tertiary` (green) — adapts to light/dark theme.
- **Expenses widget** (`ns-transaction-card-widget.vue`): Color changed from hardcoded indigo to theme `warning-secondary → warning-tertiary` (amber) — adapts to light/dark theme.
- **Incomplete Orders widget** (`ns-incomplete-sale-card-widget.vue`): Color changed from hardcoded green to theme `error-secondary → error-tertiary` (orange-red) — adapts to light/dark theme.
- **POS hold button**: Hover now stays `info-tertiary` (blue) in both themes — was incorrectly jumping to red (`secondary`) in light theme.
- **POS payment type button**: Now uses `info-tertiary` (blue) in both light and dark themes for consistency.

#### Infrastructure / Electron
- `main.cjs`: Added `PREFERRED_PORT = 8686`, extended `SESSION_LIFETIME`, fixed `APP_URL` to include port, added `TELESCOPE_ENABLED=false` to prevent MySQL errors.
- `main.cjs`: Added `storage/framework/cache/data` directory creation to prevent Blade cache errors.
- `main.cjs`: Fixed bracket typo (`]` → `)`) in `execFileSync` call for `ns:setup`.
- `config/telescope.php`: Default storage driver changed from `database` to `false` to prevent startup crash when MySQL is unavailable.
- `app/Providers/TelescopeServiceProvider.php`: Added early-exit guard when `TELESCOPE_ENABLED` is false.
- `resources/views/layout/dashboard.blade.php`: Sidebar always loads `metis-pos-logo-white.png` (sidebar is always dark-themed).

### Fixed
- JavaScript `SyntaxError: Unexpected token` on first launch after installation.
- White screen on app startup caused by Telescope trying to connect to MySQL.
- Session expiry on every relaunch due to random port assignment.
- Missing `storage/framework/cache/data` directory causing Blade compilation failure.

### Removed
- Laravel Telescope auto-registration in desktop builds (requires MySQL, not bundled).

---

## Attribution

Original work: **NexoPOS** — Copyright (c) Blair2004  
Source: https://github.com/Blair2004/NexoPOS  
License: GNU General Public License v3.0

Modified work: **MetisPOS** — Copyright (c) 2026 4jeel-cloud  
Source: https://github.com/4jeel-cloud/metis-pos-1.2-desktopapp  
License: GNU General Public License v3.0 (same license, as required)

This software is distributed under the terms of the GPL-3.0 license. You are free to use, modify, and redistribute it under the same license. See [LICENSE](LICENSE) for full terms.
