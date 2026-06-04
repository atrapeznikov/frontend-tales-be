import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/index.js';
import {
  PaginationQueryDto,
  CreateCommentDto,
  CreateReplyDto,
  ToggleReactionDto,
} from './dto/comments.dto.js';
import { Comment, CommentReply, CommentReaction } from '@prisma/client';

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async getComments(articleId: string, query: PaginationQueryDto) {
    const { cursor } = query;

    // 1. Verify article exists
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });
    if (!article) {
      throw new NotFoundException('Article not found');
    }

    // 2. Fetch 4 top-level comments to determine nextCursor
    const topLevelComments = await this.prisma.comment.findMany({
      where: { articleId },
      take: 4,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            nickname: true,
            avatarUrl: true,
            email: true,
            role: true,
          },
        },
        reactions: {
          select: {
            id: true,
            userId: true,
            type: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    const commentsToReturn = topLevelComments.slice(0, 3);
    if (topLevelComments.length > 3) {
      nextCursor = topLevelComments[3].id;
    }

    if (commentsToReturn.length === 0) {
      return { comments: [], nextCursor: null };
    }

    // 3. Fetch all replies associated with these top-level comments
    const topLevelIds = commentsToReturn.map((c) => c.id);
    const replies = await this.prisma.commentReply.findMany({
      where: {
        commentId: { in: topLevelIds },
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            nickname: true,
            avatarUrl: true,
            email: true,
            role: true,
          },
        },
        reactions: {
          select: {
            id: true,
            userId: true,
            type: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 4. Map and build nested tree for each top-level comment
    const buildTreeForComment = (rootCommentId: string) => {
      const commentReplies = replies.filter(
        (r) => r.commentId === rootCommentId,
      );

      const buildSubTree = (parentId: string | null): any[] => {
        return commentReplies
          .filter((r) => r.parentId === parentId)
          .map((r) => ({
            id: r.id,
            content: r.content,
            parentId: r.parentId ?? rootCommentId, // Client expects flat parentId mapping or nested representation
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            user: r.user,
            reactions: r.reactions,
            replies: buildSubTree(r.id),
          }));
      };

      return buildSubTree(null);
    };

    const tree = commentsToReturn.map((c) => ({
      id: c.id,
      content: c.content,
      parentId: null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      user: c.user,
      reactions: c.reactions,
      replies: buildTreeForComment(c.id),
    }));

    return {
      comments: tree,
      nextCursor,
    };
  }

  async createComment(
    articleId: string,
    userId: string,
    dto: CreateCommentDto,
  ) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      include: { translations: true },
    });
    if (!article) {
      throw new NotFoundException('Article not found');
    }

    const comment = await this.prisma.comment.create({
      data: {
        articleId,
        userId,
        content: dto.content,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            nickname: true,
            avatarUrl: true,
            email: true,
            role: true,
          },
        },
        reactions: true,
      },
    });

    this.sendAdminNotifications(article, comment.user, comment.id, comment.content).catch(err => {
      this.logger.error(`Error in sendAdminNotifications for comment: ${err.message}`);
    });

    return comment;
  }

  async createReply(
    articleId: string,
    commentId: string,
    userId: string,
    dto: CreateReplyDto,
  ) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      include: { translations: true },
    });
    if (!article) {
      throw new NotFoundException('Article not found');
    }

    let rootCommentId: string;

    const parentComment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (parentComment) {
      if (parentComment.articleId !== articleId) {
        throw new NotFoundException('Comment not found in this article');
      }
      rootCommentId = parentComment.id;
    } else {
      const parentReply = await this.prisma.commentReply.findUnique({
        where: { id: commentId },
        include: { comment: true },
      });

      if (!parentReply || parentReply.comment.articleId !== articleId) {
        throw new NotFoundException('Comment/Reply not found in this article');
      }
      rootCommentId = parentReply.commentId;
    }

    const reply = await this.prisma.commentReply.create({
      data: {
        commentId: rootCommentId,
        parentId: rootCommentId === commentId ? null : commentId,
        userId,
        content: dto.content,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            nickname: true,
            avatarUrl: true,
            email: true,
            role: true,
          },
        },
        reactions: true,
      },
    });

    this.sendAdminNotifications(article, reply.user, reply.id, reply.content).catch(err => {
      this.logger.error(`Error in sendAdminNotifications for reply: ${err.message}`);
    });

    return reply;
  }

  async toggleReaction(
    articleId: string,
    commentId: string,
    userId: string,
    dto: ToggleReactionDto,
  ) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });
    if (!article) {
      throw new NotFoundException('Article not found');
    }

    // 1. Check if commentId is a Comment
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (comment) {
      if (comment.articleId !== articleId) {
        throw new NotFoundException('Comment not found in this article');
      }

      const existingReaction = await this.prisma.commentReaction.findUnique({
        where: {
          userId_commentId: {
            userId,
            commentId,
          },
        },
      });

      if (existingReaction) {
        if (existingReaction.type === dto.type) {
          // Toggle off: Delete
          await this.prisma.commentReaction.delete({
            where: { id: existingReaction.id },
          });
          return { reacted: false, type: null };
        } else {
          // Change reaction
          const updated = await this.prisma.commentReaction.update({
            where: { id: existingReaction.id },
            data: { type: dto.type },
          });
          return { reacted: true, type: updated.type };
        }
      } else {
        // Create new
        const created = await this.prisma.commentReaction.create({
          data: {
            userId,
            commentId,
            type: dto.type,
          },
        });
        return { reacted: true, type: created.type };
      }
    }

    // 2. Check if commentId is a CommentReply
    const reply = await this.prisma.commentReply.findUnique({
      where: { id: commentId },
      include: { comment: true },
    });

    if (reply) {
      if (reply.comment.articleId !== articleId) {
        throw new NotFoundException('Reply not found in this article');
      }

      const existingReaction = await this.prisma.commentReaction.findUnique({
        where: {
          userId_commentReplyId: {
            userId,
            commentReplyId: commentId,
          },
        },
      });

      if (existingReaction) {
        if (existingReaction.type === dto.type) {
          // Toggle off: Delete
          await this.prisma.commentReaction.delete({
            where: { id: existingReaction.id },
          });
          return { reacted: false, type: null };
        } else {
          // Change reaction
          const updated = await this.prisma.commentReaction.update({
            where: { id: existingReaction.id },
            data: { type: dto.type },
          });
          return { reacted: true, type: updated.type };
        }
      } else {
        // Create new
        const created = await this.prisma.commentReaction.create({
          data: {
            userId,
            commentReplyId: commentId,
            type: dto.type,
          },
        });
        return { reacted: true, type: created.type };
      }
    }

    throw new NotFoundException('Comment or Reply not found');
  }

  async deleteComment(articleId: string, commentId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });
    if (!article) {
      throw new NotFoundException('Article not found');
    }

    // Check if it's a top-level Comment
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (comment) {
      if (comment.articleId !== articleId) {
        throw new NotFoundException('Comment not found in this article');
      }
      return this.prisma.comment.delete({
        where: { id: commentId },
      });
    }

    // Check if it's a CommentReply
    const reply = await this.prisma.commentReply.findUnique({
      where: { id: commentId },
      include: { comment: true },
    });

    if (reply) {
      if (reply.comment.articleId !== articleId) {
        throw new NotFoundException('Reply not found in this article');
      }
      return this.prisma.commentReply.delete({
        where: { id: commentId },
      });
    }

    throw new NotFoundException('Comment or Reply not found');
  }

  private async sendAdminNotifications(
    article: { id: string; slug: string; translations: Array<{ title: string; language: string }> },
    author: { id: string; displayName: string; nickname?: string | null; email: string },
    commentId: string,
    content: string,
  ) {
    try {
      const admins = await this.prisma.user.findMany({
        where: { role: 'ADMIN' },
      });
      if (admins.length === 0) return;

      const title = article.translations.find(t => t.language === 'ru')?.title 
        || article.translations[0]?.title 
        || 'Без названия';

      for (const admin of admins) {
        await this.emailService.sendNewCommentNotification(admin.email, {
          articleId: article.id,
          articleSlug: article.slug,
          articleTitle: title,
          commentId,
          commentContent: content,
          authorName: author.nickname || author.displayName,
          authorEmail: author.email,
          authorId: author.id,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to send new comment notifications to admins: ${error}`);
    }
  }
}
