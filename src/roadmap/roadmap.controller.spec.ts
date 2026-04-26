import { Test, TestingModule } from '@nestjs/testing';
import { RoadmapController } from './roadmap.controller.js';
import { RoadmapService } from './roadmap.service.js';
import { CreateRoadmapSectionDto } from './dto/create-roadmap.dto.js';
import { UpdateRoadmapSectionDto } from './dto/update-roadmap.dto.js';

describe('RoadmapController', () => {
  let controller: RoadmapController;

  const mockService = {
    findAll: jest.fn(),
    findSectionByKey: jest.fn(),
    createSection: jest.fn(),
    updateSection: jest.fn(),
    deleteSection: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoadmapController],
      providers: [{ provide: RoadmapService, useValue: mockService }],
    }).compile();

    controller = module.get<RoadmapController>(RoadmapController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should call service.findAll with isAdmin=true for ADMIN user', async () => {
      mockService.findAll.mockResolvedValue([]);
      await controller.findAll({ role: 'ADMIN' });
      expect(mockService.findAll).toHaveBeenCalledWith(true);
    });

    it('should call service.findAll with isAdmin=false for non-admin', async () => {
      mockService.findAll.mockResolvedValue([]);
      await controller.findAll({ role: 'USER' });
      expect(mockService.findAll).toHaveBeenCalledWith(false);
    });

    it('should call service.findAll with isAdmin=false when user is undefined', async () => {
      mockService.findAll.mockResolvedValue([]);
      await controller.findAll(undefined);
      expect(mockService.findAll).toHaveBeenCalledWith(false);
    });
  });

  describe('findByKey', () => {
    it('should call service.findSectionByKey with key and isAdmin', async () => {
      mockService.findSectionByKey.mockResolvedValue({});
      await controller.findByKey('k', { role: 'ADMIN' });
      expect(mockService.findSectionByKey).toHaveBeenCalledWith('k', true);
    });

    it('should pass isAdmin=false when user is null', async () => {
      mockService.findSectionByKey.mockResolvedValue({});
      await controller.findByKey('k', null);
      expect(mockService.findSectionByKey).toHaveBeenCalledWith('k', false);
    });
  });

  describe('create', () => {
    it('should call service.createSection with dto', async () => {
      const dto: CreateRoadmapSectionDto = { key: 'k' };
      mockService.createSection.mockResolvedValue({ id: 's1' });

      const result = await controller.create(dto);

      expect(mockService.createSection).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 's1' });
    });
  });

  describe('update', () => {
    it('should call service.updateSection with id and dto', async () => {
      const dto: UpdateRoadmapSectionDto = { key: 'k' };
      mockService.updateSection.mockResolvedValue({ id: 's1' });

      const result = await controller.update('s1', dto);

      expect(mockService.updateSection).toHaveBeenCalledWith('s1', dto);
      expect(result).toEqual({ id: 's1' });
    });
  });

  describe('delete', () => {
    it('should call service.deleteSection with id', async () => {
      mockService.deleteSection.mockResolvedValue({ success: true });
      const result = await controller.delete('s1');
      expect(mockService.deleteSection).toHaveBeenCalledWith('s1');
      expect(result).toEqual({ success: true });
    });
  });
});
