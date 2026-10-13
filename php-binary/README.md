# PHP Binaries for MetisPOS Desktop

For development, the app uses the system-installed PHP.

For distribution builds, place the appropriate PHP binary in each platform folder:

- `linux/php` — PHP CLI binary for Linux (e.g., from a static PHP build)
- `win/php.exe` — PHP CLI binary for Windows
- `mac/php` — PHP CLI binary for macOS

Requirements:
- PHP 8.3+
- Extensions: pdo_sqlite, sqlite3, mbstring, xml, curl, gd, intl
- On Linux/macOS: place `.so` extension files alongside or use compiled-in extensions
- On Windows: ensure `php_pdo_sqlite.dll` and `php_sqlite3.dll` are available

Recommended: use static PHP builds from https://github.com/nickg/static-php-cli
