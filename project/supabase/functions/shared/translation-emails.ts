// @ts-ignore
declare const Deno: any;

const DASHBOARD_URL = 'https://matriculausa.com/student/dashboard/translations';
const ADMIN_TRANSLATIONS_URL = 'https://matriculausa.com/admin/dashboard/translations';

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Matricula USA</title></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#1e3a5f;padding:24px 32px;">
          <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Matricula USA</span>
        </td></tr>
        <tr><td style="padding:32px;">
          ${content}
        </td></tr>
        <tr><td style="background:#f5f7fa;padding:20px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
            Você está recebendo este email porque realizou um pedido de tradução no Matricula USA.<br>
            Dúvidas? Responda este email ou acesse <a href="https://matriculausa.com" style="color:#1e3a5f;">matriculausa.com</a>.
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
  if (method === 'stripe') return 'Cartão de crédito';
  if (method === 'zelle') return 'Zelle';
  if (method === 'parcelow') return 'Parcelow (parcelado)';
  return method;
}

// ─── HTML builders ────────────────────────────────────────────────────────────

function buildPaymentConfirmedHtml(data: {
  name: string; docName: string; amount: number; method: string; orderId: string;
}): string {
  return layout(`
    <h2 style="margin:0 0 8px;color:#1e3a5f;font-size:20px;">Pagamento confirmado!</h2>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;">Olá${data.name ? ', ' + data.name : ''}! Seu pagamento foi aprovado e a tradução foi iniciada.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 8px;font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Resumo do pedido</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;">
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Documento</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${data.docName}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Valor</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">US$ ${data.amount.toFixed(2)}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Método</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${methodLabel(data.method)}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Pedido</td><td style="padding:4px 0;font-size:13px;color:#6b7280;text-align:right;">#${data.orderId.slice(0, 8)}</td></tr>
        </table>
      </td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:14px;color:#374151;">Você receberá um email quando a tradução certificada estiver pronta.</p>
    ${ctaButton('Ver meu pedido', DASHBOARD_URL)}
  `);
}

function buildZelleReceivedHtml(data: {
  name: string; amount: number; orderId: string;
}): string {
  return layout(`
    <h2 style="margin:0 0 8px;color:#1e3a5f;font-size:20px;">Comprovante recebido</h2>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;">Olá${data.name ? ', ' + data.name : ''}! Recebemos seu comprovante Zelle e estamos analisando o pagamento.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#fffbeb;border-radius:6px;border:1px solid #fde68a;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 4px;font-size:14px;color:#92400e;font-weight:600;">⏱ Em análise</p>
        <p style="margin:0;font-size:13px;color:#78350f;">Prazo estimado de aprovação: até 24 horas úteis. Você receberá um email de confirmação assim que o pagamento for aprovado.</p>
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;margin-top:16px;">
      <tr><td style="padding:12px 20px;">
        <table cellpadding="0" cellspacing="0" style="width:100%;">
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Valor declarado</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">US$ ${data.amount.toFixed(2)}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Pedido</td><td style="padding:4px 0;font-size:13px;color:#6b7280;text-align:right;">#${data.orderId.slice(0, 8)}</td></tr>
        </table>
      </td></tr>
    </table>
    ${ctaButton('Ver meu pedido', DASHBOARD_URL)}
  `);
}

function buildSentToAlphaHtml(data: {
  name: string; docName: string; alphaProjectNumber: string | number; orderId: string;
}): string {
  return layout(`
    <h2 style="margin:0 0 8px;color:#1e3a5f;font-size:20px;">Documento enviado para tradução</h2>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;">Olá${data.name ? ', ' + data.name : ''}! Seu documento foi enviado para nossa equipe de tradução certificada.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f0f9ff;border-radius:6px;border:1px solid #bae6fd;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 4px;font-size:14px;color:#0369a1;font-weight:600;">🔄 Tradução em andamento</p>
        <p style="margin:0;font-size:13px;color:#0c4a6e;">Assim que a tradução certificada estiver concluída, você receberá um email com o documento pronto para download.</p>
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;margin-top:16px;">
      <tr><td style="padding:12px 20px;">
        <table cellpadding="0" cellspacing="0" style="width:100%;">
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Documento</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${data.docName}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Projeto Alpha</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">#${data.alphaProjectNumber}</td></tr>
        </table>
      </td></tr>
    </table>
    ${ctaButton('Acompanhar status', DASHBOARD_URL)}
  `);
}

