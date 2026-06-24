// @ts-ignore
declare const Deno: any;

const DASHBOARD_URL = 'https://matriculausa.com/student/dashboard/translations';
const LOGO_URL = 'https://matriculausa.com/favicon-branco.png';

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Matricula USA</title></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#1e3a5f;padding:20px 32px;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;">
                <img src="${LOGO_URL}" width="36" height="36" alt="Matricula USA" style="display:block;border:0;border-radius:4px;">
              </td>
              <td style="vertical-align:middle;padding-left:12px;">
                <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">Matricula USA</span>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px;">
          ${content}
        </td></tr>
        <tr><td style="background:#f5f7fa;padding:20px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
            You're receiving this email because you placed a translation order with Matricula USA.<br>
            Questions? Reply to this email or visit <a href="https://matriculausa.com" style="color:#1e3a5f;">matriculausa.com</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function ctaButton(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:600;margin-top:24px;">${text} →</a>`;
}

function buildAdminOrderCompletedHtml(data: {
  studentEmail: string; docName: string; orderId: string;
}): string {
  const ADMIN_TRANSLATIONS_URL = 'https://matriculausa.com/admin/dashboard/translations';
  return layout(`
    <h2 style="margin:0 0 8px;color:#1e3a5f;font-size:20px;">Translation Order Completed</h2>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;">A translation order has been finalized and marked as Completed.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
      <tr><td style="padding:16px 20px;">
        <table cellpadding="0" cellspacing="0" style="width:100%;">
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Student</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${data.studentEmail}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Document</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${data.docName}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Order ID</td><td style="padding:4px 0;font-size:13px;color:#6b7280;text-align:right;">${data.orderId}</td></tr>
        </table>
      </td></tr>
    </table>
    ${ctaButton('View in admin dashboard', ADMIN_TRANSLATIONS_URL)}
  `);
}

export function buildSentToAlphaHtml(data: {
  name: string; docName: string; alphaProjectNumber: string | number;
}): string {
  return layout(`
    <h2 style="margin:0 0 8px;color:#1e3a5f;font-size:20px;">Document sent for translation</h2>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;">Hi${data.name ? ', ' + data.name : ''}! Your document has been sent to our certified translation team.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f0f9ff;border-radius:6px;border:1px solid #bae6fd;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 4px;font-size:14px;color:#0369a1;font-weight:600;">🔄 Translation in progress</p>
        <p style="margin:0;font-size:13px;color:#0c4a6e;">Once your certified translation is complete, you'll receive an email with the document ready to download.</p>
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;margin-top:16px;">
      <tr><td style="padding:12px 20px;">
        <table cellpadding="0" cellspacing="0" style="width:100%;">
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Document</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${data.docName}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Alpha Project</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">#${data.alphaProjectNumber}</td></tr>
        </table>
      </td></tr>
    </table>
    ${ctaButton('Track status', DASHBOARD_URL)}
  `);
}

export function buildDocReadyHtml(data: {
  name: string; docName: string;
}): string {
  return layout(`
    <h2 style="margin:0 0 8px;color:#1e3a5f;font-size:20px;">Your certified translation is ready!</h2>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;">Hi${data.name ? ', ' + data.name : ''}! Great news — your certified translation is complete and available for download.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f0fdf4;border-radius:6px;border:1px solid #bbf7d0;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 4px;font-size:14px;color:#166534;font-weight:600;">✅ Ready to download</p>
        <p style="margin:0;font-size:13px;color:#14532d;">Visit your dashboard to download your translated and certified document.</p>
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;margin-top:16px;">
      <tr><td style="padding:12px 20px;">
        <table cellpadding="0" cellspacing="0" style="width:100%;">
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Document</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${data.docName}</td></tr>
        </table>
      </td></tr>
    </table>
    ${ctaButton('Download document', DASHBOARD_URL)}
  `);
}

export function buildStatusUpdateHtml(data: {
  name: string; docName: string; status: string; statusBody: string;
}): string {
  const enStatus = STATUS_LABELS[data.status]?.enStatus || data.status;
  return layout(`
    <h2 style="margin:0 0 8px;color:#1e3a5f;font-size:20px;">Update: ${enStatus}</h2>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;">Hi${data.name ? ', ' + data.name : ''}! There's an update on your translation status.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f0f9ff;border-radius:6px;border:1px solid #bae6fd;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 4px;font-size:14px;color:#0369a1;font-weight:600;">${enStatus}</p>
        <p style="margin:0;font-size:13px;color:#0c4a6e;">${data.statusBody}</p>
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;margin-top:16px;">
      <tr><td style="padding:12px 20px;">
        <table cellpadding="0" cellspacing="0" style="width:100%;">
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Document</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${data.docName}</td></tr>
        </table>
      </td></tr>
    </table>
    ${ctaButton('View progress', DASHBOARD_URL)}
  `);
}

export const STATUS_LABELS: Record<string, { subject: string; body: string; enStatus: string }> = {
  'Em Análise':      { subject: 'Document received and under review', body: 'Your translation has been received and will begin shortly.', enStatus: 'Under Review' },
  'Em Tradução':     { subject: 'Your document is being translated', body: 'Our translator has started working on your document.', enStatus: 'In Translation' },
  'Em Certificação': { subject: 'Document in certification process', body: 'The translation is complete and is being certified.', enStatus: 'In Certification' },
  'Finalizado':      { subject: 'Your certified translation is ready', body: 'Your translated and certified document is available in your dashboard.', enStatus: 'Completed' },
};

export function sendEmail(adminClient: any, to: string, subject: string, html: string): void {
  adminClient.functions
    .invoke('send-email', { body: { to, subject, html } })
    .catch((err: any) => console.error('[translation-emails] send-email failed:', err?.message));
}

export async function fetchUserContext(adminClient: any, userId: string): Promise<{ email: string; name: string }> {
  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('full_name, email')
    .eq('user_id', userId)
    .maybeSingle();
  if (profile?.email) return { email: profile.email, name: profile.full_name || '' };

  try {
    const { data: authUser } = await adminClient.auth.admin.getUserById(userId);
    return { email: authUser?.user?.email || '', name: '' };
  } catch {
    return { email: '', name: '' };
  }
}

export function sendAdminOrderCompletedEmail(
  adminClient: any,
  orderId: string,
  userId: string,
  supportEmail: string,
): void {
  (async () => {
    try {
      if (!supportEmail) return;
      const { data: order } = await adminClient.from('translation_orders').select('original_filename').eq('id', orderId).maybeSingle();
      const user = await fetchUserContext(adminClient, userId);
      sendEmail(adminClient, supportEmail,
        `Translation Order Completed — #${orderId.slice(0, 8)}`,
        buildAdminOrderCompletedHtml({ studentEmail: user.email, docName: order?.original_filename || 'Document', orderId }),
      );
    } catch (err: any) {
      console.error('[translation-emails] sendAdminOrderCompletedEmail failed:', err?.message);
    }
  })();
}
