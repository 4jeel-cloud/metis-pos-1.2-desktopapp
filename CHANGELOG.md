# Changelog

All notable changes to MetisPOS are documented here.

MetisPOS is a fork of [NexoPOS](https://github.com/Blair2004/NexoPOS) by Blair2004, licensed under GPL-3.0. This changelog tracks all modifications made to the original codebase.

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