function buildDocReadyHtml(data: {
  name: string; docName: string;
}): string {
  return layout(`
    <h2 style="margin:0 0 8px;color:#1e3a5f;font-size:20px;">Sua tradução certificada está pronta!</h2>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;">Olá${data.name ? ', ' + data.name : ''}! Ótima notícia — sua tradução certificada foi concluída e está disponível para download.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f0fdf4;border-radius:6px;border:1px solid #bbf7d0;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 4px;font-size:14px;color:#166534;font-weight:600;">✅ Pronto para download</p>
        <p style="margin:0;font-size:13px;color:#14532d;">Acesse seu painel para baixar o documento traduzido e certificado.</p>
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;margin-top:16px;">
      <tr><td style="padding:12px 20px;">
        <table cellpadding="0" cellspacing="0" style="width:100%;">
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Documento</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${data.docName}</td></tr>
        </table>
      </td></tr>
    </table>
    ${ctaButton('Baixar documento', DASHBOARD_URL)}
  `);
}

function buildStatusUpdateHtml(data: {
  name: string; docName: string; status: string; statusBody: string;
}): string {
  return layout(`
    <h2 style="margin:0 0 8px;color:#1e3a5f;font-size:20px;">Atualização: ${data.status}</h2>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;">Olá${data.name ? ', ' + data.name : ''}! Há uma atualização no status da sua tradução.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f0f9ff;border-radius:6px;border:1px solid #bae6fd;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 4px;font-size:14px;color:#0369a1;font-weight:600;">${data.status}</p>
        <p style="margin:0;font-size:13px;color:#0c4a6e;">${data.statusBody}</p>
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;margin-top:16px;">
      <tr><td style="padding:12px 20px;">
        <table cellpadding="0" cellspacing="0" style="width:100%;">
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Documento</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${data.docName}</td></tr>
        </table>
      </td></tr>
    </table>
    ${ctaButton('Ver andamento', DASHBOARD_URL)}
  `);
}

function buildAdminNewOrderHtml(data: {
  studentEmail: string; docName: string; amount: number; method: string; orderId: string;
}): string {
  return layout(`
    <h2 style="margin:0 0 8px;color:#1e3a5f;font-size:20px;">Novo pedido de tradução</h2>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;">Um novo pedido de tradução foi pago e está aguardando envio para a Alpha.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
      <tr><td style="padding:16px 20px;">
        <table cellpadding="0" cellspacing="0" style="width:100%;">
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Aluno</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${data.studentEmail}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Documento</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${data.docName}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Valor</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">US$ ${data.amount.toFixed(2)}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">Método</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${methodLabel(data.method)}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#374151;">ID do pedido</td><td style="padding:4px 0;font-size:13px;color:#6b7280;text-align:right;">${data.orderId}</td></tr>
        </table>
      </td></tr>
    </table>
    ${ctaButton('Ver no painel admin', ADMIN_TRANSLATIONS_URL)}
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
    originalFilename: data?.original_filename || 'Documento',
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
          'Seu pedido de tradução foi confirmado — Matricula USA',
          buildPaymentConfirmedHtml({ name: user.name, docName: order.originalFilename, amount, method, orderId }),
        );
      }
      if (supportEmail) {
        sendEmail(adminClient, supportEmail,
          `Novo pedido de tradução — #${orderId.slice(0, 8)}`,
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
          'Comprovante Zelle recebido — em análise',
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
          'Seu documento foi enviado para tradução — Matricula USA',
          buildSentToAlphaHtml({ name, docName, alphaProjectNumber, orderId }),
        );
      }
    } catch (err: any) {
      console.error('[translation-emails] sendSentToAlphaEmail failed:', err?.message);
    }
  })();
}

const STATUS_LABELS: Record<string, { subject: string; body: string }> = {
  'Em Análise':      { subject: 'Documento recebido e em análise', body: 'Sua tradução foi recebida e será iniciada em breve.' },
  'Em Tradução':     { subject: 'Seu documento está sendo traduzido', body: 'Nosso tradutor já começou a trabalhar no seu documento.' },
  'Em Certificação': { subject: 'Documento em processo de certificação', body: 'A tradução foi concluída e está em processo de certificação.' },
  'Finalizado':      { subject: 'Sua tradução certificada está pronta', body: 'O documento traduzido e certificado está disponível no seu painel.' },
};

export { STATUS_LABELS, buildDocReadyHtml, buildStatusUpdateHtml, sendEmail, fetchUserContext };
