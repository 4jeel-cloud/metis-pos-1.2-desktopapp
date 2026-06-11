#!/bin/bash
php -d "extension=/tmp/opencode/php-ext/sqlite3.so" -d "extension=/tmp/opencode/php-ext/pdo_sqlite.so" "$(dirname "$0")/artisan" "$@"
