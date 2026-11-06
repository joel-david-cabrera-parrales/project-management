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

## Demo

Screenshots of the current application. Expand a group to browse its captures.

<details open>
<summary>Authentication</summary>

![Authentication with credentials and OAuth](screenshots/1.%20authenticacion%20con%20credenciales%2C%20google%20y%20microsoft.png)

</details>

<details open>
<summary>Workspaces, boards, tasks, and collaboration</summary>

![Workspace](screenshots/2.%20espacio%20de%20trabajo%20renovado.png)

![Workspace management](screenshots/2.1%20mejora%20en%20la%20gestion%20de%20los%20espacios%20de%20trabajo.png)

![Workspace grid and list](screenshots/2.2%20mejora%20en%20la%20visualizacion%20de%20los%20workspace%20%28grid%20and%20list%29.png)

![Workspace customization](screenshots/2.3%20implementacion%20de%20nuevos%20componentes%20ui%20para%20mejorar%20personalizacion%20del%20workspace.png)

![Workspace features](screenshots/2.4%20%20implementacion%20de%20nuevas%20funcionalidades%20%28multiboard%2C%20asistente%20virtual%2C%20etc%29.png)

![Drag and drop](screenshots/2.5%20mejora%20en%20la%20implementaci%C3%B3n%20del%20drag%20and%20drop.png)

![Workspace invitations](screenshots/2.6%20mejora%20en%20la%20posibilidad%20de%20invitar%20a%20un%20usuario%20a%20tu%20espacio%20de%20trabajo.png)

![Workspace members](screenshots/2.7%20redise%C3%B1o%20en%20la%20pantalla%20para%20gestion%20de%20colaboradores.png)

![Workspace labels](screenshots/2.8%20redise%C3%B1o%20en%20la%20pantalla%20para%20gestionar%20tus%20etiquetas.png)

![Multiple boards](screenshots/2.9%20implementacion%20de%20multi%20boards.png)

</details>

<details open>
<summary>Notifications and user settings</summary>

![Realtime notifications](screenshots/3%20sistemas%20e%20notificaciones%20mejorado%20y%20en%20tiempo%20real.png)

![Settings overview](screenshots/4%20redise%C3%B1o%20del%20las%20configuraciones%20disponibles.png)

![System settings](screenshots/4.1%20redise%C3%B1o%20de%20las%20configuraciones%20del%20sistema.png)

![User profile settings](screenshots/4.2%20redise%C3%B1o%20de%20la%20gestion%20del%20perfil%20del%20usuario.png)

</details>

<details open>
<summary>Task assistant and conversational flows</summary>

![Assistant conversation flows](screenshots/5%20implementacion%20de%20flujos%20conversaciones%20para%20gestion%20de%20tu%20espacio.png)

![Conversational flow example 1](screenshots/5.1%20demostracion%20de%20flujo%20conversacional%201.png)

![Conversational flow example 2](screenshots/5.1%20demostracion%20de%20flujo%20conversacional%202.png)

![Conversational flow example 3](screenshots/5.1%20demostracion%20de%20flujo%20conversacional%203.png)

</details>

## Local development (Docker Compose)

The recommended flow matches the root `docker-compose.yml`: start Docker Desktop, configure one root `.env`, then run the whole stack from the repository root. It starts PostgreSQL, pgAdmin, the NestJS backend, and Angular frontend.

1. Copy `.env.example` to `.env` in the repository root and fill in the values/credentials you will use. In PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   In macOS/Linux/Git Bash:

   ```bash
   cp .env.example .env
   ```

   Replace every `<...>` placeholder, especially the database/pgAdmin passwords, JWT/session secrets, SMTP credentials, and OAuth credentials if those sign-in methods are needed. Keep `TORM_PG_*` aligned with `POSTGRES_*`; for Compose, the backend connects to host `postgres` on port `5432`. Do not commit `.env`.

2. From the repository root (the directory containing `docker-compose.yml`), run:

   ```bash
   docker compose up --build
   ```

   Add `-d` to run in the background; use `docker compose logs -f backend` to follow backend startup. Services:

   - Frontend: `http://localhost:4200`
   - API: `http://localhost:3000/api/v1`
   - Swagger: `http://localhost:3000/api/docs`
   - pgAdmin: `http://localhost:8083`

   Stop services with `docker compose down`. This preserves database files mounted under `backend/db/`; **do not add `-v`** unless you intentionally want to remove volumes. Back up valuable data separately.

The root Compose file is the normal project startup method; package scripts are also useful for running an individual service during development. See [backend/README.md](backend/README.md) for environment details.

See [backend/README.md](backend/README.md) and [user-web-portal/README.md](user-web-portal/README.md) for component-specific setup, scripts, and features.
