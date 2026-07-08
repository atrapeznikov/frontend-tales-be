export interface PasswordResetEmailData {
  displayName: string;
  resetUrl: string;
  frontendUrl: string;
  expiresIn?: string;
  lang?: 'en' | 'ru';
}

export function getPasswordResetTemplate(data: PasswordResetEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const { displayName, resetUrl, frontendUrl } = data;
  const lang = data.lang === 'ru' ? 'ru' : 'en';
  const isRu = lang === 'ru';
  const expiresIn = data.expiresIn ?? (isRu ? '30 минут' : '30 minutes');

  const subject = isRu
    ? 'Сброс пароля — Frontend Tales'
    : 'Reset your password — Frontend Tales';

  const greeting = isRu ? `Привет, ${displayName}!` : `Hey ${displayName},`;

  const intro = isRu
    ? 'Мы получили запрос на сброс пароля для вашей учётной записи Frontend Tales. Нажмите кнопку ниже, чтобы задать новый пароль.'
    : 'We received a request to reset the password for your Frontend Tales account. Click the button below to choose a new password.';

  const buttonText = isRu ? 'Сбросить пароль' : 'Reset Password';

  const expiryNotice = isRu
    ? `Ссылка действительна в течение ${expiresIn}.`
    : `This link is valid for ${expiresIn}.`;

  const fallback = isRu
    ? 'Если кнопка не работает, скопируйте и вставьте этот адрес в браузер:'
    : "If the button doesn't work, copy and paste this URL into your browser:";

  const ignoreNotice = isRu
    ? 'Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо — ваш пароль останется без изменений.'
    : 'If you did not request a password reset, you can safely ignore this email — your password will remain unchanged.';

  const signOff = isRu
    ? 'С наилучшими пожеланиями,<br><strong>Команда Frontend Tales</strong>'
    : 'Cheers,<br><strong>The Frontend Tales Team</strong>';

  const sentReason = isRu
    ? `Вы получили это письмо, так как был сделан запрос на сброс пароля на сайте <a href="${frontendUrl}" class="footer-link">frontendtales.ru</a>.`
    : `This email was sent to you because a password reset was requested at <a href="${frontendUrl}" class="footer-link">frontendtales.ru</a>.`;

  const copyright = isRu
    ? `&copy; ${new Date().getFullYear()} Frontend Tales. Все права защищены.`
    : `&copy; ${new Date().getFullYear()} Frontend Tales. All rights reserved.`;

  const html = `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      background-color: #f8fafc;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: collapse;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f8fafc;
      padding-top: 40px;
      padding-bottom: 40px;
    }
    .content-table {
      width: 100%;
      max-width: 600px;
      table-layout: fixed;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #08080cff 0%, rgba(12, 11, 37, 1) 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.025em;
    }
    .body-content {
      padding: 40px 30px;
      color: #1e293b;
    }
    .welcome-text {
      font-size: 20px;
      font-weight: 600;
      margin-top: 0;
      margin-bottom: 16px;
      color: #0f172a;
    }
    .paragraph {
      font-size: 16px;
      line-height: 1.6;
      margin-top: 0;
      margin-bottom: 24px;
      color: #334155;
    }
    .cta-container {
      text-align: center;
      margin: 32px 0;
    }
    .cta-button {
      display: inline-block;
      background-color: #08080cff;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 30px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      transition: background-color 0.2s ease;
    }
    .url-fallback {
      font-size: 13px;
      line-height: 1.5;
      color: #4f46e5;
      word-break: break-all;
      overflow-wrap: break-word;
      margin-top: 0;
      margin-bottom: 24px;
    }
    .footer {
      background-color: #f1f5f9;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer-text {
      font-size: 13px;
      color: #64748b;
      margin: 0;
      line-height: 1.5;
    }
    .footer-link {
      color: #4f46e5;
      text-decoration: none;
      font-weight: 500;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; background-color: #f8fafc;">
  <center class="wrapper" style="width: 100%; table-layout: fixed; background-color: #f8fafc; padding-top: 40px; padding-bottom: 40px;">
    <table class="content-table" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; max-width: 600px; table-layout: fixed; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
      <!-- HEADER -->
      <tr>
        <td class="header" style="background: #08080c; padding: 40px 20px; text-align: center;">
          <div style="margin-bottom: 16px;">
            <img src="cid:avatar" alt="Logo" style="width: 70px; height: 70px; border-radius: 50%; border: 3px solid #ffffff; display: inline-block; vertical-align: middle; object-fit: cover;" />
          </div>
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800;">Frontend Tales</h1>
        </td>
      </tr>
      <!-- BODY -->
      <tr>
        <td class="body-content" style="padding: 40px 30px; color: #1e293b; word-break: break-word; overflow-wrap: break-word;">
          <p class="welcome-text">${greeting}</p>
          <p class="paragraph">
            ${intro}
          </p>
          <div class="cta-container">
            <a href="${resetUrl}" class="cta-button" target="_blank">${buttonText}</a>
          </div>
          <p class="paragraph" style="margin-bottom: 8px;">
            ${fallback}
          </p>
          <p class="url-fallback" style="max-width: 100%; word-break: break-all; overflow-wrap: break-word;">
            <a href="${resetUrl}" class="footer-link" style="max-width: 100%; word-break: break-all; overflow-wrap: break-word;">${resetUrl}</a>
          </p>
          <p class="paragraph">
            ${expiryNotice}
          </p>
          <p class="paragraph">
            ${ignoreNotice}
          </p>
          <p class="paragraph" style="margin-bottom: 0;">
            ${signOff}
          </p>
        </td>
      </tr>
      <!-- FOOTER -->
      <tr>
        <td class="footer">
          <p class="footer-text" style="margin-bottom: 8px;">
            ${sentReason}
          </p>
          <p class="footer-text">
            ${copyright}
          </p>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>
  `.trim();

  const textIntro = isRu
    ? `Привет, ${displayName}!\n\nМы получили запрос на сброс пароля для вашей учётной записи Frontend Tales. Перейдите по ссылке ниже, чтобы задать новый пароль:`
    : `Hey ${displayName},\n\nWe received a request to reset the password for your Frontend Tales account. Open the link below to choose a new password:`;

  const textFooter = isRu
    ? `${expiryNotice}\n\nЕсли вы не запрашивали сброс пароля, просто проигнорируйте это письмо.\n\nС наилучшими пожеланиями,\nКоманда Frontend Tales`
    : `${expiryNotice}\n\nIf you did not request a password reset, you can safely ignore this email.\n\nCheers,\nThe Frontend Tales Team`;

  const text = `
${textIntro}

${resetUrl}

${textFooter}
  `.trim();

  return { subject, html, text };
}
