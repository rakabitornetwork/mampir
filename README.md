# Mampir

Panel admin untuk mengelola tunnel **L2TP** dan **port forward** di MikroTik CHR (branded Teslatech · Perwiracloud).

Aplikasi menarik data pelanggan dari CHR (PPP secret / active + NAT), mengelola masa aktif langganan, menghasilkan script RouterOS untuk CPE, serta menyediakan halaman **Update** untuk pull kode terbaru dari GitHub.

## Fitur

- **Dashboard** — ringkasan pelanggan, tunnel online, port forward, masa aktif segera habis
- **Pelanggan** — CRUD, perpanjang langganan, push ke CHR
- **Script Generator** — unduh script RouterOS (setup tunnel / layanan)
- **Sinkron CHR** — pull manual dari MikroTik + proses expiry
- **Update** — cek & pull update dari GitHub (`git pull --ff-only`), lalu composer / migrate / optimize clear
- **Pengaturan** — paket langganan + ringkasan konfigurasi CHR

Scheduler otomatis (setiap 5 menit): `chr:sync`, `chr:expire`. Cleanup pelanggan expired: harian.

## Stack

| Layer | Teknologi |
|--------|-----------|
| Backend | Laravel 13, PHP 8.3+, session auth |
| Frontend | Inertia.js + React 19, Vite 8, Tailwind CSS 4 |
| CHR | SSH via phpseclib |
| Database default | SQLite (bisa diganti MySQL/MariaDB/PostgreSQL) |

## Persyaratan

- PHP **8.3+** dengan ekstensi: `mbstring`, `openssl`, `pdo`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`, `fileinfo`, `sqlite3` (atau driver DB yang dipakai)
- Composer 2
- Node.js **20+** dan npm (hanya untuk build frontend)
- Git
- Akses SSH ke MikroTik CHR
- Web server: Nginx atau Apache
- (Opsional) MySQL/MariaDB jika tidak memakai SQLite

---

## Install di VPS dari GitHub

Contoh di bawah memakai Ubuntu 22.04/24.04, Nginx, PHP-FPM 8.3, dan SQLite. Sesuaikan domain dan path.

### 1. Siapkan server

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git unzip curl

# PHP 8.3 (Ubuntu 24.04 biasanya sudah tersedia; di 22.04 tambahkan PPA ondrej/php jika perlu)
sudo apt install -y php8.3-fpm php8.3-cli php8.3-mbstring php8.3-xml php8.3-curl \
  php8.3-zip php8.3-bcmath php8.3-sqlite3 php8.3-mysql

# Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Node.js 20 (untuk npm run build)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Clone repository

```bash
sudo mkdir -p /var/www
sudo git clone https://github.com/rakabitornetwork/mampir.git /var/www/mampir
sudo chown -R $USER:www-data /var/www/mampir
cd /var/www/mampir
```

Jika repo **private**, gunakan SSH:

```bash
git clone git@github.com:rakabitornetwork/mampir.git /var/www/mampir
```

atau Personal Access Token pada URL HTTPS.

### 3. Install dependency & environment

```bash
cd /var/www/mampir

cp .env.example .env
php artisan key:generate

# Buat file SQLite (jika memakai SQLite)
touch database/database.sqlite

composer install --no-dev --optimize-autoloader
npm ci
npm run build
```

### 4. Konfigurasi `.env`

Edit `/var/www/mampir/.env`:

```env
APP_NAME=Mampir
APP_ENV=production
APP_DEBUG=false
APP_URL=https://mampir.contoh.com

DB_CONNECTION=sqlite
# Atau MySQL:
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=mampir
# DB_USERNAME=mampir
# DB_PASSWORD=rahasia

# CHR dikonfigurasi dari panel Pengaturan (disimpan di database).
# Env di bawah opsional — hanya seed awal jika belum ada data di DB.
# CHR_HOST=
# CHR_PORT=22
# CHR_USERNAME=
# CHR_PASSWORD=
# CHR_PUBLIC_IP=

