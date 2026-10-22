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
├── features/        # страницы со своими стилями: auth, farm, home, profile
│                    #   farm/ — карта и окна зданий: Магазин, Рынок, хранилища, уровни
├── components/      # Header, LeftMenu, PlantIcon, …
├── layout/
├── shared/services/api.js   # axios + автообновление JWT
└── assets/          # иконки по slug: plants/, items/, buildings/ (.svg, .webp или .png)
tools/
└── gen_buildings.mjs # сохраняет стандартные картинки зданий в src/assets/buildings
```

Иконка культуры общая для семени (`wheat`) и урожая (`wheat_harvest`). Для товаров без картинки показывается эмодзи (`components/PlantIcon.jsx`).

Здания рисует код в `src/features/farm/buildingArt/` (`buildings.js` — рисунок, палитры и варианты каждого здания).
Он же генерирует в игре внешний вид, который выбирает игрок (окно «🎨 Внешний вид», 500 монет за смену):
вид — это три числа-зерна (цвета, крыша, детали), они хранятся на сервере, картинка рисуется в браузере.

Стандартные картинки лежат файлами в `src/assets/buildings/<slug>.svg`. Поменяли рисунок — перегенерируйте их:

```bash
node tools/gen_buildings.mjs
```

Посмотреть случайные варианты (например, после правки палитр): `node tools/gen_buildings.mjs <папка> --variants 6`.

Здание без картинки на карте рисуется цветным блоком с подписью.
