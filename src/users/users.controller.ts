import {
  Controller,
  Patch,
  Param,
  ParseUUIDPipe,
  Get,
  Post,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/index.js';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/comments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get comments left by the current user' })
  @ApiResponse({ status: 200, description: 'Return list of user comments' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyComments(@CurrentUser('id') userId: string) {
    return this.usersService.getUserComments(userId);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload avatar for the current user' })
  @ApiResponse({ status: 200, description: 'Avatar updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file size or format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1 * 1024 * 1024 }),
          // SVG intentionally excluded: it is XML and can carry executable
          // script, which would be stored XSS once served from our asset host.
          // GIF excluded too — only static png/jpg/webp avatars are allowed.
          // FileTypeValidator inspects magic numbers, not the client mimetype.
          new FileTypeValidator({ fileType: 'image/(png|jpeg|webp)' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const user = await this.usersService.updateAvatar(userId, file);
    return {
      message: 'Avatar updated successfully',
      data: {
        id: user.id,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  @Patch(':userId/block')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Block a user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User successfully blocked' })
  @ApiResponse({
    status: 400,
    description: 'Invalid user ID or user is an admin',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (not an admin)' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async blockUser(@Param('userId', new ParseUUIDPipe()) userId: string) {
    const user = await this.usersService.blockUser(userId);
    return {
      message: 'User blocked successfully',
      data: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        isBlocked: user.isBlocked,
      },
    };
  }
}
