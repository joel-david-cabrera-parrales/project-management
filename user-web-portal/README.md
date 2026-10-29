# Task App — Frontend

Angular 21 single-page application for the Task App platform. The active frontend is implemented with standalone components, lazy-loaded routes, Angular Signals, and feature-oriented folders. The legacy `src/app/old-frontend` tree has been removed; current code lives in `authentication`, `workspace`, `profile`, `settings`, `chatbot`, and `shared`.

## Technology

| Technology | Use |
|---|---|
| Angular 21 / TypeScript 5.9 | SPA and application code |
| Angular Signals / RxJS | Local reactive state and async streams |
| Tailwind CSS 4 / PostCSS | Styling |
| Angular CDK | UI utilities and drag/drop |
| Vitest | Unit/component tests |

## Run locally

```bash
npm install
npm start
```

The frontend runs at `http://localhost:4200` and expects the API configured by `src/environments/environment.ts` (default local API: `http://localhost:3000/api/v1`). Start/configure the backend first; see [backend/README.md](../backend/README.md).

## Commands

| Command | Description |
|---|---|
| `npm start` | Run Angular dev server |
| `npm run build` | Build using the default production configuration |
| `npm run watch` | Development build in watch mode |
| `npm test -- --watch=false` | Run tests once |

## Active features and routes

| Route/feature | Contents |
|---|---|
| `/auth` | Sign in, sign up, password recovery, authentication callback |
| `/workspace` | Workspace list, Kanban board, workspace members, labels, settings, task activity |
| `/profile` | User profile |
| `/settings` | Application preferences |
| `/invite/:code` | Invitation acceptance |
| Chatbot widget | Authenticated guided task assistant, including task cards and task actions |
| Notification center | In-app notification list, unread state, and realtime updates |

The authenticated application shell contains the active workspace navigation (`WorkspaceTopbar` and `WorkspaceSidebar`). The removed legacy shared `top-bar` and `side-bar` components were only consumed by the removed legacy routes and are not part of the active app.

## State and API access

- Feature data access is separated into API services; stores hold workspace list/detail state.
- Authentication uses an auth guard and HTTP interceptors for bearer-token handling and authentication errors.
- Shared services provide storage, translation, theme, notifications, and invitation support.
- The chatbot API service uses `/chatbot/flows` and the authenticated conversation lifecycle endpoints. The notification center combines REST access with realtime server events.

## Project structure

```text
src/app/
├── authentication/     Sign-in/up, recovery, callback, guards/interceptors
├── chatbot/            Assistant API, conversation models, floating widget
├── profile/            User profile feature
├── settings/           Application preferences
├── shared/             App shell, navigation, dialogs, notifications, services
└── workspace/          Workspace, board, tasks, members, labels, activity
```

Other useful locations: `src/environments/` for API configuration; `public/i18n/` for English and Spanish translations; `src/styles.css` for global styling.

## Tests and production build

Frontend tests use Angular's unit-test builder with Vitest and JSDOM. Keep component tests focused on visible behavior, and mock API dependencies rather than requiring a running backend. Before a release, run the one-shot test command and `npm run build`. Angular's production build enforces bundle and component-style budgets; resolve budget failures rather than bypassing them. The current release checklist is recorded in [backend/docs/release-readiness.md](../backend/docs/release-readiness.md).

For SemVer and the Git release/tag workflow, see [the root README](../README.md#versioning-and-releases-semver).
