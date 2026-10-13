#!/bin/bash
# Use bundled PHP if available (has SQLite built-in), otherwise fall back to system PHP
if [ -f "$(dirname "$0")/php-binary/linux/php" ]; then
  "$(dirname "$0")/php-binary/linux/php" "$(dirname "$0")/artisan" "$@"
else
  php "$(dirname "$0")/artisan" "$@"
fi
