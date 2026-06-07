# МКБ-МИС — клиентская часть (интерфейс врача)

Веб-клиент медицинской информационной системы для пациентов с мочекаменной болезнью.
Чистый **HTML + CSS + JavaScript**, без сборщиков и фреймворков.

Разработчик клиента: Нурсултан Сартбаев.

## Запуск

Просто откройте `index.html` в браузере (двойной клик) — приложение работает сразу
на встроенных тестовых данных (режим мок). Сервер для этого не нужен.

Тестовые аккаунты:

| Логин           | Пароль   | Роль          |
|-----------------|----------|---------------|
| `doctor_ivanov` | `hash123`| Врач          |
| `doctor_petrova`| `hash456`| Врач          |
| `admin`         | `admin`  | Администратор |

## Возможности

- Экран входа (логин + пароль), сессия хранится в `sessionStorage`.
- Две роли:
  - **Врач** — основной интерфейс (пациенты, карточки, журналы).
  - **Администратор** — то же плюс раздел «Аккаунты врачей» с созданием новых аккаунтов.
- Список пациентов с поиском по **ФИО** или **номеру карты** (`id_patient`).
- Карточка пациента: просмотр и редактирование (ФИО, лечащий врач, анамнез).
- Журнал: камни (локализация, размер) и обследования (тип, врач), добавление и удаление.
- Формы добавления пациента, камня и обследования.

## Структура

```
client/
├── index.html        # разметка всех экранов
├── css/style.css     # стили
└── js/
    ├── mock-data.js  # тестовые данные (повторяют schema.sql)
    ├── api.js        # слой доступа к данным (REST + мок)
    └── app.js        # логика интерфейса
```

## Подключение к серверу

Весь обмен данными изолирован в `js/api.js`. Чтобы переключиться с моков
на реальный сервер, в начале файла поставьте:

```js
const USE_MOCK = false;
const BASE_URL = "http://<адрес-сервера>/api";
```

Остальной код менять не нужно. Токен авторизации автоматически
отправляется в заголовке `Authorization: Bearer <token>`.

## Контракт REST API (для серверной команды)

Модели соответствуют `schema.sql`.

### Аутентификация
```
POST /auth/login        { username, password }
   → { token, user: { id_user, username, role, full_name } }
```

### Пользователи (раздел администратора)
```
GET  /users                 → [ { id_user, username, role, full_name } ]
GET  /users?role=doctor     → [ { id_user, username, role, full_name } ]
POST /users                 { username, password, role, full_name }
   → { id_user, username, role, full_name }
```

### Пациенты
```
GET  /patients?search=<строка>
   → [ { id_patient, id_user, full_name, anamnesis,
         doctor_name, stones_count, examinations_count } ]
GET  /patients/{id}         → { id_patient, id_user, full_name, anamnesis, doctor_name }
POST /patients              { full_name, anamnesis, id_user }   → { id_patient, ... }
PUT  /patients/{id}         { full_name, anamnesis, id_user }   → { id_patient, ... }
```
Поиск (`search`) фильтрует по `full_name` (подстрока) и по точному `id_patient`.
Поля `doctor_name`, `stones_count`, `examinations_count` сервер считает через JOIN/COUNT.

### Камни
```
GET    /patients/{id}/stones        → [ { id_stone, id_patient, location, size_mm } ]
POST   /patients/{id}/stones        { location, size_mm }   → { id_stone, ... }
DELETE /stones/{id}                 → 204
```

### Обследования
```
GET    /patients/{id}/examinations  → [ { id_examination, id_patient, id_user,
                                          examination_type, doctor_name } ]
POST   /patients/{id}/examinations  { examination_type, id_user }   → { id_examination, ... }
DELETE /examinations/{id}           → 204
```

## Сброс тестовых данных

Мок хранит изменения в `localStorage` (ключ `mkb_mis_db`). Чтобы вернуть
исходные данные, выполните в консоли браузера `Api.resetMock()` и обновите страницу.
