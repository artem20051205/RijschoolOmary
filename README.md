# Rijschool Omary — сайт

Новый сайт для rijschool-omary.nl: светлый минимализм в стиле liquid glass + бэкенд для заявок.

## Запуск

Нужен только [Node.js](https://nodejs.org) (без `npm install` — зависимостей нет):

```
node server.js
```

- Сайт: http://localhost:5500
- Админка с заявками: http://localhost:5500/admin?key=omary-admin-2026
- Заявки сохраняются в `data/submissions.json` (из админки можно скачать JSON)

## Админ-ключ

По умолчанию ключ — `omary-admin-2026`. **Перед публикацией смени его**: задай переменную
окружения `ADMIN_KEY` или поменяй значение в начале `server.js`.

```
# PowerShell
$env:ADMIN_KEY = "мой-секретный-ключ"; node server.js
```

## Как это работает

- `index.html`, `styles.css`, `script.js` — сам сайт (можно захостить и без бэкенда:
  тогда форма откроет почтовый клиент вместо отправки на сервер).
- `server.js` — статика + `POST /api/contact`: валидация, honeypot против ботов,
  rate-limit (5 заявок / 10 мин с одного IP), сохранение в JSON.
- Порт: `PORT` (по умолчанию 5500).

## Деплой

Любой хостинг с Node.js (Render, Railway, VPS…): загрузить папку, запустить
`node server.js`, задать `ADMIN_KEY`. Папку `data/` сервер создаёт сам —
следи, чтобы она не была публичной и не терялась при пересборке.
