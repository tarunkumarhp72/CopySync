# CopySync

CopySync synchronizes short clipboard text through a temporary QR connection and keeps signed-in notes available across devices.

## Local setup

Requirements: Node.js 18+, Python 3.11+, and a local PostgreSQL instance.

1. Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to `frontend/.env`, then provide the Google OAuth values in `backend/.env`.
2. Create the database: `createdb -U postgres clipsync_local_db`.
3. Install backend dependencies: `cd backend; python -m pip install -r requirements.txt`.
4. Apply migrations: `alembic upgrade head`.
5. Start the API: `uvicorn app.main:app --reload --port 8000`.
6. In another terminal, start the frontend: `cd frontend; npm install; npm run dev`.

The frontend is available at `http://localhost:3000` and the API docs at `http://localhost:8000/docs`.

## Google sign-in configuration

In Google Cloud Console, configure the web client with the exact authorized redirect URI `http://localhost:8000/auth/google/callback` and authorized JavaScript origin `http://localhost:3000`. Put the Google client ID, client secret, and a long random `COPYSYNC_APP_JWT_SECRET` in `backend/.env`. The client secret is backend-only; never add it to `frontend/.env.local`.
