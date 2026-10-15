# Deploy — minder.ge (Ubuntu 26.04, PHP 8.5, PostgreSQL 18, Node 22)

Server layout: `/var/www/minder` (this repo). Other projects live beside it
(`/var/www/pillars`, …) with their own Nginx server block, DB role and FPM pool / PM2 process.

## First deploy

```bash
# code
sudo mkdir -p /var/www/minder && sudo chown deploy:deploy /var/www/minder
git clone <repo> /var/www/minder        # or rsync from your machine (see below)
cd /var/www/minder

# php-fpm pool + opcache
sudo mv /etc/php/8.5/fpm/pool.d/www.conf /etc/php/8.5/fpm/pool.d/www.conf.disabled
sudo cp deploy/php-fpm/minder.conf /etc/php/8.5/fpm/pool.d/
sudo cp deploy/php-fpm/10-opcache.ini /etc/php/8.5/fpm/conf.d/
sudo systemctl restart php8.5-fpm && ls -la /run/php/minder.sock

# backend
cd backend
cp ../deploy/env.production.example .env && nano .env     # DB_PASSWORD, MAIL_*, OAuth keys
composer install --no-dev --optimize-autoloader --no-interaction
php artisan key:generate --force
php artisan migrate --force
php artisan config:cache && php artisan route:cache && php artisan view:cache
sudo chown -R deploy:www-data storage bootstrap/cache
sudo chmod -R ug+rwx storage bootstrap/cache

# frontend
cd ../frontend
echo 'VITE_API_URL=https://minder.ge' > .env.production
npm ci && npm run build

# nginx + tls
sudo cp ../deploy/nginx/minder.ge.conf /etc/nginx/sites-available/minder.ge
sudo ln -s /etc/nginx/sites-available/minder.ge /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d minder.ge -d www.minder.ge

# cron (crontab -e as deploy)
# * * * * * cd /var/www/minder/backend && php artisan schedule:run >> /dev/null 2>&1
# 0 3 * * * /var/www/minder/deploy/backup.sh >> /var/log/db-backup.log 2>&1

# passwordless php-fpm reload for deploy.sh (sudo visudo)
# deploy ALL=NOPASSWD: /usr/bin/systemctl reload php8.5-fpm
chmod +x deploy/*.sh
```

## rsync instead of git

```bash
rsync -az --delete \
  --exclude backend/vendor --exclude backend/.env --exclude backend/storage \
  --exclude frontend/node_modules --exclude frontend/dist --exclude frontend/.env.production \
  ./ deploy@SERVER_IP:/var/www/minder/
```

## Updates

```bash
/var/www/minder/deploy/deploy.sh
```

## Smoke test

```bash
curl -I https://minder.ge/up                    # 200
curl -I https://minder.ge/sanctum/csrf-cookie   # 204 + Set-Cookie
curl -I https://minder.ge/auth/google/redirect  # 302 → accounts.google.com
curl -I https://minder.ge/invite/abc            # 200 (index.html)
curl -I http://www.minder.ge/                   # 301 → https://minder.ge/
```

## Outbound email (shares, reminders, Pro)

Production `.env` ships with empty SMTP, so გაზიარება used to 500.
Use [Resend](https://resend.com) (free tier is enough):

1. Create an API key (`re_…`).
2. Domains → add `minder.ge`. Copy SPF, DKIM (and DMARC if offered) into Cloudflare DNS.
3. Wait until the domain is **Verified**.
4. On the server:

```bash
cd /var/www/minder/backend
# edit .env:
#   MAIL_MAILER=smtp
#   MAIL_HOST=smtp.resend.com
#   MAIL_PORT=587
#   MAIL_USERNAME=resend
#   MAIL_PASSWORD=re_…
#   MAIL_SCHEME=smtp
#   MAIL_FROM_ADDRESS=no-reply@minder.ge
php artisan config:cache
sudo systemctl reload php8.5-fpm
php artisan tinker --execute="Mail::raw('minder.ge test', fn (\$m) => \$m->to('YOU@example.com')->subject('Minder mail'));"
```

Until DNS is verified, invites still work: copy the pending invite link from the share dialog.

## Common failures

| Symptom | Cause |
| --- | --- |
| 419 CSRF mismatch | `SESSION_DOMAIN` / `SANCTUM_STATEFUL_DOMAINS` wrong, or `.env` changed without `config:cache` |
| `redirect_uri_mismatch` | `APP_URL` not `https://minder.ge`, or URI differs in Google/Meta console |
| `?auth_error=state` | session cookie dropped (HTTP instead of HTTPS, or Cloudflare stripping cookies) |
| 502 from Nginx | pool not running / socket path differs — `ls /run/php/`, `systemctl status php8.5-fpm` |
| 500, empty logs | `storage/` not writable by `deploy:www-data` |
| Old UI after deploy | PWA service worker — one hard reload; `sw.js` is served `no-cache` |
| Share 500 / „სერვერის შეცდომა“ | `MAIL_*` empty — set Resend SMTP above, then `config:cache` + php-fpm reload |
