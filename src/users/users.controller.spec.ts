import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    getUserComments: jest.fn(),
    blockUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyComments', () => {
    it('should return comments from user service', async () => {
      const mockComments = [
        { id: 'comment-1', content: 'hello', createdAt: new Date() },
      ];
      mockUsersService.getUserComments.mockResolvedValue(mockComments);

      const result = await controller.getMyComments('user-id');

      expect(mockUsersService.getUserComments).toHaveBeenCalledWith('user-id');
      expect(result).toBe(mockComments);
    });
  });

  describe('blockUser', () => {
    it('should block user and return status/details', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        displayName: 'John',
        isBlocked: true,
      };
      mockUsersService.blockUser.mockResolvedValue(mockUser);

      const result = await controller.blockUser('user-id');

      expect(mockUsersService.blockUser).toHaveBeenCalledWith('user-id');
      expect(result).toEqual({
        message: 'User blocked successfully',
        data: {
          id: 'user-id',
          email: 'test@example.com',
          displayName: 'John',
          isBlocked: true,
        },
      });
    });
  });
});
