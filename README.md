# Farmotoria — фронтенд

React 19 + Vite + Pixi.js 8. Хостинг — **Vercel**. Бэкенд — отдельный репозиторий `farmotoria_backend` (Render).

## Запуск

```bash
npm install
npm run dev          # http://localhost:5173, API по умолчанию http://127.0.0.1:8000
npm run build        # сборка в dist/
```

## Адрес бэкенда

Берётся из `VITE_API_BASE_URL`:
- `.env.production` — используется при `npm run build` и на Vercel (сейчас `https://farmotoria-backend.onrender.com`);
- переменная в Vercel → Project → Settings → Environment Variables имеет приоритет над файлом;
- локально можно создать `.env.local` (см. `.env.example`).

На бэкенде адрес фронтенда должен быть в `CORS_ALLOWED_ORIGINS`.

## Vercel

`vercel.json` уже настроен: все пути отдаются в `index.html` (обновление `/farm` не даёт 404), долгий кэш для `/assets/`.

## Структура

```
src/
├── features/        # страницы со своими стилями: auth, farm, home, inventory, profile, shop
├── components/      # Header, LeftMenu, PlantIcon, …
├── layout/
├── shared/services/api.js   # axios + автообновление JWT
└── assets/          # иконки по slug: plants/, items/, buildings/ (.svg, .webp или .png)
tools/
└── gen_buildings.py # генератор изометрических SVG зданий
```

Иконка культуры общая для семени (`wheat`) и урожая (`wheat_harvest`). Для товаров без картинки показывается эмодзи (`components/PlantIcon.jsx`).

Картинки зданий (`src/assets/buildings/<slug>.svg`) рисует `tools/gen_buildings.py`. Поменяли цвета или детали — перегенерируйте все (нужен только Python 3):

```bash
python tools/gen_buildings.py
```

Здание без картинки на карте рисуется цветным блоком с подписью.
