# Marketing Planner - Backend (MVP)

This repository contains a minimal Express + Mongoose backend scaffold implementing core features from the provided `BACKEND_REQUIREMENTS.md`.

What's included:

- Authentication (register, login, refresh, logout)
- User and RefreshToken models
- Client model and CRUD (soft-delete)
- Basic middleware: auth, error handler, rate limiter, helmet
- Seed script to create an admin user

Quick start

1. Copy `.env.example` to `.env` and edit values.
2. Install dependencies:

```powershell
npm install
```

3. Seed and run (development):

```powershell
npm run seed
npm run dev
```

Endpoints

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/clients` (protected)
- `POST /api/v1/clients` (protected)

This is an initial implementation to bootstrap the backend. The full requirements are in `BACKEND_REQUIREMENTS.md` — further work is needed to implement all models, endpoints, tests, and production hardening.
