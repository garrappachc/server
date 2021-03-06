import { Test, TestingModule } from '@nestjs/testing';
import { OnlinePlayersService } from './online-players.service';
import { PlayersGateway } from '../gateways/players.gateway';
import { Subject } from 'rxjs';

class PlayersGatewayStub {
  playerConnected = new Subject<any>();
  playerDisconnected = new Subject<any>();
}

describe('OnlinePlayersService', () => {
  let service: OnlinePlayersService;
  let playersGateway: PlayersGatewayStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnlinePlayersService,
        { provide: PlayersGateway, useClass: PlayersGatewayStub },
      ],
    }).compile();

    service = module.get<OnlinePlayersService>(OnlinePlayersService);
    playersGateway = module.get(PlayersGateway);
  });

  beforeEach(() => service.onModuleInit());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should handle player connections and disconnections properly', done => {
    jasmine.clock().install();
    expect(service.getSocketsForPlayer('FAKE_ID')).toEqual([]);

    const socket = { id: 'asdjklhuger', request: { user: { logged_in: true, id: 'FAKE_ID' } } };
    playersGateway.playerConnected.next(socket);
    expect(service.getSocketsForPlayer('FAKE_ID')).toEqual([ socket ] as any);

    playersGateway.playerConnected.next(socket);
    expect(service.getSocketsForPlayer('FAKE_ID')).toEqual([ socket ] as any);

    playersGateway.playerDisconnected.next(socket);
    expect(service.getSocketsForPlayer('FAKE_ID')).toEqual([]);

    service.playerLeft.subscribe(() => {
      jasmine.clock().uninstall();
      done();
    });

    jasmine.clock().tick(10 * 1000 + 1);
  });
});
