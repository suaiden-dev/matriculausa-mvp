// @ts-ignore
declare const Deno: any;

const DASHBOARD_URL = 'https://matriculausa.com/student/dashboard/translations';
const ADMIN_TRANSLATIONS_URL = 'https://matriculausa.com/admin/dashboard/translations';
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

function methodLabel(method: string): string {
  if (method === 'stripe') return 'Credit card';
  if (method === 'zelle') return 'Zelle';
  if (method === 'parcelow') return 'Parcelow (installments)';
  return method;
}

// ─── HTML builders ────────────────────────────────────────────────────────────

function buildPaymentConfirmedHtml(data: {
  name: string; docName: string; amount: number; method: string; orderId: string;
}): string {
  return layout(`
    <h2 style="margin:0 0 8px;color:#1e3a5f;font-size:20px;">Payment confirmed!</h2>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;">Hi${data.name ? ', ' + data.name : ''}! Your payment has been approved and your translation is now underway.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 8px;font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Order summary</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;">
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Document</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${data.docName}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Amount</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">US$ ${data.amount.toFixed(2)}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Method</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${methodLabel(data.method)}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Order</td><td style="padding:4px 0;font-size:13px;color:#6b7280;text-align:right;">#${data.orderId.slice(0, 8)}</td></tr>
        </table>
      </td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:14px;color:#374151;">You'll receive an email when your certified translation is ready.</p>
    ${ctaButton('View my order', DASHBOARD_URL)}
  `);
}

function buildZelleReceivedHtml(data: {
  name: string; amount: number; orderId: string;
}): string {
  return layout(`
    <h2 style="margin:0 0 8px;color:#1e3a5f;font-size:20px;">Payment proof received</h2>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;">Hi${data.name ? ', ' + data.name : ''}! We've received your Zelle proof and are reviewing your payment.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#fffbeb;border-radius:6px;border:1px solid #fde68a;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 4px;font-size:14px;color:#92400e;font-weight:600;">⏱ Under review</p>
        <p style="margin:0;font-size:13px;color:#78350f;">Estimated approval time: up to 24 business hours. You'll receive a confirmation email once your payment is approved.</p>
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;margin-top:16px;">
      <tr><td style="padding:12px 20px;">
        <table cellpadding="0" cellspacing="0" style="width:100%;">
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Declared amount</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">US$ ${data.amount.toFixed(2)}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Order</td><td style="padding:4px 0;font-size:13px;color:#6b7280;text-align:right;">#${data.orderId.slice(0, 8)}</td></tr>
        </table>
      </td></tr>
    </table>
    ${ctaButton('View my order', DASHBOARD_URL)}
  `);
}

function buildSentToAlphaHtml(data: {
  name: string; docName: string; alphaProjectNumber: string | number; orderId: string;
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

function buildDocReadyHtml(data: {
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

function buildStatusUpdateHtml(data: {
  name: string; docName: string; status: string; statusBody: string;
}): string {
  return layout(`
    <h2 style="margin:0 0 8px;color:#1e3a5f;font-size:20px;">Update: ${data.status}</h2>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;">Hi${data.name ? ', ' + data.name : ''}! There's an update on your translation status.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f0f9ff;border-radius:6px;border:1px solid #bae6fd;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 4px;font-size:14px;color:#0369a1;font-weight:600;">${data.status}</p>
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

function buildAdminNewOrderHtml(data: {
  studentEmail: string; docName: string; amount: number; method: string; orderId: string;
}): string {
  return layout(`
    <h2 style="margin:0 0 8px;color:#1e3a5f;font-size:20px;">New translation order</h2>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;">A new translation order has been paid and is awaiting submission to Alpha.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
      <tr><td style="padding:16px 20px;">
        <table cellpadding="0" cellspacing="0" style="width:100%;">
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Student</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${data.studentEmail}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Document</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${data.docName}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Amount</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">US$ ${data.amount.toFixed(2)}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Method</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${methodLabel(data.method)}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Order ID</td><td style="padding:4px 0;font-size:13px;color:#6b7280;text-align:right;">${data.orderId}</td></tr>
        </table>
      </td></tr>
    </table>
    ${ctaButton('View in admin dashboard', ADMIN_TRANSLATIONS_URL)}
  `);
}

function buildAdminPendingZelleHtml(data: {
  studentEmail: string; docName: string; amount: number; orderId: string;
}): string {
  return layout(`
    <h2 style="margin:0 0 8px;color:#1e3a5f;font-size:20px;">Pending Zelle Verification</h2>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;">A student has uploaded a Zelle receipt for a translation order. Please verify it.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
      <tr><td style="padding:16px 20px;">
        <table cellpadding="0" cellspacing="0" style="width:100%;">
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Student</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${data.studentEmail}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Document</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${data.docName}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Amount Declared</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">US$ ${data.amount.toFixed(2)}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Order ID</td><td style="padding:4px 0;font-size:13px;color:#6b7280;text-align:right;">${data.orderId}</td></tr>
        </table>
      </td></tr>
    </table>
    ${ctaButton('Review payment', 'https://matriculausa.com/admin/dashboard/payments')}
  `);
}

function buildAdminOrderCompletedHtml(data: {
  studentEmail: string; docName: string; orderId: string;
}): string {
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

// ─── Low-level send ────────────────────────────────────────────────────────────

function sendEmail(adminClient: any, to: string, subject: string, html: string): void {
  adminClient.functions
    .invoke('send-email', { body: { to, subject, html } })
    .catch((err: any) => console.error('[translation-emails] send-email failed:', err?.message));
}

// ─── High-level fire-and-forget senders ───────────────────────────────────────

async function fetchOrderContext(adminClient: any, orderId: string): Promise<{
  originalFilename: string;
  totalPrice: number;
  paymentMethod: string;
  userId: string;
}> {
  const { data } = await adminClient
    .from('translation_orders')
    .select('original_filename, total_price, payment_method, user_id')
    .eq('id', orderId)
    .single();
  return {
    originalFilename: data?.original_filename || 'Document',
    totalPrice: data?.total_price || 0,
    paymentMethod: data?.payment_method || 'stripe',
    userId: data?.user_id || '',
  };
}

async function fetchUserContext(adminClient: any, userId: string): Promise<{
  email: string;
  name: string;
}> {
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

export function sendPaymentConfirmedEmails(
  adminClient: any,
  orderId: string,
  method: string,
  supportEmail: string,
  overrideAmount?: number,
): void {
  (async () => {
    try {
      const order = await fetchOrderContext(adminClient, orderId);
      const user = await fetchUserContext(adminClient, order.userId);
      const amount = overrideAmount ?? order.totalPrice;
      if (user.email) {
        sendEmail(adminClient, user.email,
          'Your translation order has been confirmed — Matricula USA',
          buildPaymentConfirmedHtml({ name: user.name, docName: order.originalFilename, amount, method, orderId }),
        );
      }
      if (supportEmail) {
        sendEmail(adminClient, supportEmail,
          `New translation order — #${orderId.slice(0, 8)}`,
          buildAdminNewOrderHtml({ studentEmail: user.email, docName: order.originalFilename, amount, method, orderId }),
        );
      }
    } catch (err: any) {
      console.error('[translation-emails] sendPaymentConfirmedEmails failed:', err?.message);
    }
  })();
}

