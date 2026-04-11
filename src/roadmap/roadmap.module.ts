import { Module } from '@nestjs/common';
import { RoadmapService } from './roadmap.service.js';
import { RoadmapController } from './roadmap.controller.js';

@Module({
  controllers: [RoadmapController],
  providers: [RoadmapService],
  exports: [RoadmapService],
})
export class RoadmapModule {}
