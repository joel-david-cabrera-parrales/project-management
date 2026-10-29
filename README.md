# Task App

Collaborative task-management application with an Angular SPA, a NestJS REST API, and PostgreSQL. It includes workspaces, Kanban boards, tasks, members, comments, in-app notifications, and an authenticated task-assistant chatbot.

## Architecture

```text
Angular SPA (user-web-portal) -- HTTP/JWT + Socket.IO --> NestJS API (backend) --> PostgreSQL
         :4200                                      :3000/api/v1
```

The frontend is organized as standalone, lazy-loaded features (`authentication`, `workspace`, `profile`, `settings`, `chatbot`) and shared UI/services. The backend is divided into NestJS modules; TypeORM provides persistence. Notifications are delivered through REST and Socket.IO. The chatbot stores each authenticated user's conversation and uses guided flows to read or act on task data.

## Repository layout

```text
backend/             NestJS API, database migrations, tests, Docker Compose
user-web-portal/     Angular application, tests, public assets and translations
README.md            Project overview and release/versioning guide
```

## Local development

Prerequisites: Node.js (20+), npm, Docker Desktop, and PostgreSQL (Docker Compose can run the local database).

1. Start PostgreSQL and configure the backend environment:

   ```bash
   cd backend
   docker compose up -d
   # Create backend/.env using the variables documented in backend/README.md.
   npm install
   npm run start:dev
   ```

   API: `http://localhost:3000/api/v1`; Swagger: `http://localhost:3000/api/docs`.

2. In a second terminal, run the frontend:

   ```bash
   cd user-web-portal
   npm install
   npm start
   ```

   App: `http://localhost:4200`.

See [backend/README.md](backend/README.md) and [user-web-portal/README.md](user-web-portal/README.md) for component-specific setup, scripts, and features.

## Versioning and releases (SemVer)

Use Semantic Versioning in the form `MAJOR.MINOR.PATCH` (Git tags have a `v` prefix, e.g. `v1.2.3`):

- **MAJOR**: incompatible API, behavior, or data-contract change.
- **MINOR**: backward-compatible functionality.
- **PATCH**: backward-compatible fixes and maintenance.

Choose the increment relative to the latest stable tag after reviewing compatibility; do not infer it just from the branch name. If `v1.0.0` is the current release, a compatible feature would normally be `v1.1.0`, while a breaking release would be `v2.0.0`.

Typical release workflow (replace the example version after deciding the increment):

```bash
git switch dev
git pull --ff-only origin dev
# Finish and validate the release candidate on dev, then integrate dev into main
git switch main
git pull --ff-only origin main
git merge --no-ff dev
git push origin main
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0
```

For a release branch, create `release/vX.Y.Z` from the validated release candidate and merge it to `main` (and back to `dev` if release fixes were made there). Keep the tag on the exact commit published as stable. Before tagging, run the backend build/tests and frontend production build/tests, validate database migrations against the intended environment, and perform an authenticated staging smoke test. See [`backend/docs/release-readiness.md`](backend/docs/release-readiness.md) for the known release checks/blockers recorded for this project. Never commit secrets or database backups to Git.

The npm `version` fields are package metadata and are currently not a substitute for the repository's release tag; update them deliberately if the team adopts synchronized package versioning.
