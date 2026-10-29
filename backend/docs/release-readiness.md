# Nota de memoria: estado de release v2

Última revisión: 2026-10-29. El trabajo de `feature/release-readiness-tests` y la limpieza de `old-frontend` están integrados localmente en `dev`.

## Estado verificado

- Backend: `npm run build` correcto; pruebas Jest: 7 suites, 28 pruebas aprobadas.
- Frontend: pruebas Angular actuales: 4 archivos, 11 pruebas aprobadas; ya no se ejecutan los tests que vivían dentro del frontend legacy eliminado.
- El build de producción fue reintentado después de la limpieza: continúa fallando. Además de los dos errores de presupuesto de estilos enumerados abajo, se reportan advertencias de tamaño para varios otros estilos de componentes.
- Las pruebas conservadas cubren el widget flotante, las llamadas REST del chatbot, el render de cards y la lógica de estado de workspaces.

## Bloqueos antes de publicar como versión estable

1. El build de producción del frontend falla por el presupuesto de estilos de componente de Angular:
   - `workspace-task-activity.css`: 9.86 KB; límite de error 8 KB.
   - `chatbot-widget.css`: 11.21 KB; límite de error 8 KB.
   - El bundle inicial de esta ejecución fue 494.81 KB, por debajo del umbral de advertencia de 500 KB.
2. La migración `1793300000000-CreateChatbotConversations` aún debe ejecutarse y comprobarse contra la base PostgreSQL de staging. Joel se encarga de esa validación.
3. Falta una prueba end-to-end con backend, JWT, PostgreSQL y flujos reales en staging; las pruebas automatizadas actuales son unitarias/de componente y usan servicios simulados.

No considerar la versión lista para publicación estable hasta que el build de producción pase, la migración esté validada y el smoke test autenticado en staging termine correctamente.
