import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { QuickActionsController } from './admin-actions.controller.js';
import { UsersModule } from '../users/users.module.js';
import { CommentsModule } from '../comments/comments.module.js';

@Module({
  imports: [JwtModule.register({}), UsersModule, CommentsModule],
  controllers: [QuickActionsController],
})
export class AdminModule {}
