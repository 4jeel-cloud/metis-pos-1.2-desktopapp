# MetisPOS

> **Forked from [NexoPOS](https://github.com/Blair2004/NexoPOS)** — the original POS system by Blair2004, licensed under GPL-3.0.

MetisPOS is a web-based Point of Sale system built with **Laravel**, **TailwindCSS**, and **Vue.js**. It includes inventory management, customer management, orders, payments, reporting, and more.

## Requirements

- PHP 8.2+
- Composer
- Node.js 22.x+
- MySQL or SQLite

## Installation

```bash
cp .env.example .env
# Set your database credentials in .env
composer install
npm install
php artisan key:generate
npm run build
php artisan migrate
php artisan ns:setup
```

## Development

```bash
npx vite
php artisan serve
```

## License

GNU General Public License v3.0. See [LICENSE](LICENSE).

Original work copyright (c) Blair2004. Modified work copyright (c) 4jeel-cloud.
