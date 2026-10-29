# Nota de memoria: estado de release v2

Última revisión: 2026-10-29. El trabajo de `feature/release-readiness-tests` ya está integrado en `dev`.

## Estado verificado

- Backend: `npm run build` correcto; pruebas Jest: 7 suites, 28 pruebas aprobadas.
- Frontend: build de desarrollo correcto; pruebas Angular: 16 archivos, 23 pruebas aprobadas.
- Las pruebas nuevas cubren el widget flotante, las llamadas REST del chatbot, el render de cards y las acciones guiadas del backend.

## Bloqueos antes de publicar como versión estable

1. El build de producción del frontend falla por el presupuesto de estilos de componente de Angular:
   - `workspace-task-activity.css`: 9.86 KB; límite de error 8 KB.
   - `chatbot-widget.css`: 11.21 KB; límite de error 8 KB.
   - El bundle inicial supera el umbral de advertencia de 500 KB, aunque no el umbral de error de 1 MB.
2. La migración `1793300000000-CreateChatbotConversations` aún debe ejecutarse y comprobarse contra la base PostgreSQL de staging. Joel se encarga de esa validación.
3. Falta una prueba end-to-end con backend, JWT, PostgreSQL y flujos reales en staging; las pruebas automatizadas actuales son unitarias/de componente y usan servicios simulados.

No considerar la versión lista para publicación estable hasta que el build de producción pase, la migración esté validada y el smoke test autenticado en staging termine correctamente.
