# Workspace interface system

## Direction

Design the authenticated product shell as a focused workbench for teams managing projects, boards, and shared tasks. The interface should feel compact and dependable: common actions stay in reach, while the page content carries the workspace context.

## Domain and signature

- Domain vocabulary: workspaces, boards, columns, tasks, teammates, status.
- Signature: a slim Zenith-inspired topbar with a real workspace search; the page owns the primary “create workspace” action and lifecycle sections.
- Search filters active workspaces only. Closed and archived groups are collapsed by default and remain independent of the active search.
- Grid and list are two presentations of the same workspace model, not separate data sources.

## Color and surfaces

- Use the app's existing slate surfaces and text tokens (`--bg-base`, `--bg-raised`, `--bg-card`, `--text-*`, `--border-*`).
- Blue is the primary action/focus color and active navigation accent.
- Green communicates active, amber communicates closed, and muted slate communicates archived. Do not use status colors decoratively.
- Prefer subtle borders and restrained shadows. Keep popovers one elevation above the topbar and cards one elevation above the canvas.

## Typography and spacing

- Keep the existing system sans-serif stack; use strong, tightly tracked page headings and quieter metadata.
- Use a 4px base spacing unit, with 8px and 16px as common control and section gaps.
- Keep the topbar controls compact (about 36px high) and the search field flexible and visually central.

## Component patterns

- Topbar: navigation/app switcher, brand, workspace search, help, theme, language, notifications, profile menu. Use real profile/session data; no demo notification/search results.
- Workspace page: page-level create button, active section, grid/list switch, collapsed closed/archived sections, explicit loading/empty/error/no-match states.
- Workspace cards share the same surface treatment in both layouts; list mode changes arrangement, not content semantics.
- Profile and settings are routed pages within the authenticated shell. Demo-only capabilities must be labeled as forthcoming rather than showing fabricated data.
- Zenith UI is a React reference. Recreate its patterns in Angular; do not import React components or its mock navigation data.
