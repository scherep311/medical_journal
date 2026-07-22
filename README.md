# Журнал заявок на медицинские услуги

Веб-сервис для операторов колл-центра и руководителей.

Стек: Django REST Framework + PostgreSQL + React (Vite) + Docker Compose.


## Запуск

1. Скачать проект: на странице репозитория на GitHub нажать зелёную кнопку **Code → Download ZIP** и распаковать архив (либо `git clone`, если установлен git).

2. Открыть терминал.

3. Перейти в папку проекта (путь зависит от того, куда распаковался архив):
   ```bash
   cd ~/Downloads/medical_journal-main
   ```

4. Запустить проект одной командой:
   ```bash
   docker compose up --build
   ```
   Поднимутся три контейнера — `db` (PostgreSQL), `backend` (Django, порт 8000), `frontend` (Vite, порт 5173). Миграции и демо-данные (пользователи, справочник услуг) применяются автоматически, ничего дополнительно запускать не нужно. Дождаться в логе строк `Starting development server...` и `VITE ready`.

5. Открыть в браузере: **http://localhost:5173**

6. Войти под одной из готовых учётных записей (создаются автоматически при первом запуске):

   | Логин      | Пароль        | Роль     |
   |------------|---------------|----------|
   | `operator` | `operator123` | OPERATOR — создаёт заявки, меняет статусы |
   | `viewer`   | `viewer123`   | VIEWER — только просмотр журнала и статистики |
   | `admin`    | `admin123`    | ADMIN — суперпользователь, доступ в Django admin (`/admin/`) |

API доступен на **http://localhost:8000/api**.

## Тесты

```bash
docker compose exec backend pytest
```

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