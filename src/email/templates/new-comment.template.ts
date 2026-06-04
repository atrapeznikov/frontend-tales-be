export interface NewCommentEmailData {
  articleTitle: string;
  articleLink: string;
  commentContent: string;
  authorName: string;
  authorEmail: string;
  authorId: string;
  deleteLink: string;
  blockLink: string;
}

export function getNewCommentTemplate(data: NewCommentEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    articleTitle,
    articleLink,
    commentContent,
    authorName,
    authorEmail,
    authorId,
    deleteLink,
    blockLink,
  } = data;

  const subject = `[Frontend Tales] Новый комментарий к статье: "${articleTitle}"`;

  const html = `
<!DOCTYPE html>
<html lang="ru">
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
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.025em;
    }
    .body-content {
      padding: 45px 30px;
      color: #1e293b;
    }
    .section-title {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 8px;
      font-weight: 700;
    }
    .article-title {
      font-size: 18px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 24px;
      color: #0f172a;
    }
    .article-link {
      color: #4f46e5;
      text-decoration: none;
      transition: color 0.2s ease;
    }
    .article-link:hover {
      color: #3730a3;
      text-decoration: underline;
    }
    .meta-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .meta-row {
      margin-bottom: 12px;
      font-size: 15px;
      color: #334155;
    }
    .meta-row:last-child {
      margin-bottom: 0;
    }
    .meta-label {
      font-weight: 600;
      color: #475569;
      display: inline-block;
      width: 100px;
    }
    .comment-card {
      background-color: #f1f5f9;
      border-left: 4px solid #4f46e5;
      border-radius: 4px 12px 12px 4px;
      padding: 20px;
      margin-bottom: 32px;
      font-size: 16px;
      line-height: 1.6;
      color: #1e293b;
      font-style: italic;
    }
    .actions-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 16px;
      border-top: 1px solid #e2e8f0;
      padding-top: 24px;
    }
    .btn-group {
      margin-bottom: 8px;
      text-align: center;
    }
    .btn {
      display: inline-block;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      margin: 8px;
      text-align: center;
    }
    .btn-danger {
      background-color: #ef4444;
      color: #ffffff !important;
    }
    .btn-danger:hover {
      background-color: #dc2626;
    }
    .btn-warning {
      background-color: #f59e0b;
      color: #ffffff !important;
    }
    .btn-warning:hover {
      background-color: #d97706;
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
  </style>
</head>
<body>
  <center class="wrapper">
    <table class="content-table" role="presentation" cellpadding="0" cellspacing="0">
      <!-- HEADER -->
      <tr>
        <td class="header">
          <div style="margin-bottom: 12px;">
            <img src="cid:avatar" alt="Logo" style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid #ffffff; display: inline-block; vertical-align: middle; object-fit: cover;" />
          </div>
          <h1>Новый комментарий</h1>
        </td>
      </tr>
      <!-- BODY -->
      <tr>
        <td class="body-content">
          <div class="section-title">Статья</div>
          <p class="article-title">
            <a href="${articleLink}" class="article-link" target="_blank">${articleTitle}</a>
          </p>

          <div class="section-title">Автор комментария</div>
          <div class="meta-box">
            <div class="meta-row">
              <span class="meta-label">Имя:</span> ${authorName}
            </div>
            <div class="meta-row">
              <span class="meta-label">Email:</span> ${authorEmail}
            </div>
            <div class="meta-row">
              <span class="meta-label">User ID:</span> <code style="font-size: 13px; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${authorId}</code>
            </div>
          </div>

          <div class="section-title">Содержимое</div>
          <div class="comment-card">
            "${commentContent}"
          </div>

          <div class="actions-title">Быстрые действия (только для администраторов)</div>
          <div class="btn-group">
            <a href="${deleteLink}" class="btn btn-danger" target="_blank">Удалить комментарий</a>
            <a href="${blockLink}" class="btn btn-warning" target="_blank">Заблокировать автора</a>
          </div>
        </td>
      </tr>
      <!-- FOOTER -->
      <tr>
        <td class="footer">
          <p class="footer-text">
            Это автоматическое уведомление для администраторов Frontend Tales.
          </p>
          <p class="footer-text" style="margin-top: 8px;">
            &copy; ${new Date().getFullYear()} Frontend Tales. All rights reserved.
          </p>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>
  `.trim();

  const text = `
Новый комментарий к статье: "${articleTitle}"
Ссылка на статью: ${articleLink}

Автор комментария:
Имя: ${authorName}
Email: ${authorEmail}
User ID: ${authorId}

Содержимое комментария:
"${commentContent}"

Быстрые действия:
Удалить комментарий: ${deleteLink}
Заблокировать автора: ${blockLink}
  `.trim();

  return { subject, html, text };
}
