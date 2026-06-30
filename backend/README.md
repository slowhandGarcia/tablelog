# TableLog — Backend

Django + DRF API for the TableLog restaurant visit tracking app. JWT auth via
`djangorestframework-simplejwt`.

## How this was scaffolded

```bash
mkdir backend && cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install django djangorestframework djangorestframework-simplejwt \
            django-cors-headers dj-database-url psycopg2-binary \
            gunicorn whitenoise python-dotenv

django-admin startproject config .
python manage.py startapp accounts
python manage.py startapp workouts
python manage.py startapp social
```

## Local setup

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # adjust as needed; defaults to SQLite
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver    # http://127.0.0.1:8000
```

## Apps

- **accounts** — custom `User` (`email`, `username`, `bio`, `location`,
  `is_active` from `AbstractUser`, `created_at` = `date_joined`). Login is
  by `email`; `username` is the public display name. JWT auth endpoints.
- **workouts** — `Workout` (restaurant visit: `name`, `date`, `completed_at`,
  `body_weight`, `weight_unit`, `images[]`) → `ExerciseSet` (`exercise_name`,
  `reps`, `weight`, `completed`, `order`), scoped to the authenticated user,
  full CRUD with nested `sets[]` writes.
- **social** — `CommunityPost` (`text`, `images[]`, `likes`) and `Comment`,
  full CRUD; reads are public, writes require auth + ownership.

## Auth endpoints (`/api/auth/`)

| Method | Path        | Auth | Body                                          |
|--------|-------------|------|------------------------------------------------|
| POST   | `register/` | none | `email, username, password, password2`        |
| POST   | `login/`    | none | `email, password`                              |
| POST   | `refresh/`  | none | `refresh`                                      |
| POST   | `logout/`   | yes  | `refresh` (blacklists it)                      |
| GET/PATCH | `me/`    | yes  | —                                               |

`register/` and `login/` both return `{ user, access, refresh }`.

## Data endpoints (`/api/`)

- `workouts/` — `GET/POST`, `workouts/{id}/` — `GET/PATCH/PUT/DELETE`
- `posts/` — `GET/POST`, `posts/{id}/` — `GET/PATCH/PUT/DELETE`,
  `posts/{id}/like/` — `POST` (toggles)
- `comments/?post={id}` — `GET/POST`, `comments/{id}/` — `GET/PATCH/PUT/DELETE`

## Deploying to Railway

1. Push `backend/` to a GitHub repo (or use the Railway CLI from this folder).
2. In Railway: **New Project → Deploy from GitHub repo**, pick this repo,
   and set the **root directory** to `backend` if the repo contains more
   than just this folder.
3. **Add a plugin → PostgreSQL.** Railway sets `DATABASE_URL` automatically
   on the web service — `dj-database-url` picks it up with no extra config.
4. Set environment variables on the web service:
   - `SECRET_KEY` — a long random string
   - `DEBUG` — `False`
   - `ALLOWED_HOSTS` — leave blank; the app auto-allows `RAILWAY_PUBLIC_DOMAIN`
   - `CORS_ALLOWED_ORIGINS` — your Expo app's origin(s), comma-separated
5. Railway detects Python via `requirements.txt` and `runtime.txt`
   (Nixpacks). The `Procfile` defines:
   - `release: python manage.py migrate` — runs automatically before each deploy
   - `web: gunicorn config.wsgi --bind 0.0.0.0:$PORT`
6. After the first deploy, run once via the Railway shell (or a one-off
   command) to create an admin user:
   ```bash
   python manage.py createsuperuser
   ```
7. Your API is live at `https://<your-app>.up.railway.app/api/`. Point the
   Expo app's `EXPO_PUBLIC_API_URL` at that.
