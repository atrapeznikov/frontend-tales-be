import { PartialType } from '@nestjs/swagger';
import {
  CreateRoadmapSectionDto,
  CreateRoadmapCategoryDto,
  CreateRoadmapItemDto,
  CreateRoadmapLinkDto,
} from './create-roadmap.dto.js';

export class UpdateRoadmapSectionDto extends PartialType(
  CreateRoadmapSectionDto,
) {}
export class UpdateRoadmapCategoryDto extends PartialType(
  CreateRoadmapCategoryDto,
) {}
export class UpdateRoadmapItemDto extends PartialType(CreateRoadmapItemDto) {}
export class UpdateRoadmapLinkDto extends PartialType(CreateRoadmapLinkDto) {}
