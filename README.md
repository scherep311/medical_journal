# Журнал заявок на медицинские услуги

Веб-сервис для операторов колл-центра и руководителей.

Стек: Django REST Framework + PostgreSQL + React (Vite) + Docker Compose.


## Запуск

```bash
docker compose up --build
```

Фронтенд: http://localhost:5173
API: http://localhost:8000/api

## Тесты

```bash
docker compose exec backend pytest
```


## Учётные записи (создаются командой `seed`)

| Логин      | Пароль        | Роль     |
|------------|---------------|----------|
| `operator` | `operator123` | OPERATOR — создаёт заявки, меняет статусы |
| `viewer`   | `viewer123`   | VIEWER — только просмотр журнала и статистики |
| `admin`    | `admin123`    | ADMIN — суперпользователь, доступ в Django admin (`/admin/`) |

## Админка

`http://localhost:8000/admin/` — доступна только регистрация и редактирование пользователей.

## API

Аутентификация: `POST /api/auth/login/` (`username`, `password`) → JWT `access` и `refresh`-токены


| Метод и путь | Доступ | Описание |
|---|---|---|
| `POST /api/auth/login/` | все | вход, возвращает токен и роль |
| `GET /api/services/` | OPERATOR, VIEWER | справочник активных услуг |
| `GET /api/requests/` | OPERATOR, VIEWER | журнал заявок: пагинация, фильтры (`status`, `service`, `desired_date_from/to`, `search`), сортировка (`ordering=created_at\|-created_at\|desired_date\|-desired_date`) |
| `POST /api/requests/` | OPERATOR | создание заявки |
| `GET /api/requests/{id}/` | OPERATOR, VIEWER | заявка с историей статусов |
| `PATCH /api/requests/{id}/` | OPERATOR | редактирование заявки (`patient_fio`, `patient_phone`, `desired_date`, `comment`); доступно только в статусах NEW/IN_PROGRESS, иначе 409 |
| `POST /api/requests/{id}/change-status/` | OPERATOR | смена статуса (`status`, `reason` — обязательна при отмене) |
| `GET /api/requests/statistics/` | OPERATOR, VIEWER | сводка по статусам/услугам за период |

## Схема БД

![Схема БД](docs/db-schema.png)