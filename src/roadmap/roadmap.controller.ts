import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoadmapService } from './roadmap.service.js';
import { CreateRoadmapSectionDto } from './dto/create-roadmap.dto.js';
import { UpdateRoadmapSectionDto } from './dto/update-roadmap.dto.js';
import { Public, Roles } from '../common/decorators/index.js';

@ApiTags('Roadmap')
@Controller('roadmap')
export class RoadmapController {
  constructor(private readonly roadmapService: RoadmapService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get full roadmap with all sections, categories, items, and links',
  })
  findAll() {
    return this.roadmapService.findAll();
  }

  @Get(':key')
  @Public()
  @ApiOperation({ summary: 'Get a roadmap section by key' })
  findByKey(@Param('key') key: string) {
    return this.roadmapService.findSectionByKey(key);
  }

  @Post()
  @ApiBearerAuth()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Create a new roadmap section with nested data (Admin)',
  })
  create(@Body() dto: CreateRoadmapSectionDto) {
    return this.roadmapService.createSection(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a roadmap section (Admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateRoadmapSectionDto) {
    return this.roadmapService.updateSection(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a roadmap section (Admin)' })
  delete(@Param('id') id: string) {
    return this.roadmapService.deleteSection(id);
  }
}
