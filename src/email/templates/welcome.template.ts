export interface WelcomeEmailData {
  displayName: string;
  frontendUrl: string;
  lang?: 'en' | 'ru';
}

export function getWelcomeEmailTemplate(data: WelcomeEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const { displayName, frontendUrl } = data;
  const lang = data.lang === 'ru' ? 'ru' : 'en';
  const isRu = lang === 'ru';

  const subject = isRu
    ? 'Добро пожаловать в Frontend Tales! 🎉'
    : 'Welcome to Frontend Tales! 🎉';

  const greeting = isRu ? `Привет, ${displayName}!` : `Hey ${displayName},`;

  const intro = isRu
    ? 'Добро пожаловать в сообщество Frontend Tales! <br> Мы очень рады, что вы присоединились к нам.'
    : 'Welcome to the Frontend Tales community! <br> We are absolutely thrilled to have you join us.';

  const ready = isRu
    ? 'Готовы погрузиться? Нажмите кнопку ниже, чтобы перейти в личный кабинет'
    : 'Ready to dive in? Click the button below to head to your dashboard';

  const buttonText = isRu ? 'Начать' : 'Get Started';

  const footerMessage = isRu
    ? 'Если у вас возникнут вопросы или вы просто захотите поздороваться, смело отвечайте на это письмо.'
    : "If you have any questions or just want to say hi, feel free to reply directly to this email.";

  const signOff = isRu
    ? 'С наилучшими пожеланиями,<br><strong>Команда Frontend Tales</strong>'
    : 'Cheers,<br><strong>The Frontend Tales Team</strong>';

  const sentReason = isRu
    ? `Вы получили это письмо, так как зарегистрировались на сайте <a href="${frontendUrl}" class="footer-link">frontendtales.ru</a>.`
    : `This email was sent to you because you signed up at <a href="${frontendUrl}" class="footer-link">frontendtales.ru</a>.`;

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
<body>
  <center class="wrapper">
    <table class="content-table" role="presentation" cellpadding="0" cellspacing="0">
      <!-- HEADER -->
      <tr>
        <td class="header">
          <div style="margin-bottom: 16px;">
            <img src="cid:avatar" alt="Logo" style="width: 70px; height: 70px; border-radius: 50%; border: 3px solid #ffffff; display: inline-block; vertical-align: middle; object-fit: cover;" />
          </div>
          <h1>Frontend Tales</h1>
        </td>
      </tr>
      <!-- BODY -->
      <tr>
        <td class="body-content">
          <p class="welcome-text">${greeting}</p>
          <p class="paragraph">
            ${intro}
          </p>
          <p class="paragraph">
            ${ready}
          </p>
          <div class="cta-container">
            <a href="${frontendUrl}" class="cta-button" target="_blank">${buttonText}</a>
          </div>
          <p class="paragraph">
            ${footerMessage}
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

  // Text version translations
  const textGreeting = isRu
    ? `Добро пожаловать в Frontend Tales, ${displayName}!`
    : `Welcome to Frontend Tales, ${displayName}!`;

  const textBody = isRu
    ? `Мы очень рады, что вы присоединились к нашему сообществу разработчиков.\n\nНачать: ${frontendUrl}`
    : `We are absolutely thrilled to have you join our community of developer.\n\nGet Started: ${frontendUrl}`;

  const textFooter = isRu
    ? 'Если у вас возникнут вопросы, смело отвечайте на это письмо.\n\nС наилучшими пожеланиями,\nКоманда Frontend Tales'
    : 'If you have any questions, feel free to reply directly to this email.\n\nCheers,\nThe Frontend Tales Team';

  const text = `
${textGreeting}

${textBody}

${textFooter}
  `.trim();

  return { subject, html, text };
}
