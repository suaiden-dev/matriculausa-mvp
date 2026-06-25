import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Days before due date on which reminder emails are sent
const REMINDER_DAYS = [20, 13, 6, 0];

interface StudentRecord {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  placement_fee_pending_balance: number | null;
  placement_fee_due_date: string;
}

/**
 * Returns how many full days remain until the installment due date (UTC).
 * Returns 0 if due today, negative if already overdue.
 */
function diffInDays(dueDateStr: string): number {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dueDate = new Date(dueDateStr);
  dueDate.setUTCHours(0, 0, 0, 0);
  return Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function buildStudentSubject(daysUntilDue: number): string {
  if (daysUntilDue < 0) {
    return '⚠️ IMPORTANT: Your Placement Fee installment is overdue';
  }
  const map: Record<number, string> = {
    20: '⏰ Reminder: Your Placement Fee installment is due in 20 days',
    13: '⏰ Reminder: Your Placement Fee installment is due in 13 days',
    6:  '⚠️ Urgent: Your Placement Fee installment is due in 6 days',
    0:  '🔴 Final Notice: Your Placement Fee installment is due TODAY',
  };
  return map[daysUntilDue] ?? 'Installment Reminder — Matrícula USA';
}

function buildStudentEmailHtml(student: StudentRecord, daysUntilDue: number): string {
  const pendingAmount = Number(student.placement_fee_pending_balance ?? 0);
  const formattedAmount = formatCurrency(pendingAmount);
  const formattedDate = formatDate(student.placement_fee_due_date);
  const studentName = student.full_name ?? 'Student';
  const siteUrl = Deno.env.get('SITE_URL') || 'https://matriculausa.com';

  let urgencyLine = '';
  if (daysUntilDue < 0) {
    const daysOverdue = -daysUntilDue;
    urgencyLine = `Your installment is overdue by <strong>${daysOverdue} day${daysOverdue > 1 ? 's' : ''}</strong> (due on ${formattedDate}). Please settle the payment to avoid suspension or block of your access.`;
  } else if (daysUntilDue === 0) {
    urgencyLine = 'Your installment is due <strong>today</strong>. Please submit payment to avoid suspension of your access.';
  } else {
    urgencyLine = `Your installment is due in <strong>${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}</strong> (${formattedDate}).`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Installment Reminder — Matrícula USA</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9; color: #333; }
    .wrapper { max-width: 600px; margin: 0 auto; background-color: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .header { background-color: #0052cc; padding: 20px; text-align: center; }
    .header img { max-width: 120px; height: auto; }
    .content { padding: 30px 20px; line-height: 1.6; }
    .content p { margin-bottom: 15px; }
    .amount-box { background-color: #fff8e1; border: 2px solid #f59e0b; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0; }
    .amount-box .amount { font-size: 28px; font-weight: bold; color: #b45309; }
    .amount-box .due-date { font-size: 13px; color: #78350f; margin-top: 6px; }
    .btn-cta { display: inline-block; padding: 12px 24px; background-color: #0052cc; color: #ffffff !important; font-weight: bold; text-decoration: none; border-radius: 5px; margin: 15px 0; }
    .footer { padding: 15px; background-color: #f0f0f0; text-align: center; font-size: 12px; color: #777; }
    a { color: #0052cc; text-decoration: none; }
    @media screen and (max-width: 600px) { .wrapper { width: 100% !important; } }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <img src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/university-profile-pictures/fb5651f1-66ed-4a9f-ba61-96c50d348442/logo%20matriculaUSA.jpg" alt="Matrícula USA">
    </div>
    <div class="content">
      <p>Hello, <strong>${studentName}</strong>,</p>
      <p>${urgencyLine}</p>
      <p>To maintain access to your dashboard and ensure the release of your final documents, please make the payment for the pending installment via <strong>Zelle</strong> through your student dashboard:</p>
      <div class="amount-box">
        <div style="font-size: 14px; color: #78350f; margin-bottom: 4px;">Installment Amount</div>
        <div class="amount">${formattedAmount}</div>
        <div class="due-date">Due Date: ${formattedDate}</div>
      </div>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${siteUrl}/student/onboarding" target="_blank" class="btn-cta">Access My Dashboard and Pay</a>
      </div>
      <p>If the button above does not work, copy and paste this link into your browser:<br>
        <a href="${siteUrl}/student/onboarding">${siteUrl}/student/onboarding</a>
      </p>
      <p><strong>Please do not reply to this email.</strong></p>
      <br>
      <p>Best regards,<br>
        <strong>Matrícula USA Team</strong><br>
        <a href="https://matriculausa.com/">https://matriculausa.com/</a>
      </p>
    </div>
    <div class="footer">
      You are receiving this email because you have a pending installment on the Matrícula USA platform. This is an automated notification.
    </div>
  </div>
</body>
</html>`;
}

function buildTeamEmailHtml(memberName: string, overdueStudents: StudentRecord[]): string {
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
  });

  const rows = overdueStudents.map((s) => {
    const amount = formatCurrency(Number(s.placement_fee_pending_balance ?? 0));
    return `<tr>
      <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0;">${s.full_name ?? '—'}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0;">${s.email ?? '—'}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #b91c1c;">${amount}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Installments Due Today — Matrícula USA</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9; color: #333; }
    .wrapper { max-width: 700px; margin: 0 auto; background-color: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .header { background-color: #dc2626; padding: 20px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 20px; }
    .header p { margin: 6px 0 0; font-size: 14px; opacity: 0.9; }
    .content { padding: 30px 20px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background-color: #f1f5f9; padding: 10px 8px; text-align: left; border-bottom: 2px solid #e2e8f0; font-size: 13px; }
    .footer { padding: 15px; background-color: #f0f0f0; text-align: center; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🔴 Installments Due Today</h1>
      <p>${todayFormatted}</p>
    </div>
    <div class="content">
      <p>Hello, <strong>${memberName}</strong>,</p>
      <p>The following students have a <strong>Placement Fee installment due today</strong> and have not completed their payment yet:</p>
      <table>
        <thead>
          <tr>
            <th>Student Name</th>
            <th>Email</th>
            <th>Pending Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top: 20px;">Please contact these students to follow up on the payment settlement.</p>
      <br>
      <p>Best regards,<br><strong>Matrícula USA System</strong></p>
    </div>
    <div class="footer">This is an automated notification generated daily by the system.</div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];            // 'YYYY-MM-DD'

    console.log(`[notify-installment-due] Running checker...`);

    // 1. Fetch students with active installment, valid due date, and pending balance
    const { data: students, error: studentsError } = await adminClient
      .from('user_profiles')
      .select('id, user_id, full_name, email, placement_fee_pending_balance, placement_fee_due_date')
      .eq('placement_fee_installment_enabled', true)
      .not('placement_fee_due_date', 'is', null)
      .gt('placement_fee_pending_balance', 0);

    if (studentsError) {
      console.error('[notify-installment-due] Error fetching students:', studentsError.message);
      return new Response(JSON.stringify({ error: studentsError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const eligibleStudents = (students ?? []) as StudentRecord[];
    console.log(`[notify-installment-due] ${eligibleStudents.length} student(s) in window`);

    const overdueToday: StudentRecord[] = [];
    let notifiedStudents = 0;

    // 2. For each student, check if today matches a reminder milestone
    for (const student of eligibleStudents) {
      if (!student.email || !student.placement_fee_due_date) continue;

      const daysUntilDue = diffInDays(student.placement_fee_due_date);
      console.log(`[notify-installment-due] ${student.email}: ${daysUntilDue}d until due`);

      const isUpcomingReminder = REMINDER_DAYS.includes(daysUntilDue);
      const isOverdueReminder = daysUntilDue < 0 && (-daysUntilDue) % 7 === 0;

      if (!isUpcomingReminder && !isOverdueReminder) continue;

      // Send async reminder to student (fire-and-forget, same pattern as invite-seller)
      adminClient.functions.invoke('send-email', {
        body: {
          to: student.email,
          subject: buildStudentSubject(daysUntilDue),
          html: buildStudentEmailHtml(student, daysUntilDue),
        },
      }).then(({ error: emailError }: { error: any }) => {
        if (emailError) {
          console.error(`[notify-installment-due] Failed to send reminder to ${student.email}:`, emailError);
        } else {
          const label = daysUntilDue < 0 ? `overdue ${-daysUntilDue}d` : `${daysUntilDue}d`;
          console.log(`[notify-installment-due] Reminder (${label}) sent to ${student.email}`);

          const description = daysUntilDue < 0
            ? `Installment reminder sent — overdue by ${-daysUntilDue} day(s) (due: ${formatDate(student.placement_fee_due_date)})`
            : daysUntilDue === 0
              ? `Installment reminder sent — due TODAY (${formatDate(student.placement_fee_due_date)})`
              : `Installment reminder sent — due in ${daysUntilDue} day(s) (${formatDate(student.placement_fee_due_date)})`;

          adminClient.rpc('log_student_action', {
            p_student_id: student.id,
            p_action_type: 'installment_reminder_sent',
            p_action_description: description,
            p_performed_by: student.user_id,
            p_performed_by_type: 'system',
            p_metadata: {
              days_until_due: daysUntilDue,
              amount_pending: student.placement_fee_pending_balance,
              due_date: student.placement_fee_due_date,
              email_sent_to: student.email,
              overdue: daysUntilDue < 0,
            },
          }).catch((logErr: any) => {
            console.error(`[notify-installment-due] Failed to log activity for ${student.email}:`, logErr);
          });
        }
      }).catch((e: any) => {
        console.error(`[notify-installment-due] Unexpected error sending to ${student.email}:`, e);
      });

      notifiedStudents++;

      if (daysUntilDue === 0) {
        overdueToday.push(student);
      }
    }

    // 3. If any student is overdue today, alert every post_sales team member
    let teamNotified = 0;
    if (overdueToday.length > 0) {
      const { data: team, error: teamError } = await adminClient
        .from('user_profiles')
        .select('email, full_name')
        .eq('role', 'post_sales')
        .not('email', 'is', null);

      if (teamError) {
        console.error('[notify-installment-due] Error fetching post_sales team:', teamError.message);
      } else {
        for (const member of team ?? []) {
          if (!member.email) continue;

          adminClient.functions.invoke('send-email', {
            body: {
              to: member.email,
              subject: `🔴 [Matrícula USA] ${overdueToday.length} student(s) with installment due today`,
              html: buildTeamEmailHtml(member.full_name ?? 'Post-Sales Team', overdueToday),
            },
          }).then(({ error: emailError }: { error: any }) => {
            if (emailError) {
              console.error(`[notify-installment-due] Failed to send team alert to ${member.email}:`, emailError);
            } else {
              console.log(`[notify-installment-due] Team alert sent to ${member.email}`);
            }
          }).catch((e: any) => {
            console.error(`[notify-installment-due] Unexpected error sending team alert:`, e);
          });

          teamNotified++;
        }
      }
    }

    const summary = {
      success: true,
      notified_students: notifiedStudents,
      team_notified: teamNotified,
      overdue_today: overdueToday.length,
      processed_at: new Date().toISOString(),
    };

    console.log('[notify-installment-due] Completed:', summary);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[notify-installment-due] Unexpected error:', e);
    return new Response(JSON.stringify({ error: e.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
