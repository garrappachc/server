import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { GameServer } from '../models/game-server';
import { ReturnModelType, DocumentType } from '@typegoose/typegoose';
import { resolve as resolveCb } from 'dns';
import { promisify } from 'util';
import { isServerOnline } from '../utils/is-server-online';

const resolve = promisify(resolveCb);

@Injectable()
export class GameServersService implements OnModuleInit {

  private readonly logger = new Logger(GameServersService.name);

  constructor(
    @InjectModel(GameServer) private gameServerModel: ReturnModelType<typeof GameServer>,
  ) { }

  async getAllGameServers(): Promise<Array<DocumentType<GameServer>>> {
    return await this.gameServerModel.find();
  }

  async getById(gameServerId: string): Promise<DocumentType<GameServer>> {
    return await this.gameServerModel.findById(gameServerId);
  }

  async addGameServer(gameServer: Partial<GameServer>): Promise<DocumentType<GameServer>> {
    const resolvedIpAddresses = await resolve(gameServer.address);
    this.logger.log(`resolved addresses for ${gameServer.address}: ${resolvedIpAddresses}`);
    gameServer.resolvedIpAddresses = resolvedIpAddresses;

    if (!gameServer.mumbleChannelName) {
      const latestServer = await this.gameServerModel.findOne({ mumbleChannelName: { $ne: null } }, {}, { sort: { createdAt: -1 } });
      if (latestServer) {
        const id = parseInt(latestServer.mumbleChannelName, 10) + 1;
        gameServer.mumbleChannelName = `${id}`;
      } else {
        gameServer.mumbleChannelName = '1';
      }
    }

    const ret = await this.gameServerModel.create(gameServer);
    this.logger.log(`game server ${ret.id} (${ret.name}) added`);
    return ret;
  }

  async removeGameServer(gameServerId: string) {
    const { ok } = await this.gameServerModel.deleteOne({ _id: gameServerId });
    if (!ok) {
      throw new Error('unable to remove game server');
    } else {
      this.logger.log(`game server ${gameServerId} removed`);
    }
  }

  async findFreeGameServer(): Promise<DocumentType<GameServer>> {
    const gameServer = this.gameServerModel.findOne({ isOnline: true, isFree: true });
    return gameServer;
  }

  async takeServer(gameServerId: string): Promise<DocumentType<GameServer>> {
    const gameServer = await this.getById(gameServerId);
    if (gameServer) {
      gameServer.isFree = false;
      await gameServer.save();
      this.logger.log(`game server ${gameServerId} (${gameServer.name}) marked as taken`);
      return gameServer;
    } else {
      throw new Error('no such game server');
    }
  }

  async releaseServer(gameServerId: string): Promise<DocumentType<GameServer>>  {
    const gameServer = await this.getById(gameServerId);
    if (gameServer) {
      gameServer.isFree = true;
      await gameServer.save();
      this.logger.log(`game server ${gameServerId} (${gameServer.name}) marked as free`);
      return gameServer;
    } else {
      throw new Error('no such game server');
    }
  }

  async getGameServerByEventSource(eventSource: { address: string; port: number; }): Promise<DocumentType<GameServer>> {
    return await this.gameServerModel.findOne({
      resolvedIpAddresses: eventSource.address,
      port: `${eventSource.port}`,
    });
  }

  onModuleInit() {
    setInterval(() => this.checkAllServers(), 30 * 1000);
  }

  private async checkAllServers() {
    const allGameServers = await this.getAllGameServers();
    for (const server of allGameServers) {
      const isOnline = await isServerOnline(server.address, parseInt(server.port, 10));
      server.isOnline = isOnline;
      // todo verify rcon password
      await server.save();
    }
  }

}
