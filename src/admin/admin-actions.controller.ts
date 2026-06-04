import { Controller, Get, Post, Query, Body, Res, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service.js';
import { CommentsService } from '../comments/comments.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Public } from '../common/decorators/public.decorator.js';

@Controller('admin/quick-actions')
export class QuickActionsController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly commentsService: CommentsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('confirm')
  @Public()
  async confirm(
    @Res() res: Response,
    @Query('action') action: string,
    @Query('token') token: string,
    @Query('articleId') articleId?: string,
    @Query('commentId') commentId?: string,
    @Query('userId') userId?: string,
  ) {
    const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');

    try {
      const payload = await this.jwtService.verifyAsync(token, { secret });

      if (payload.action !== action) {
        return res.status(HttpStatus.BAD_REQUEST).send(this.getErrorHtml(frontendUrl));
      }

      let targetDetailsHtml = '';
      let actionTitle = '';
      let btnText = '';
      let btnClass = '';

      if (action === 'delete-comment') {
        if (!commentId || !articleId || payload.commentId !== commentId || payload.articleId !== articleId) {
          return res.status(HttpStatus.BAD_REQUEST).send(this.getErrorHtml(frontendUrl));
        }

        const comment = await this.prisma.comment.findUnique({
          where: { id: commentId },
        });

        if (!comment) {
          targetDetailsHtml = `
            <div class="target-box">
              <div class="target-box-email">Комментарий уже удалён или не существует.</div>
            </div>
          `;
        } else {
          targetDetailsHtml = `
            <div class="target-box">
              <div class="target-box-title">Комментарий</div>
              <div class="target-box-content">"${comment.content}"</div>
            </div>
          `;
        }

        actionTitle = 'Удаление комментария';
        btnText = 'Да, удалить комментарий';
        btnClass = 'delete-comment';
      } else if (action === 'block-user') {
        if (!userId || payload.userId !== userId) {
          return res.status(HttpStatus.BAD_REQUEST).send(this.getErrorHtml(frontendUrl));
        }

        const user = await this.prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          return res.status(HttpStatus.BAD_REQUEST).send(this.getErrorHtml(frontendUrl));
        }

        targetDetailsHtml = `
          <div class="target-box">
            <div class="target-box-title">Пользователь</div>
            <div class="target-box-name">${user.displayName}</div>
            <div class="target-box-email">${user.email}</div>
          </div>
        `;

        actionTitle = 'Блокировка пользователя';
        btnText = 'Да, заблокировать пользователя';
        btnClass = 'block-user';
      } else {
        return res.status(HttpStatus.BAD_REQUEST).send(this.getErrorHtml(frontendUrl));
      }

      const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Подтверждение действия</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    ${this.getCommonCss()}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-container warning">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 32px; height: 32px;">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    </div>
    <h2>${actionTitle}</h2>
    <p class="description">Это действие необратимо. Пожалуйста, подтвердите свое решение.</p>

    ${targetDetailsHtml}

    <form action="/api/admin/quick-actions/execute" method="POST">
      <input type="hidden" name="action" value="${action}" />
      <input type="hidden" name="token" value="${token}" />
      ${articleId ? `<input type="hidden" name="articleId" value="${articleId}" />` : ''}
      ${commentId ? `<input type="hidden" name="commentId" value="${commentId}" />` : ''}
      ${userId ? `<input type="hidden" name="userId" value="${userId}" />` : ''}

      <div class="btn-group">
        <button type="submit" class="btn btn-submit ${btnClass}">
          ${btnText}
        </button>
        <a href="${frontendUrl}" class="btn btn-cancel">
          Отмена
        </a>
      </div>
    </form>
  </div>
</body>
</html>
      `;

      res.setHeader('Content-Type', 'text/html');
      return res.status(HttpStatus.OK).send(html);
    } catch (error) {
      res.setHeader('Content-Type', 'text/html');
      return res.status(HttpStatus.BAD_REQUEST).send(this.getErrorHtml(frontendUrl));
    }
  }

  @Post('execute')
  @Public()
  async execute(
    @Res() res: Response,
    @Body('action') action: string,
    @Body('token') token: string,
    @Body('articleId') articleId?: string,
    @Body('commentId') commentId?: string,
    @Body('userId') userId?: string,
  ) {
    const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');

    try {
      const payload = await this.jwtService.verifyAsync(token, { secret });

      if (payload.action !== action) {
        res.setHeader('Content-Type', 'text/html');
        return res.status(HttpStatus.BAD_REQUEST).send(this.getErrorHtml(frontendUrl));
      }

      let successMessage = '';

      if (action === 'delete-comment') {
        if (!commentId || !articleId || payload.commentId !== commentId || payload.articleId !== articleId) {
          res.setHeader('Content-Type', 'text/html');
          return res.status(HttpStatus.BAD_REQUEST).send(this.getErrorHtml(frontendUrl));
        }

        await this.commentsService.deleteComment(articleId, commentId);
        successMessage = 'Комментарий был успешно удалён.';
      } else if (action === 'block-user') {
        if (!userId || payload.userId !== userId) {
          res.setHeader('Content-Type', 'text/html');
          return res.status(HttpStatus.BAD_REQUEST).send(this.getErrorHtml(frontendUrl));
        }

        await this.usersService.blockUser(userId);
        successMessage = 'Пользователь был заблокирован, его активная сессия отозвана.';
      } else {
        res.setHeader('Content-Type', 'text/html');
        return res.status(HttpStatus.BAD_REQUEST).send(this.getErrorHtml(frontendUrl));
      }

      res.setHeader('Content-Type', 'text/html');
      return res.status(HttpStatus.OK).send(this.getSuccessHtml(successMessage, frontendUrl));
    } catch (error) {
      res.setHeader('Content-Type', 'text/html');
      return res.status(HttpStatus.BAD_REQUEST).send(this.getErrorHtml(frontendUrl));
    }
  }

  private getCommonCss(): string {
    return `
      body {
        background-color: #f8fafc;
        color: #334155;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        min-height: 100vh;
        margin: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        box-sizing: border-box;
      }
      .card {
        max-width: 448px;
        width: 100%;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 32px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
        text-align: center;
        box-sizing: border-box;
      }
      .icon-container {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 64px;
        height: 64px;
        border-radius: 9999px;
        margin: 0 auto 16px auto;
      }
      .icon-container.warning {
        background-color: rgba(245, 158, 11, 0.1);
        color: #d97706;
      }
      .icon-container.error {
        background-color: rgba(239, 68, 68, 0.1);
        color: #dc2626;
      }
      .icon-container.success {
        background-color: rgba(16, 185, 129, 0.1);
        color: #059669;
      }
      h2 {
        font-size: 24px;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 8px 0;
        letter-spacing: -0.025em;
      }
      p.description {
        color: #475569;
        font-size: 14px;
        margin: 0 0 24px 0;
        line-height: 1.5;
      }
      .target-box {
        background-color: #f1f5f9;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 24px;
        text-align: left;
      }
      .target-box-title {
        font-size: 10px;
        text-transform: uppercase;
        font-weight: 700;
        letter-spacing: 0.05em;
        color: #64748b;
        margin-bottom: 8px;
      }
      .target-box-content {
        color: #334155;
        font-style: italic;
        font-size: 14px;
      }
      .target-box-name {
        color: #0f172a;
        font-weight: 600;
        font-size: 16px;
      }
      .target-box-email {
        color: #475569;
        font-size: 14px;
        margin-top: 4px;
      }
      form {
        margin-top: 32px;
      }
      .btn-group {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .btn {
        width: 100%;
        padding: 12px 16px;
        border-radius: 12px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease-in-out;
        border: none;
        box-sizing: border-box;
        text-align: center;
        text-decoration: none;
        display: inline-block;
      }
      .btn-submit {
        color: #ffffff;
      }
      .btn-submit.delete-comment {
        background: linear-gradient(to right, #dc2626, #f43f5e);
        box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.15), 0 2px 4px -1px rgba(220, 38, 38, 0.1);
      }
      .btn-submit.delete-comment:hover {
        filter: brightness(1.05);
        box-shadow: 0 10px 15px -3px rgba(220, 38, 38, 0.25);
      }
      .btn-submit.block-user {
        background: linear-gradient(to right, #d97706, #ea580c);
        box-shadow: 0 4px 6px -1px rgba(217, 119, 6, 0.15), 0 2px 4px -1px rgba(217, 119, 6, 0.1);
      }
      .btn-submit.block-user:hover {
        filter: brightness(1.05);
        box-shadow: 0 10px 15px -3px rgba(217, 119, 6, 0.25);
      }
      .btn-cancel {
        background-color: #f1f5f9;
        color: #475569;
        border: 1px solid #cbd5e1;
      }
      .btn-cancel:hover {
        background-color: #e2e8f0;
        color: #1e293b;
      }
    `;
  }

  private getErrorHtml(frontendUrl: string): string {
    return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ошибка действия</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    ${this.getCommonCss()}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-container error">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 32px; height: 32px;">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
      </svg>
    </div>
    <h2>Ссылка недействительна</h2>
    <p class="description">
      Токен истёк, изменён или содержит недопустимые параметры действия.
    </p>
    <a href="${frontendUrl}" class="btn btn-cancel" style="width: auto;">
      Вернуться на сайт
    </a>
  </div>
</body>
</html>
    `;
  }

  private getSuccessHtml(message: string, frontendUrl: string): string {
    return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Действие выполнено</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    ${this.getCommonCss()}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-container success">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 32px; height: 32px;">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h2>Действие выполнено</h2>
    <p class="description">
      ${message}
    </p>
    <a href="${frontendUrl}" class="btn btn-cancel" style="width: auto;">
      Вернуться на сайт
    </a>
  </div>
</body>
</html>
    `;
  }
}