export function sendZelleReceivedEmail(
  adminClient: any,
  orderId: string,
  userId: string,
  amount: number,
): void {
  (async () => {
    try {
      const user = await fetchUserContext(adminClient, userId);
      if (user.email) {
        sendEmail(adminClient, user.email,
          'Zelle proof received — under review',
          buildZelleReceivedHtml({ name: user.name, amount, orderId }),
        );
      }
    } catch (err: any) {
      console.error('[translation-emails] sendZelleReceivedEmail failed:', err?.message);
    }
  })();
}

export function sendSentToAlphaEmail(
  adminClient: any,
  orderId: string,
  userId: string,
  docName: string,
  alphaProjectNumber: string | number,
  studentEmail?: string,
): void {
  (async () => {
    try {
      let email = studentEmail || '';
      let name = '';
      if (!email) {
        const user = await fetchUserContext(adminClient, userId);
        email = user.email;
        name = user.name;
      }
      if (email) {
        sendEmail(adminClient, email,
          'Your document has been sent for translation — Matricula USA',
          buildSentToAlphaHtml({ name, docName, alphaProjectNumber, orderId }),
        );
      }
    } catch (err: any) {
      console.error('[translation-emails] sendSentToAlphaEmail failed:', err?.message);
    }
  })();
}

export function sendAdminPendingZelleEmail(
  adminClient: any,
  orderId: string,
  userId: string,
  amount: number,
  supportEmail: string,
): void {
  (async () => {
    try {
      if (!supportEmail) return;
      const order = await fetchOrderContext(adminClient, orderId);
      const user = await fetchUserContext(adminClient, userId);
      sendEmail(adminClient, supportEmail,
        `Pending Zelle Verification — #${orderId.slice(0, 8)}`,
        buildAdminPendingZelleHtml({ studentEmail: user.email, docName: order.originalFilename, amount, orderId }),
      );
    } catch (err: any) {
      console.error('[translation-emails] sendAdminPendingZelleEmail failed:', err?.message);
    }
  })();
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
      const order = await fetchOrderContext(adminClient, orderId);
      const user = await fetchUserContext(adminClient, userId);
      sendEmail(adminClient, supportEmail,
        `Translation Order Completed — #${orderId.slice(0, 8)}`,
        buildAdminOrderCompletedHtml({ studentEmail: user.email, docName: order.originalFilename, orderId }),
      );
    } catch (err: any) {
      console.error('[translation-emails] sendAdminOrderCompletedEmail failed:', err?.message);
    }
  })();
}

const STATUS_LABELS: Record<string, { subject: string; body: string, enStatus?: string }> = {
  'Em Análise':      { subject: 'Document received and under review', body: 'Your translation has been received and will begin shortly.', enStatus: 'Under Review' },
  'Em Tradução':     { subject: 'Your document is being translated', body: 'Our translator has started working on your document.', enStatus: 'In Translation' },
  'Em Certificação': { subject: 'Document in certification process', body: 'The translation is complete and is being certified.', enStatus: 'In Certification' },
  'Finalizado':      { subject: 'Your certified translation is ready', body: 'Your translated and certified document is available in your dashboard.', enStatus: 'Completed' },
};

export { 
  STATUS_LABELS, 
  buildDocReadyHtml, 
  buildStatusUpdateHtml, 
  sendEmail, 
  fetchUserContext,
  sendAdminPendingZelleEmail,
  sendAdminOrderCompletedEmail
};
