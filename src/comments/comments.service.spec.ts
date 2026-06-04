import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CommentsService } from './comments.service.js';
import { CommentsController } from './comments.controller.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/index.js';
import { ReactionType } from '@prisma/client';
import { ROLES_KEY } from '../common/decorators/roles.decorator.js';

describe('CommentsService', () => {
  let service: CommentsService;

  const mockPrisma = {
    article: {
      findUnique: jest.fn(),
    },
    comment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    commentReply: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    commentReaction: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  const mockEmailService = {
    sendNewCommentNotification: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Pagination Logic (Test Case 1 & 2)', () => {
    it('should return exactly 3 top-level comments along with their children, and correctly calculate nextCursor (Test Case 1)', async () => {
      const articleId = 'article-1';

      // Mock article exists
      mockPrisma.article.findUnique.mockResolvedValue({ id: articleId });

      // Mock findMany returning 4 comments (to indicate there is a next page)
      const topLevelCommentsMock = [
        {
          id: 'c1',
          content: 'C1',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: 'u1' },
          reactions: [],
        },
        {
          id: 'c2',
          content: 'C2',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: 'u2' },
          reactions: [],
        },
        {
          id: 'c3',
          content: 'C3',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: 'u3' },
          reactions: [],
        },
        {
          id: 'c4',
          content: 'C4',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: 'u4' },
          reactions: [],
        },
      ];
      mockPrisma.comment.findMany.mockResolvedValue(topLevelCommentsMock);

      // Mock replies for the top 3 comments
      const repliesMock = [
        {
          id: 'r1',
          commentId: 'c1',
          parentId: null,
          content: 'Reply to C1',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: 'u2' },
          reactions: [],
        },
        {
          id: 'r2',
          commentId: 'c1',
          parentId: 'r1',
          content: 'Reply to Reply R1',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: 'u1' },
          reactions: [],
        },
        {
          id: 'r3',
          commentId: 'c2',
          parentId: null,
          content: 'Reply to C2',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: 'u4' },
          reactions: [],
        },
      ];
      mockPrisma.commentReply.findMany.mockResolvedValue(repliesMock);

      const result = await service.getComments(articleId, {});

      // Verify pagination logic
      expect(mockPrisma.article.findUnique).toHaveBeenCalledWith({
        where: { id: articleId },
      });
      expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { articleId },
          take: 4,
        }),
      );

      // Should return exactly 3 top level comments
      expect(result.comments.length).toBe(3);
      expect(result.comments[0].id).toBe('c1');
      expect(result.comments[1].id).toBe('c2');
      expect(result.comments[2].id).toBe('c3');

      // nextCursor should be 'c4'
      expect(result.nextCursor).toBe('c4');

      // Verify nested children trees are resolved
      // C1 has direct reply R1, which has reply R2
      expect(result.comments[0].replies.length).toBe(1);
      expect(result.comments[0].replies[0].id).toBe('r1');
      expect(result.comments[0].replies[0].replies.length).toBe(1);
      expect(result.comments[0].replies[0].replies[0].id).toBe('r2');

      // C2 has reply R3
      expect(result.comments[1].replies.length).toBe(1);
      expect(result.comments[1].replies[0].id).toBe('r3');

      // C3 has no replies
      expect(result.comments[2].replies.length).toBe(0);
    });

    it('should return null nextCursor when fetching the last page (Test Case 2)', async () => {
      const articleId = 'article-1';

      mockPrisma.article.findUnique.mockResolvedValue({ id: articleId });

      // Mock returning less than 4 comments (e.g. 2 comments)
      const topLevelCommentsMock = [
        {
          id: 'c1',
          content: 'C1',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: 'u1' },
          reactions: [],
        },
        {
          id: 'c2',
          content: 'C2',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: 'u2' },
          reactions: [],
        },
      ];
      mockPrisma.comment.findMany.mockResolvedValue(topLevelCommentsMock);
      mockPrisma.commentReply.findMany.mockResolvedValue([]);

      const result = await service.getComments(articleId, {});

      expect(result.comments.length).toBe(2);
      expect(result.nextCursor).toBeNull();
    });
  });

  describe('Reaction Logic (Test Case 3)', () => {
    const articleId = 'article-1';
    const userId = 'user-1';
    const commentId = 'comment-1';

    beforeEach(() => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: articleId });
    });

    it('should create a new reaction if none exists (Test Case 3 - create new)', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({
        id: commentId,
        articleId,
      });
      mockPrisma.commentReaction.findUnique.mockResolvedValue(null);
      mockPrisma.commentReaction.create.mockResolvedValue({
        id: 'rx-1',
        type: ReactionType.LIKE,
      });

      const result = await service.toggleReaction(
        articleId,
        commentId,
        userId,
        { type: ReactionType.LIKE },
      );

      expect(mockPrisma.commentReaction.create).toHaveBeenCalledWith({
        data: { userId, commentId, type: ReactionType.LIKE },
      });
      expect(result).toEqual({ reacted: true, type: ReactionType.LIKE });
    });

    it('should change reaction type if a different one exists (Test Case 3 - change existing)', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({
        id: commentId,
        articleId,
      });
      mockPrisma.commentReaction.findUnique.mockResolvedValue({
        id: 'rx-1',
        type: ReactionType.LIKE,
      });
      mockPrisma.commentReaction.update.mockResolvedValue({
        id: 'rx-1',
        type: ReactionType.FIRE,
      });

      const result = await service.toggleReaction(
        articleId,
        commentId,
        userId,
        { type: ReactionType.FIRE },
      );

      expect(mockPrisma.commentReaction.update).toHaveBeenCalledWith({
        where: { id: 'rx-1' },
        data: { type: ReactionType.FIRE },
      });
      expect(result).toEqual({ reacted: true, type: ReactionType.FIRE });
    });

    it('should delete reaction if the same type is toggled off (Test Case 3 - delete on toggle off)', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({
        id: commentId,
        articleId,
      });
      mockPrisma.commentReaction.findUnique.mockResolvedValue({
        id: 'rx-1',
        type: ReactionType.LIKE,
      });
      mockPrisma.commentReaction.delete.mockResolvedValue({ id: 'rx-1' });

      const result = await service.toggleReaction(
        articleId,
        commentId,
        userId,
        { type: ReactionType.LIKE },
      );

      expect(mockPrisma.commentReaction.delete).toHaveBeenCalledWith({
        where: { id: 'rx-1' },
      });
      expect(result).toEqual({ reacted: false, type: null });
    });
  });

  describe('Comment Deletion (Test Case 4)', () => {
    it('should delete top-level comment', async () => {
      const articleId = 'article-1';
      const commentId = 'comment-1';

      mockPrisma.article.findUnique.mockResolvedValue({ id: articleId });
      mockPrisma.comment.findUnique.mockResolvedValue({
        id: commentId,
        articleId,
      });
      mockPrisma.comment.delete.mockResolvedValue({
        id: commentId,
      });

      const result = await service.deleteComment(articleId, commentId);

      expect(mockPrisma.comment.delete).toHaveBeenCalledWith({
        where: { id: commentId },
      });
      expect(result.id).toBe(commentId);
    });

    it('should delete reply', async () => {
      const articleId = 'article-1';
      const replyId = 'reply-1';

      mockPrisma.article.findUnique.mockResolvedValue({ id: articleId });
      mockPrisma.comment.findUnique.mockResolvedValue(null);
      mockPrisma.commentReply.findUnique.mockResolvedValue({
        id: replyId,
        comment: { articleId },
      });
      mockPrisma.commentReply.delete.mockResolvedValue({
        id: replyId,
      });

      const result = await service.deleteComment(articleId, replyId);

      expect(mockPrisma.commentReply.delete).toHaveBeenCalledWith({
        where: { id: replyId },
      });
      expect(result.id).toBe(replyId);
    });

    it('should verify Admin guard requirements on Controller (Test Case 4 - guard)', () => {
      const roles = Reflect.getMetadata(
        ROLES_KEY,
        CommentsController.prototype.deleteComment,
      );
      expect(roles).toBeDefined();
      expect(roles).toContain('ADMIN');
    });
  });
});
