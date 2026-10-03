<div align="center">

<img src="public/icons/icon-512.png" width="96" height="96" alt="Veil">

# Veil

**Приватная карта мира.** Без аккаунтов, cookies, аналитики и слежки.

[![CI](https://github.com/realfamousbae/Veil/actions/workflows/ci.yml/badge.svg)](https://github.com/realfamousbae/Veil/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Demo](https://img.shields.io/badge/demo-veil--239.pages.dev-0b5fcc.svg)](https://veil-239.pages.dev)

[**Открыть карту**](https://veil-239.pages.dev) · [English](README.en.md) · [Приватность](PRIVACY.md)

</div>

<p align="center">
  <img src="docs/screenshots/phone-light.jpg" width="24%" alt="Карточка места, светлая тема">
  <img src="docs/screenshots/phone-search.jpg" width="24%" alt="Поиск">
  <img src="docs/screenshots/phone-dark-settings.jpg" width="24%" alt="Настройки, тёмная тема">
  <img src="docs/screenshots/phone-paper.jpg" width="24%" alt="Бумажная тема">
</p>

## Возможности

- **Карта всего мира** на данных [OpenStreetMap](https://www.openstreetmap.org/) — векторная, быстрая, с подписями на русском и английском.
- **Поиск мест и адресов** и «Что здесь?» — долгим нажатием или правым кликом по карте.
- **«Где я»** — только по нажатию кнопки; местоположение не покидает устройство.
- **Сохранённые места** хранятся на устройстве; резервная копия — экспорт и импорт в GeoJSON вместо аккаунта.
- **Офлайн-карты** — скачайте регион и пользуйтесь картой в авиарежиме.
- **Как приложение** — ставится на экран «Домой» на Android и iOS, работает без сети.
- **Темы** — светлая, тёмная и бумажная, интерфейс в стиле Liquid Glass.
- **Открытый код** и возможность развернуть всё на своём сервере.

## Приватность

Veil — статический сайт без собственного бэкенда и без учётных записей. Правила записаны в
[PRIVACY.md](PRIVACY.md) как контракт, а их соблюдение проверяется автоматическим тестом в CI
при каждом изменении:

- при загрузке нет ни одного запроса к сторонним сервисам — шрифты, иконки и тайлы карты идут с адреса самого сайта;
- нет cookies, `localStorage` и аналитики; данные хранятся только на устройстве (IndexedDB, OPFS);
- геопозиция запрашивается только по кнопке и никуда не отправляется — ни в поиск, ни в адрес страницы;
- поиск уходит после 3 символов и паузы (или только по Enter), а «область карты» округляется примерно до 10 км и отключается;
- строгая политика безопасности (CSP) разрешает соединения только с сайтом и сервисом поиска.

**Честно о пределах.** Полной анонимности в интернете не бывает:

| Кто                                                        | Что видит                                  | Как избежать                                                |
| ---------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------- |
| Сервер сайта и карт                                        | IP-адрес и какие участки карты загружаются | Скачать регион для офлайна или развернуть Veil у себя       |
| Сервис поиска ([Photon](https://github.com/komoot/photon)) | IP-адрес и текст запроса                   | Поиск только по Enter, без «области карты», или свой Photon |

То же самое в приложении рассказывает страница **Настройки → Приватность** — с адресами
конкретной установки.

## Безопасность и ответственность

Об уязвимостях и утечках данных сообщайте закрыто — см. [SECURITY.md](SECURITY.md).

Veil распространяется «как есть» по лицензии MIT. **Авторы и участники проекта не несут
ответственности** за то, как кто-либо разворачивает, настраивает, изменяет и использует
собственные экземпляры (self-hosted серверы, форки, зеркала), за данные, которые такие
экземпляры собирают или обрабатывают, и за любые действия их владельцев и пользователей.
Ответственность за экземпляр и соблюдение применимого законодательства целиком лежит на том,
кто его запускает.

## Установка на телефон

- **Android (Chrome):** Настройки → «Установить Veil» или меню браузера → «Установить приложение».
- **iPhone (Safari):** «Поделиться» → «На экран „Домой“».

На iOS у установленного приложения своё хранилище, отдельное от Safari: скачивайте офлайн-регионы
уже в нём. Сохранённые места переносятся экспортом и импортом.

## Как это устроено

| Часть        | Технологии                                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| Интерфейс    | [Svelte 5](https://svelte.dev/), TypeScript, Vite                                                          |
| Карта        | [MapLibre GL JS](https://maplibre.org/), стиль [Protomaps basemaps](https://github.com/protomaps/basemaps) |
| Тайлы        | [PMTiles](https://github.com/protomaps/PMTiles): мир до зума 7 + детальные регионы до зума 15              |
| Поиск        | [Photon](https://github.com/komoot/photon)                                                                 |
| Офлайн       | Service Worker (Workbox), регионы в OPFS                                                                   |
| Хостинг демо | Cloudflare Pages + R2, тайлы отдаёт Pages Function с того же адреса                                        |

Демо покрывает весь мир на обзорных зумах и **Москву с Московской областью** в деталях.

## Разработка

Нужны Node 22+, pnpm 10 и [`pmtiles`](https://github.com/protomaps/go-pmtiles) (`brew install pmtiles`).

```bash
pnpm install
# Небольшие карты для разработки (~27 МБ, читаются по HTTP из свежей сборки планеты):
scripts/build-regions.sh --out public/dev --maxzoom 5 world
scripts/build-regions.sh --out public/dev moscow-center
pnpm dev
```

| Команда         | Что делает                                                     |
| --------------- | -------------------------------------------------------------- |
| `pnpm dev`      | Сервер разработки                                              |
| `pnpm build`    | Сборка в `dist/` (+ заголовки безопасности из `config.json`)   |
| `pnpm check`    | Проверка типов                                                 |
| `pnpm lint`     | ESLint, stylelint (в компонентах только токены темы), Prettier |
| `pnpm test`     | Юнит-тесты (Vitest)                                            |
| `pnpm test:e2e` | E2E-тесты (Playwright), включая тест приватности               |
| `pnpm budget`   | Бюджет размера бандла                                          |

Как помочь проекту — в [CONTRIBUTING.md](CONTRIBUTING.md).

### Конфигурация

`public/config.json` читается во время работы, поэтому установку можно перенастроить без
пересборки:

```jsonc
{
  "tiles": { "world": "/tiles/world.pmtiles", "worldMaxZoom": 7 }, // обзор планеты
  "regions": "/tiles/index.json", // каталог детальных регионов
  "geocoder": { "type": "photon", "url": "https://photon.komoot.io", "langs": ["en", "de", "fr"] },
  "server": null, // зарезервировано для своего сервера
}
```

Адрес сайта для превью ссылок задаётся в `.env` (`VITE_SITE_URL`). Регионы описаны в
`scripts/regions.tsv` и нарезаются `scripts/build-regions.sh`; размеры — в
[docs/tile-sizes.md](docs/tile-sizes.md).

## Развёртывание (Cloudflare Pages + R2)

Демо работает на бесплатном тарифе Cloudflare без своего домена.

1. В Cloudflare: включить **R2**; создать **R2 API token** (_Object Read & Write_) и
   **API token** с правами _Cloudflare Pages: Edit_ и _Workers R2 Storage: Edit_; скопировать **Account ID**.
2. В GitHub → **Settings → Secrets and variables → Actions** добавить
   `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.
3. Запустить **Actions → Map tiles** — нарезка карт и загрузка в R2 (дальше раз в месяц сама).
4. Каждый коммит в `main`, прошедший CI, выкладывается автоматически (**Actions → Deploy**).

Cloudflare Web Analytics для проекта держите выключенной.

## Развёртка собственного сервиса

Свой экземпляр Veil полностью убирает третьи стороны: и карта, и поиск работают на вашем сервере.
Ниже — путь для обычного Linux-сервера с nginx. Подойдёт любой веб-сервер, который умеет отдавать
статические файлы и поддерживает HTTP Range-запросы.

### 1. Что понадобится

- Сервер с Linux и доменом с HTTPS: без защищённого соединения браузеры не дадут геопозицию и
  не установят приложение.
- Для сборки: Node 22+, pnpm 10, git, [`pmtiles`](https://github.com/protomaps/go-pmtiles/releases).
- Для своего поиска (по желанию): Java 21+, `pbzip2` или `bzip2`. Готовая база Photon по России —
  около 3 ГБ в архиве; по всей планете — около 95 ГБ на диске и от 64 ГБ памяти.

### 2. Соберите сайт

```bash
git clone https://github.com/realfamousbae/Veil.git && cd Veil
pnpm install
echo "VITE_SITE_URL=https://map.example.org" > .env   # адрес для превью ссылок
pnpm build                                          # результат — в dist/
```

### 3. Нарежьте карты

Карта состоит из обзора всего мира (зумы 0–7) и детальных регионов (до зума 15). Регионы описаны в
[`scripts/regions.tsv`](scripts/regions.tsv): чтобы добавить свой, допишите строку с `id`,
названиями и рамкой (`мин_долгота,мин_широта,макс_долгота,макс_широта`). Скрипт читает из
свежей сборки планеты [Protomaps](https://maps.protomaps.com/builds/) только нужные куски —
скачивать всю планету не требуется.

```bash
scripts/build-regions.sh --out /srv/veil/tiles world           # ≈190 МБ
scripts/build-regions.sh --out /srv/veil/tiles moscow-oblast   # ≈620 МБ, или ваш регион
```

В папке появятся `world.pmtiles`, файлы регионов и каталог `index.json` для экрана «Офлайн-карты».
Размеры для ориентира — в [docs/tile-sizes.md](docs/tile-sizes.md). Обновляйте карты раз в месяц
той же командой.

### 4. Поднимите поиск (по желанию)

Без этого шага поиск идёт через публичный [Photon](https://photon.komoot.io) от komoot.

```bash
mkdir -p /srv/photon && cd /srv/photon
wget https://github.com/komoot/photon/releases/download/1.3.0/photon-1.3.0.jar
# База по России (для другой страны или всей планеты — https://download1.graphhopper.com/public/):
wget -O - https://download1.graphhopper.com/public/europe/russia/photon-db-russia-1.0-latest.tar.bz2 \
  | pbzip2 -cd | tar x
java -Xmx8G -jar photon-1.3.0.jar serve -listen-ip 127.0.0.1
```

Photon будет слушать `127.0.0.1:2322`; наружу его открывает nginx на том же адресе, что и сайт
(шаг 6), поэтому CORS не нужен. Запустите его как сервис systemd, чтобы он поднимался сам.
Базу обновляйте атомарно: распакуйте новую рядом, подмените папку и перезапустите Photon —
никогда не распаковывайте поверх старой.

### 5. Настройте `config.json`

Отредактируйте `dist/config.json` (пересборка не нужна):

```json
{
  "tiles": { "world": "/tiles/world.pmtiles", "worldMaxZoom": 7 },
  "regions": "/tiles/index.json",
  "geocoder": { "type": "photon", "url": "/geo", "langs": ["en", "de", "fr"] },
  "server": null
}
```

`"url": "/geo"` — свой Photon за nginx; для публичного оставьте `https://photon.komoot.io`.
Готовые базы Photon содержат английские, немецкие, французские и местные названия, поэтому
`langs` оставьте как есть. Затем пересоздайте заголовки безопасности под ваш конфиг:

```bash
node scripts/build-headers.mjs   # пишет dist/_headers; строку CSP из него перенесите в nginx
```

### 6. Настройте nginx

```nginx
# /etc/nginx/snippets/veil-headers.conf — заголовки безопасности (CSP из dist/_headers)
add_header Content-Security-Policy "default-src 'self'; connect-src 'self'; img-src 'self' data: blob:; worker-src 'self' blob:; style-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'" always;
add_header Referrer-Policy "no-referrer" always;
add_header Permissions-Policy "geolocation=(self), camera=(), microphone=(), browsing-topics=()" always;
add_header X-Content-Type-Options "nosniff" always;
```

```nginx
server {
    listen 443 ssl;
    http2 on;
    server_name map.example.org;
    # ssl_certificate / ssl_certificate_key — например, от Let's Encrypt

    root /srv/veil/dist;
    access_log off;   # не хранить, кто какие места смотрел

    include snippets/veil-headers.conf;

    # Файлы карт: nginx сам отвечает на Range-запросы
    location /tiles/ {
        alias /srv/veil/tiles/;
        types { application/octet-stream pmtiles; application/json json; }
        add_header Cache-Control "public, max-age=86400";
        include snippets/veil-headers.conf;
    }

    # Свой поиск на том же адресе
    location /geo/ {
        proxy_pass http://127.0.0.1:2322/;
        proxy_set_header X-Forwarded-For "";   # не передавать IP посетителей дальше
    }

    location = /sw.js       { add_header Cache-Control "no-cache"; include snippets/veil-headers.conf; }
    location = /config.json { add_header Cache-Control "no-cache"; include snippets/veil-headers.conf; }

    location / {
        try_files $uri /index.html;
    }
}
```

Сниппет с заголовками подключён и в каждом `location` с собственным `add_header`: иначе nginx
не наследует заголовки сервера. Если поиск остался публичным, допишите
`https://photon.komoot.io` в `connect-src`.

### 7. Проверьте

```bash
sudo nginx -t && sudo systemctl reload nginx
curl -sI https://map.example.org/ | grep -i content-security-policy
curl -s -o /dev/null -w "%{http_code}\n" -H "Range: bytes=0-6" https://map.example.org/tiles/world.pmtiles   # 206
curl -s "https://map.example.org/geo/api?q=Москва&limit=1" | head -c 200
```

Откройте сайт: карта рисуется, поиск находит адреса, а в «Настройки → Приватность» указан ваш
адрес. Перед запуском прочитайте [раздел об ответственности](#безопасность-и-ответственность).

## Благодарности

- Данные карты © [участники OpenStreetMap](https://www.openstreetmap.org/copyright), лицензия ODbL.
- Стиль и сборки тайлов — [Protomaps](https://protomaps.com/) (BSD-3-Clause), рендеринг — [MapLibre](https://maplibre.org/).
- Поиск — [Photon](https://github.com/komoot/photon) от komoot.
- Дизайн в стиле Liquid Glass — по технике [liquid-glass-svelte](https://github.com/Tozaburo/liquid-glass-svelte) (Tozaburo, MIT).
- Шрифты — [JetBrains Mono](https://www.jetbrains.com/lp/mono/) и Noto Sans (SIL OFL).

## Лицензия

Код — [MIT](LICENSE).
