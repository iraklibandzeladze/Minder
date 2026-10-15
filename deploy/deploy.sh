#!/usr/bin/env bash
# Ledger deploy — run on the server as `deploy`:
#   /var/www/ledger/deploy/deploy.sh
# Requires passwordless sudo for php-fpm reload (see deploy/README.md).
set -euo pipefail

APP_DIR=/var/www/ledger
PHP_FPM_SERVICE=php8.5-fpm

cd "$APP_DIR"

if [ -d .git ]; then
  git pull --ff-only
fi

echo "▸ backend"
cd "$APP_DIR/backend"
composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist
php artisan down --retry=10 || true
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
php artisan up

echo "▸ frontend"
cd "$APP_DIR/frontend"
npm ci --no-audit --no-fund
npm run build

echo "▸ reload php-fpm (opcache.validate_timestamps=0)"
sudo systemctl reload "$PHP_FPM_SERVICE"

echo "✓ deployed $(date -Is)"
