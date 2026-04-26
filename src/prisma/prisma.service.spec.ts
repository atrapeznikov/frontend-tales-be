import { PrismaService } from './prisma.service.js';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(() => {
    service = new PrismaService();
  });

  afterEach(() => jest.restoreAllMocks());

  it('should call $connect on module init', async () => {
    const connectSpy = jest
      .spyOn(service, '$connect')
      .mockResolvedValue(undefined as never);

    await service.onModuleInit();

    expect(connectSpy).toHaveBeenCalled();
  });

  it('should call $disconnect on module destroy', async () => {
    const disconnectSpy = jest
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined as never);

    await service.onModuleDestroy();

    expect(disconnectSpy).toHaveBeenCalled();
  });
});
