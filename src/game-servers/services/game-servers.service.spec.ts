import { Test, TestingModule } from '@nestjs/testing';
import { GameServersService } from './game-servers.service';
import { TypegooseModule, getModelToken } from 'nestjs-typegoose';
import { GameServer } from '../models/game-server';
import { DocumentType, ReturnModelType } from '@typegoose/typegoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ObjectId } from 'mongodb';

describe('GameServersService', () => {
  const mongod = new MongoMemoryServer();
  let service: GameServersService;
  let gameServerModel: ReturnModelType<typeof GameServer>;
  let testGameServer: DocumentType<GameServer>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypegooseModule.forRootAsync({
          useFactory: async () => ({
            uri: await mongod.getConnectionString(),
            useNewUrlParser: true,
            useUnifiedTopology: true,
          }),
        }),
        TypegooseModule.forFeature([GameServer]),
      ],
      providers: [
        GameServersService,
      ],
    }).compile();

    service = module.get<GameServersService>(GameServersService);
    gameServerModel = module.get(getModelToken('GameServer'));
  });

  beforeEach(async () => {
    testGameServer = await gameServerModel.create({
      name: 'TEST_GAME_SERVER',
      address: 'localhost',
      port: '27015',
      rconPassword: '123456',
      resolvedIpAddresses: [ '127.0.0.1' ],
    });
  });

  afterEach(async () => await gameServerModel.deleteMany({ }));

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getAllServers()', () => {
    it('should query model', async () => {
      const ret = await service.getAllGameServers();
      expect(ret.length).toBe(1);
      expect(ret[0].toJSON()).toEqual(testGameServer.toJSON());
    });
  });

  describe('#getById()', () => {
    it('should query model', async () => {
      const ret = await service.getById(testGameServer.id);
      expect(ret.toJSON()).toEqual(testGameServer.toJSON());
    });
  });

  describe('#removeGameServer()', () => {
    it('should delete the given game server', async () => {
      await service.removeGameServer(testGameServer.id);
      expect(await gameServerModel.countDocuments()).toBe(0);
    });

    it('should fail gracefully', async () => {
      spyOn(gameServerModel, 'deleteOne').and.returnValue(new Promise(resolve => resolve({ ok: false })) as any);
      await expectAsync(service.removeGameServer(testGameServer.id)).toBeRejectedWithError('unable to remove game server');
    });
  });

  describe('#findFreeGameServer()', () => {
    it('should return the server that is both online and free', async () => {
      testGameServer.isFree = true;
      testGameServer.isOnline = true;
      await testGameServer.save();

      const goodServer = await service.findFreeGameServer();
      expect(goodServer.toJSON()).toEqual(testGameServer.toJSON());

      testGameServer.isFree = false;
      testGameServer.isOnline = true;
      await testGameServer.save();
      expect(await service.findFreeGameServer()).toBeNull();

      testGameServer.isFree = true;
      testGameServer.isOnline = false;
      await testGameServer.save();
      expect(await service.findFreeGameServer()).toBeNull();
    });
  });

  describe('#takeServer()', () => {
    it('should set isFree property to false and save', async () => {
      await service.takeServer(testGameServer.id);
      expect((await service.getById(testGameServer.id)).isFree).toBe(false);
    });

    it('should fail gracefully', async () => {
      await expectAsync(service.takeServer(new ObjectId().toString())).toBeRejectedWithError('no such game server');
    });
  });

  describe('#releaseServer()', () => {
    it('should set isFree property to true and save', async () => {
      await service.releaseServer(testGameServer.id);
      expect((await service.getById(testGameServer.id)).isFree).toBe(true);
    });
  });

  describe('#getGameServerByEventSource()', () => {
    it('should return the correct server', async () => {
      const server = await service.getGameServerByEventSource({ address: '127.0.0.1', port: 27015 });
      expect(server.toJSON()).toEqual(testGameServer.toJSON());
    });
  });
});
