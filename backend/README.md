# Task App — Backend API

NestJS 11 REST API for authentication, collaborative workspaces, tasks, notifications, and the task-assistant chatbot. PostgreSQL is accessed through TypeORM. The API is prefixed with `/api/v1`; interactive Swagger documentation is available at `/api/docs` when the server is running.

## Stack and modules

| Area | Technology / responsibility |
|---|---|
| API | NestJS 11, REST, Swagger/OpenAPI |
| Persistence | PostgreSQL 16, TypeORM |
| Authentication | Passport, JWT, Google and Microsoft OAuth |
| Realtime | Socket.IO notification gateway |
| Tests | Jest and Supertest |

Main modules: `auth`, `profile`, `workspace`, `workspace-invitation`, `task-list`, `task`, `label`, `attachment`, `comment`, `notification`, and `chatbot`. Business operations are organized around use cases and services, with repositories for persistence and guards for authenticated/workspace-scoped access.

## Setup

The recommended project startup is from the repository root: copy `.env.example` to `.env`, replace the placeholders with the credentials/settings you will use, then run `docker compose up --build`. The root Compose file starts the database, pgAdmin, backend, and frontend together and passes the root `.env` into the backend container. See the [root README](../README.md#local-development-docker-compose) for complete steps and URLs.

For backend-only development, ensure PostgreSQL is running and the backend process receives its environment (for example via `backend/.env`, using `TORM_PG_HOST=localhost` and the published PostgreSQL port `5434`), then run:

```bash
npm install
npm run start:dev
```

The default local API is `http://localhost:3000/api/v1`; Swagger is `http://localhost:3000/api/docs`; pgAdmin is `http://localhost:8083` when enabled by root Compose.

## Configuration

The application loads configuration from the backend environment. Confirm the actual `.env.example`, Compose file, and `src/app.module.ts` when changing defaults; the table below describes the main keys.

| Variable | Purpose |
|---|---|
| `PORT`, `HOST_API`, `HOST_FRONTEND` | API port/base URL and allowed frontend origin |
| `TORM_PG_HOST`, `TORM_PG_PORT`, `TORM_PG_DATABASE`, `TORM_PG_USER_DB`, `TORM_PG_PASSWORD_DB` | PostgreSQL connection |
| `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN` | Access/refresh token settings |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | Google OAuth |
| `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_CALLBACK_URL` | Microsoft OAuth |
| `MAILER_HOST`, `MAILER_PORT`, `MAILER_USER`, `MAILER_SECRET` | SMTP for email workflows |
| `APP_NAME`, `TRUST_PROXY` | Application identity and proxy behavior |

Do not reuse a production database for local development. Verify the configured host and database name before starting the app.

## API overview

All paths below are relative to `/api/v1`.

| Feature | Routes (summary) |
|---|---|
| Authentication | `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/google`, `/auth/microsoft`, password reset routes |
| Profile | `/profile/me`, `/profile/settings`, `/profile/photo` |
| Workspaces | `/workspace`, `/workspace/:code`, nested members and boards |
| Tasks | `/task`, `/task/:id`, reorder, labels, assignees |
| Task lists | `/task-list` |
| Comments and attachments | `/comment/task/:taskCode`, `/attachment/*` |
| Invitations | `/workspace-invitation/*` |
| Notifications | `GET /notifications`, unread count, read/clear operations |
| Chatbot | `GET /chatbot/flows`; create, fetch, message, and reset `/chatbot/conversations` |

Protected endpoints require a JWT unless documented otherwise in Swagger. Workspace and task operations also enforce membership/role rules. The chatbot endpoints are JWT-protected and conversations are scoped to the authenticated user.

## Notifications and chatbot

Notifications are persisted, can be listed/marked read via REST, and are emitted to connected users via Socket.IO. User notification preferences are applied by the notification service.

The assistant currently exposes the `task-assistant` guided flow. Its REST lifecycle is:

1. `GET /chatbot/flows` to discover available flows.
2. `POST /chatbot/conversations` with `{ "flowId": "task-assistant" }`.
3. `GET /chatbot/conversations/:conversationId` to retrieve the conversation.
4. `POST /chatbot/conversations/:conversationId/messages` with `{ "message": "..." }`.
5. `POST /chatbot/conversations/:conversationId/reset` to restart it.

The flow supports task lookup and guided task actions. Mutating operations use the existing task, assignment, and comment services and apply workspace authorization; they are not direct database writes from the chatbot.

## Database and migrations

Database entities are split primarily across the `auth` and `workspaces` schemas. The chatbot conversation and notification features have migrations under `src/database/migrations/`. Review a migration before applying it, back up the target database, and validate it in a disposable/staging environment first. A migration records/applies schema changes; it is **not** a database backup. Use PostgreSQL backup tooling (for example `pg_dump`) to preserve data.

Important: `src/app.module.ts` currently enables both migration execution and TypeORM `synchronize`. This is convenient for development but can change the schema at application startup. Do not point a production or valuable database at this configuration without explicitly disabling automatic synchronization and reviewing the migration/deployment strategy. Never use `synchronize` as a substitute for reviewed migrations or backups.

## Scripts

| Command | Description |
|---|---|
| `npm run start:dev` | Start with watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run compiled server |
| `npm test -- --runInBand` | Run unit tests serially |
| `npm run test:cov` | Run tests with coverage |
| `npm run test:e2e` | Run the Supertest e2e suite |
| `npm run lint` | Run ESLint (script currently includes `--fix`) |
| `npm run format` | Format backend TypeScript files |

## Release readiness

The repository-level release/versioning workflow is in [the root README](../README.md#versioning-and-releases-semver). Check [docs/release-readiness.md](docs/release-readiness.md) for the recorded production-build, migration-validation, and staging smoke-test status; update that note when those checks change.
