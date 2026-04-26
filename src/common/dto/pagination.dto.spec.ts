import { PaginatedResponseDto, PaginationDto } from './pagination.dto.js';

describe('PaginationDto', () => {
  it('should default page to 1 and limit to 20', () => {
    const dto = new PaginationDto();
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
    expect(dto.skip).toBe(0);
  });

  it('should compute skip as (page-1)*limit', () => {
    const dto = new PaginationDto();
    dto.page = 3;
    dto.limit = 10;
    expect(dto.skip).toBe(20);
  });
});

describe('PaginatedResponseDto', () => {
  it('should compute totalPages by ceiling division', () => {
    const response = new PaginatedResponseDto<number>([1, 2, 3], 25, 1, 10);
    expect(response.data).toEqual([1, 2, 3]);
    expect(response.meta).toEqual({
      total: 25,
      page: 1,
      limit: 10,
      totalPages: 3,
    });
  });

  it('should produce 0 totalPages when total is 0', () => {
    const response = new PaginatedResponseDto<number>([], 0, 1, 10);
    expect(response.meta.totalPages).toBe(0);
  });
});
