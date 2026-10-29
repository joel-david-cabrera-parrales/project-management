export interface BoardCreatedEmailData {
  recipientName: string;
  creatorName: string;
  boardName: string;
  workspaceName: string;
  boardUrl: string;
  appName: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] as string);
}

export function boardCreatedTemplate(data: BoardCreatedEmailData): string {
  const recipientName = escapeHtml(data.recipientName);
  const creatorName = escapeHtml(data.creatorName);
  const boardName = escapeHtml(data.boardName);
  const workspaceName = escapeHtml(data.workspaceName);
  const appName = escapeHtml(data.appName);
  const boardUrl = escapeHtml(data.boardUrl);

  return `<!doctype html>
    <html lang="es">
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:36px 12px;background:#f1f5f9">
          <tr><td align="center">
            <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:12px">
              <tr><td style="padding:32px">
                <p style="margin:0 0 20px;color:#64748b;font-size:13px">${appName}</p>
                <h1 style="margin:0 0 12px;font-size:24px">Se creó un nuevo tablero</h1>
                <p style="margin:0 0 24px;color:#475569;line-height:1.6">Hola ${recipientName}, ${creatorName} creó el tablero <strong>${boardName}</strong> en el workspace <strong>${workspaceName}</strong>.</p>
                <a href="${boardUrl}" style="display:inline-block;border-radius:8px;background:#2563eb;padding:12px 18px;color:#fff;font-weight:700;text-decoration:none">Abrir tablero</a>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
    </html>`;
}