UPDATE_GIT_REMOTE=origin
UPDATE_GIT_BRANCH=main
UPDATE_RUN_COMPOSER=true
UPDATE_RUN_MIGRATE=true
UPDATE_RUN_OPTIMIZE_CLEAR=true
```

Setelah login, buka **Pengaturan** dan isi Host/Username/Password/Public IP CHR, lalu simpan.
### 5. Migrasi & admin user

```bash
php artisan migrate --force
php artisan db:seed --force
```

Seeder membuat admin default:

| Field | Nilai |
|--------|--------|
| Email | `amon@teslatech.my.id` |
| Password | `gantengmax` |

**Ganti password segera** setelah login pertama, atau buat user baru lewat tinker:

```bash
php artisan tinker
```

```php
\App\Models\User::query()->updateOrCreate(
    ['email' => 'admin@domain.com'],
    ['name' => 'Admin', 'password' => bcrypt('password-aman'), 'email_verified_at' => now()]
);
```

### 6. Permission

```bash
sudo chown -R www-data:www-data /var/www/mampir/storage /var/www/mampir/bootstrap/cache
sudo chmod -R ug+rwx /var/www/mampir/storage /var/www/mampir/bootstrap/cache

# Agar halaman Update bisa menjalankan git pull sebagai www-data:
sudo chown -R www-data:www-data /var/www/mampir
# atau berikan group write ke .git dan file aplikasi sesuai kebijakan server Anda
```

Agar `git` mengenali ownership (hindari error *dubious ownership*):

```bash
sudo -u www-data git config --global --add safe.directory /var/www/mampir
```

### 7. Nginx

Contoh virtual host `/etc/nginx/sites-available/mampir`:

```nginx
server {
    listen 80;
    server_name mampir.contoh.com;
    root /var/www/mampir/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;
    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

Aktifkan & reload:

```bash
sudo ln -s /etc/nginx/sites-available/mampir /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

HTTPS (disarankan):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d mampir.contoh.com
```

### 8. Scheduler Laravel

Tambahkan cron untuk user `www-data`:

```bash
sudo crontab -u www-data -e
```

Isi:

```cron
* * * * * cd /var/www/mampir && php artisan schedule:run >> /dev/null 2>&1
```

Ini menjalankan sync CHR, expiry, dan cleanup sesuai `routes/console.php`.

### 9. Optimasi production

```bash
cd /var/www/mampir
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Buka `https://mampir.contoh.com/login` dan masuk dengan akun admin.

---

## Update di VPS

### Lewat panel (disarankan)

1. Push perubahan ke branch `main` di GitHub
2. Login admin → menu **Update**
3. Klik **Cek update**, lalu **Pull dari GitHub**

Pull memakai fast-forward only. Working tree harus bersih. Setelah pull berhasil, aplikasi menjalankan composer install, migrate, dan optimize clear (bisa dimatikan lewat `.env`).

Jika aset frontend berubah, build ulang di server:

```bash
cd /var/www/mampir
npm ci
npm run build
```

### Manual via SSH

```bash
cd /var/www/mampir
sudo -u www-data git fetch origin
sudo -u www-data git pull --ff-only origin main
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan optimize:clear
npm ci && npm run build
php artisan config:cache
php artisan route:cache
```

---

## Install lokal (Laragon / development)

```bash
git clone https://github.com/rakabitornetwork/mampir.git
cd mampir
composer setup
# atau langkah manual:
# composer install
# copy .env.example → .env, isi CHR_*, php artisan key:generate
# touch database/database.sqlite
# php artisan migrate --seed
# npm install && npm run build
```

Jalankan development:

```bash
composer dev
```

Atau cukup virtual host Laragon + `npm run dev` bila PHP-FPM/Apache sudah melayani proyek.

---

## Perintah Artisan terkait CHR

| Perintah | Keterangan |
|----------|------------|
| `php artisan chr:sync` | Pull pelanggan / tunnel / NAT dari CHR |
| `php artisan chr:expire` | Proses langganan kadaluarsa + disable di CHR |
| `php artisan chr:cleanup-expired --days=30` | Bersihkan data expired lama |

---

## Struktur menu admin

| Menu | Path | Fungsi |
|------|------|--------|
| Dashboard | `/` | Ringkasan |
| Pelanggan | `/customers` | Manajemen pelanggan & tunnel |
| Script Generator | `/scripts` | Unduh script RouterOS |
| Sinkron CHR | `/sync` | Pull manual dari CHR |
| Update | `/update` | Pull kode dari GitHub |
| Pengaturan | `/settings` | Paket & info endpoint CHR |

---

## Keamanan

- Jangan commit file `.env`
- Set `APP_DEBUG=false` di production
- Ganti password admin default setelah install
- Batasi akses SSH CHR ke IP VPS saja bila memungkinkan
- Pastikan `storage/` dan `bootstrap/cache/` writable oleh PHP-FPM, tetapi source code tidak world-writable tanpa alasan

---

## Lisensi

Proyek berbasis Laravel (MIT). Kode aplikasi Mampir mengikuti kebijakan pemilik repositori.
