-- ============================================================================
-- ADICIONAR CAMPANHAS COM INTERVALOS MAIORES
-- ============================================================================
-- Esta migration adiciona campanhas de newsletter com intervalos maiores
-- (14 dias, 21 dias, etc.) para usuários que ainda não pagaram ou não aplicaram

-- Campanha: Registered No Payment - 14 dias
INSERT INTO newsletter_campaigns (
  campaign_key,
  name,
  description,
  email_subject_template,
  email_body_template,
  trigger_conditions,
  cooldown_days,
  is_active
) VALUES (
  'registered_no_payment_14d',
  'Registered Without Payment - 14 Days',
  'Sends email to users who registered 14 days ago but have not paid the Selection Process Fee',
  'Complete Your Registration and Start Your Academic Journey in the USA',
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Complete Your Registration</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f9f9f9;
      color: #333;
    }
    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #fff;
    }
    .header {
      background-color: #0052cc;
      padding: 20px;
      text-align: center;
    }
    .header img {
      max-width: 120px;
      height: auto;
    }
    .content {
      padding: 30px 20px;
      line-height: 1.6;
    }
    .content p {
      margin-bottom: 15px;
    }
    .button {
      display: inline-block;
      background-color: #0052cc;
      color: #ffffff !important;
      padding: 15px 30px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      margin: 20px 0;
    }
    .footer {
      padding: 15px;
      background-color: #f0f0f0;
      text-align: center;
      font-size: 12px;
      color: #777;
    }
    @media screen and (max-width:600px) {
      .wrapper {
        width: 100% !important;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <img src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/university-profile-pictures/fb5651f1-66ed-4a9f-ba61-96c50d348442/logo%20matriculaUSA.jpg" alt="Matrícula USA">
    </div>
    <div class="content">
      <p>Hello, {{full_name}}!</p>
      <p>We noticed that you registered on MatriculaUSA 14 days ago, but haven''t completed the Selection Process Fee payment yet.</p>
      <p>This fee is your first step towards starting your academic journey in the United States. By completing it, you will be able to:</p>
      <ul>
        <li>Access our complete scholarship system</li>
        <li>Apply to multiple universities</li>
        <li>Receive full support throughout the entire process</li>
      </ul>
      <p style="text-align: center;">
        <a href="https://matriculausa.com/student/dashboard" class="button" style="color: #ffffff;">Complete Your Registration</a>
      </p>
      <p>If you have any questions, our team is ready to help!</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="font-size: 12px; color: #999;">
        Don''t want to receive these emails anymore? 
        <a href="{{unsubscribe_url}}">Click here to unsubscribe</a>
      </p>
    </div>
    <div class="footer">
      This is an automatic notification from the Matrícula USA system.<br>
      © 2025 Matrícula USA. All rights reserved.
    </div>
  </div>
</body>
</html>',
  '{"type": "registered_no_payment", "days": 14}'::jsonb,
  7,
  true
) ON CONFLICT (campaign_key) DO NOTHING;

-- Campanha: Registered No Payment - 21 dias
INSERT INTO newsletter_campaigns (
  campaign_key,
  name,
  description,
  email_subject_template,
  email_body_template,
  trigger_conditions,
  cooldown_days,
  is_active
) VALUES (
  'registered_no_payment_21d',
  'Registered Without Payment - 21 Days',
  'Sends email to users who registered 21 days ago but have not paid the Selection Process Fee',
  'Don''t Miss Out - Complete Your Registration Today',
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Complete Your Registration</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f9f9f9;
      color: #333;
    }
    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #fff;
    }
    .header {
      background-color: #0052cc;
      padding: 20px;
      text-align: center;
    }
    .header img {
      max-width: 120px;
      height: auto;
    }
    .content {
      padding: 30px 20px;
      line-height: 1.6;
    }
    .content p {
      margin-bottom: 15px;
    }
    .button {
      display: inline-block;
      background-color: #0052cc;
      color: #ffffff !important;
      padding: 15px 30px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      margin: 20px 0;
    }
    .footer {
      padding: 15px;
      background-color: #f0f0f0;
      text-align: center;
      font-size: 12px;
      color: #777;
    }
    @media screen and (max-width:600px) {
      .wrapper {
        width: 100% !important;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <img src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/university-profile-pictures/fb5651f1-66ed-4a9f-ba61-96c50d348442/logo%20matriculaUSA.jpg" alt="Matrícula USA">
    </div>
    <div class="content">
      <p>Hello, {{full_name}}!</p>
      <p>It''s been 21 days since you registered on MatriculaUSA, and we wanted to remind you about the amazing opportunities waiting for you!</p>
      <p>By completing your Selection Process Fee payment, you''ll unlock access to:</p>
      <ul>
        <li>Hundreds of available scholarships</li>
        <li>Multiple university applications</li>
        <li>Personalized support from our team</li>
        <li>Your path to studying in the USA</li>
      </ul>
      <p style="text-align: center;">
        <a href="https://matriculausa.com/student/dashboard" class="button" style="color: #ffffff;">Complete Your Registration</a>
      </p>
      <p>Don''t let this opportunity pass you by. Start your journey today!</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="font-size: 12px; color: #999;">
        Don''t want to receive these emails anymore? 
        <a href="{{unsubscribe_url}}">Click here to unsubscribe</a>
      </p>
    </div>
    <div class="footer">
      This is an automatic notification from the Matrícula USA system.<br>
      © 2025 Matrícula USA. All rights reserved.
    </div>
  </div>
</body>
</html>',
  '{"type": "registered_no_payment", "days": 21}'::jsonb,
  7,
  true
) ON CONFLICT (campaign_key) DO NOTHING;

-- Campanha: Paid No Application - 14 dias
INSERT INTO newsletter_campaigns (
  campaign_key,
  name,
  description,
  email_subject_template,
  email_body_template,
  trigger_conditions,
  cooldown_days,
  is_active
) VALUES (
  'paid_no_application_14d',
  'Paid Without Application - 14 Days',
  'Sends email to users who paid the Selection Process Fee 14 days ago but have not created a scholarship application',
  'Apply for Scholarships and Make Your Academic Dream Come True',
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Apply for Scholarships</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f9f9f9;
      color: #333;
    }
    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #fff;
    }
    .header {
      background-color: #0052cc;
      padding: 20px;
      text-align: center;
    }
    .header img {
      max-width: 120px;
      height: auto;
    }
    .content {
      padding: 30px 20px;
      line-height: 1.6;
    }
    .content p {
      margin-bottom: 15px;
    }
    .button {
      display: inline-block;
      background-color: #0052cc;
      color: #ffffff !important;
      padding: 15px 30px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      margin: 20px 0;
    }
    .footer {
      padding: 15px;
      background-color: #f0f0f0;
      text-align: center;
      font-size: 12px;
      color: #777;
    }
    @media screen and (max-width:600px) {
      .wrapper {
        width: 100% !important;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <img src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/university-profile-pictures/fb5651f1-66ed-4a9f-ba61-96c50d348442/logo%20matriculaUSA.jpg" alt="Matrícula USA">
    </div>
    <div class="content">
      <p>Hello, {{full_name}}!</p>
      <p>Congratulations! You paid the Selection Process Fee 14 days ago and took an important step in your academic journey!</p>
      <p>The next step is to create your scholarship application. With your application, you will be able to:</p>
      <ul>
        <li>Choose from hundreds of available scholarships</li>
        <li>Submit documents for quick AI analysis</li>
        <li>Get your documents analyzed quickly by our AI system</li>
        <li>Receive approval and start your studies in the USA</li>
      </ul>
      <p style="text-align: center;">
        <a href="https://matriculausa.com/student/dashboard" class="button" style="color: #ffffff;">View Available Scholarships</a>
      </p>
      <p>Don''t wait! Scholarships are limited and deadlines may be approaching.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="font-size: 12px; color: #999;">
        Don''t want to receive these emails anymore? 
        <a href="{{unsubscribe_url}}">Click here to unsubscribe</a>
      </p>
    </div>
    <div class="footer">
      This is an automatic notification from the Matrícula USA system.<br>
      © 2025 Matrícula USA. All rights reserved.
    </div>
  </div>
</body>
</html>',
  '{"type": "paid_no_application", "days": 14}'::jsonb,
  7,
  true
) ON CONFLICT (campaign_key) DO NOTHING;

-- Campanha: Paid No Application - 21 dias
INSERT INTO newsletter_campaigns (
  campaign_key,
  name,
  description,
  email_subject_template,
  email_body_template,
  trigger_conditions,
  cooldown_days,
  is_active
) VALUES (
  'paid_no_application_21d',
  'Paid Without Application - 21 Days',
  'Sends email to users who paid the Selection Process Fee 21 days ago but have not created a scholarship application',
  'Time to Take Action - Apply for Scholarships Now',
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Apply for Scholarships</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f9f9f9;
      color: #333;
    }
    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #fff;
    }
    .header {
      background-color: #0052cc;
      padding: 20px;
      text-align: center;
    }
    .header img {
      max-width: 120px;
      height: auto;
    }
    .content {
      padding: 30px 20px;
      line-height: 1.6;
    }
    .content p {
      margin-bottom: 15px;
    }
    .button {
      display: inline-block;
      background-color: #0052cc;
      color: #ffffff !important;
      padding: 15px 30px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      margin: 20px 0;
    }
    .footer {
      padding: 15px;
      background-color: #f0f0f0;
      text-align: center;
      font-size: 12px;
      color: #777;
    }
    @media screen and (max-width:600px) {
      .wrapper {
        width: 100% !important;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <img src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/university-profile-pictures/fb5651f1-66ed-4a9f-ba61-96c50d348442/logo%20matriculaUSA.jpg" alt="Matrícula USA">
    </div>
    <div class="content">
      <p>Hello, {{full_name}}!</p>
      <p>It''s been 21 days since you paid the Selection Process Fee, and we''re here to help you take the next step!</p>
      <p>You''ve already invested in your future - now it''s time to maximize that investment by applying for scholarships. Here''s what you can do:</p>
      <ul>
        <li>Browse hundreds of available scholarships</li>
        <li>Get your documents analyzed quickly by our AI system</li>
        <li>Apply to multiple universities</li>
        <li>Start your journey to studying in the USA</li>
      </ul>
      <p style="text-align: center;">
        <a href="https://matriculausa.com/student/dashboard" class="button" style="color: #ffffff;">View Available Scholarships</a>
      </p>
      <p>Your academic future is waiting. Don''t let this opportunity slip away!</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="font-size: 12px; color: #999;">
        Don''t want to receive these emails anymore? 
        <a href="{{unsubscribe_url}}">Click here to unsubscribe</a>
      </p>
    </div>
    <div class="footer">
      This is an automatic notification from the Matrícula USA system.<br>
      © 2025 Matrícula USA. All rights reserved.
    </div>
  </div>
</body>
</html>',
  '{"type": "paid_no_application", "days": 21}'::jsonb,
  7,
  true
) ON CONFLICT (campaign_key) DO NOTHING;

-- Atualizar campanhas existentes para incluir trigger_conditions
UPDATE newsletter_campaigns
SET trigger_conditions = '{"type": "registered_no_payment", "days": 2}'::jsonb
WHERE campaign_key = 'registered_no_payment'
  AND (trigger_conditions IS NULL OR trigger_conditions = '{}'::jsonb);

UPDATE newsletter_campaigns
SET trigger_conditions = '{"type": "paid_no_application", "days": 3}'::jsonb
WHERE campaign_key = 'paid_no_application'
  AND (trigger_conditions IS NULL OR trigger_conditions = '{}'::jsonb);

