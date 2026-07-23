# Журнал заявок на медицинские услуги

Веб-сервис для операторов колл-центра и руководителей.

Стек: Django REST Framework + PostgreSQL + React (Vite) + Docker Compose.


## Запуск

1. Скачать zip-проекта

2. Открыть docker

3. Открыть терминал

4. Перейти в папку проекта:
   ```bash
   cd ~/Downloads/medical_journal-main
   ```
   Для очистки контейнера:
   ```bash
   docker compose down
   ```
5. Запустить проект одной командой:
   ```bash
   docker compose up --build
   ```
   Поднимутся три контейнера — `db`, `backend`, `frontend`. Миграции и демо-данные применяются автоматически.

6. Открыть в браузере: **http://localhost:5173**

7. Войти под одной из готовых учётных записей:

   | Логин      | Пароль        | Роль     |
   |------------|---------------|----------|
   | `operator` | `operator123` | OPERATOR — создаёт заявки, меняет статусы |
   | `viewer`   | `viewer123`   | VIEWER — только просмотр журнала и статистики |
   | `admin`    | `admin123`    | ADMIN — суперпользователь, доступ в Django admin (`/admin/`) |

## Тесты

```bash
docker compose exec backend pytest
```

Валидация СНИЛС, матрица переходов статусов, доступ по ролям, пагинация/фильтрация журнала, агрегация статистики.

## База данных

Зайти в psql:
```bash
docker compose exec db psql -U postgres -d medical_db
```

Заполнить журнал 15 демо-заявками (выполнить внутри psql):
```sql
INSERT INTO requests (patient_fio, patient_snils, patient_phone, desired_date, comment, status, service_id, created_by_id, updated_by_id, created_at, updated_at)
SELECT v.fio, v.snils, v.phone, CURRENT_DATE + v.days, v.comment, v.status,
       (SELECT id FROM services WHERE name = v.service LIMIT 1),
       (SELECT id FROM users WHERE username = 'operator'),
       (SELECT id FROM users WHERE username = 'operator'),
       NOW(), NOW()
FROM (VALUES
    ('Иванов Иван Иванович',       '112-233-445 95', '+79990001101', 3,  'Плановый осмотр',         'NEW',         'Терапевт'),
    ('Петров Пётр Петрович',       '112-233-445 95', '+79990001102', 5,  'Боль в груди',            'IN_PROGRESS', 'Кардиолог'),
    ('Сидорова Анна Викторовна',   '112-233-445 95', '+79990001103', 7,  'Плановый приём',          'DONE',        'Стоматолог'),
    ('Кузнецов Олег Дмитриевич',   '112-233-445 95', '+79990001104', 2,  'Проверка зрения',         'CANCELLED',   'Офтальмолог'),
    ('Смирнова Елена Сергеевна',   '112-233-445 95', '+79990001105', 10, 'Повторный приём',         'NEW',         'Терапевт'),
    ('Попов Дмитрий Андреевич',    '112-233-445 95', '+79990001106', 1,  'Плановый осмотр',         'IN_PROGRESS', 'Кардиолог'),
    ('Васильева Мария Игоревна',   '112-233-445 95', '+79990001107', 4,  'Лечение зуба',            'DONE',        'Стоматолог'),
    ('Соколов Артём Николаевич',   '112-233-445 95', '+79990001108', 6,  'Подбор очков',            'NEW',         'Офтальмолог'),
    ('Морозова Ольга Павловна',    '112-233-445 95', '+79990001109', 8,  'Плановый осмотр',         'CANCELLED',   'Терапевт'),
    ('Волков Игорь Сергеевич',     '112-233-445 95', '+79990001110', 9,  'Консультация кардиолога', 'NEW',         'Кардиолог'),
    ('Алексеева Дарья Романовна',  '112-233-445 95', '+79990001111', 12, 'Профилактика',            'IN_PROGRESS', 'Стоматолог'),
    ('Николаев Максим Викторович', '112-233-445 95', '+79990001112', 14, 'Проверка зрения',         'DONE',        'Офтальмолог'),
    ('Егорова Виктория Олеговна',  '112-233-445 95', '+79990001113', 15, 'Плановый осмотр',         'NEW',         'Терапевт'),
    ('Тимофеев Роман Андреевич',   '112-233-445 95', '+79990001114', 3,  'Боль в сердце',           'NEW',         'Кардиолог'),
    ('Фролова Кристина Сергеевна', '112-233-445 95', '+79990001115', 5,  'Удаление зуба',           'IN_PROGRESS', 'Стоматолог')
) AS v(fio, snils, phone, days, comment, status, service);
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