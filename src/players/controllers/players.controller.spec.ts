import { Test, TestingModule } from '@nestjs/testing';
import { PlayersController } from './players.controller';
import { PlayersService } from '../services/players.service';
import { Player } from '../models/player';
import { GamesService } from '@/games/services/games.service';
import { Game } from '@/games/models/game';
import { PlayerStats } from '../models/player-stats';
import { PlayerSkillService } from '../services/player-skill.service';
import { PlayerSkill } from '../models/player-skill';
import { PlayerBansService } from '../services/player-bans.service';

class PlayersServiceStub {
  player: Player = {
    id: 'FAKE_ID',
    name: 'FAKE_PLAYER_NAME',
    steamId: 'FAKE_STEAM_ID',
    hasAcceptedRules: true,
  };
  stats: PlayerStats = {
    player: 'FAKE_ID',
    gamesPlayed: 220,
    classesPlayed: {
      scout: 19,
      soldier: 102,
      demoman: 0,
      medic: 92,
    },
  };
  getAll() { return new Promise(resolve => resolve([ this.player ])); }
  getById(id: string) { return new Promise(resolve => resolve(this.player)); }
  updatePlayer(playerId: string, update: Partial<Player>) { return new Promise(resolve => resolve(this.player)); }
  getPlayerStats(playerId: string) { return new Promise(resolve => resolve(this.stats)); }
}

class GamesServiceStub {
  games: Game[] = [
    { number: 1, map: 'cp_fake_rc1', state: 'ended' },
    { number: 2, map: 'cp_fake_rc2', state: 'launching' },
  ];
  getPlayerGames(playerId: string, sort: any = { launchedAt: -1 }, limit: number = 10, skip: number = 0) {
    return new Promise(resolve => resolve(this.games));
  }
  getPlayerGameCount() { return new Promise(resolve => resolve(2)); }
}

class PlayerSkillServiceStub {
  skill: PlayerSkill = {
    player: 'FAKE_ID' as any,
    skill: new Map<string, number>([['scout', 2], ['soldier', 2], ['demoman', 1], ['medic', 2]]),
  };
  getPlayerSkill(playerId: string) { return new Promise(resolve => resolve(this.skill)); }
  setPlayerSkill(playerId: string, skill: any) { return new Promise(resolve => resolve(this.skill)); }
  getAll() { return new Promise(resolve => resolve([ this.skill ])); }
}

class PlayerBansServiceStub {
  bans = [
    {
        player: '5d448875b963ff7e00c6b6b3',
        admin: '5d448875b963ff7e00c6b6b3',
        start: '2019-12-16T00:23:55.000Z',
        end: '2019-12-17T01:51:49.183Z',
        reason: 'test',
        id: '5df833c256e77d8768130f9a',
    },
    {
        player: '5d448875b963ff7e00c6b6b3',
        start: '2019-10-29T13:23:38.626Z',
        end: '2019-10-29T14:23:38.626Z',
        reason: 'test',
        admin: '5d448875b963ff7e00c6b6b3',
        id: '5db83d5a593cc645933cce54',
    },
    {
        player: '5d448875b963ff7e00c6b6b3',
        start: '2019-10-25T12:15:54.882Z',
        end: '2019-10-25T12:16:25.442Z',
        reason: 'test',
        admin: '5d448875b963ff7e00c6b6b3',
        id: '5db2e77abbf17f2a9101a9f6',
    },
    {
        player: '5d448875b963ff7e00c6b6b3',
        start: '2019-10-25T12:06:20.123Z',
        end: '2019-10-25T12:06:28.919Z',
        reason: 'test',
        admin: '5d448875b963ff7e00c6b6b3',
        id: '5db2e53c80e22f6e05200875',
    },
  ];
  getPlayerBans(playerId: string) { return new Promise(resolve => resolve(this.bans)); }
  addPlayerBan(ban: any) { return new Promise(resolve => resolve(ban)); }
}

describe('Players Controller', () => {
  let controller: PlayersController;
  let playersService: PlayersServiceStub;
  let gamesService: GamesServiceStub;
  let playerSkillService: PlayerSkillServiceStub;
  let playerBansService: PlayerBansServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: PlayersService, useClass: PlayersServiceStub },
        { provide: GamesService, useClass: GamesServiceStub },
        { provide: PlayerSkillService, useClass: PlayerSkillServiceStub },
        { provide: PlayerBansService, useClass: PlayerBansServiceStub },
      ],
      controllers: [PlayersController],
    }).compile();

    controller = module.get<PlayersController>(PlayersController);
    playersService = module.get(PlayersService);
    gamesService = module.get(GamesService);
    playerSkillService = module.get(PlayerSkillService);
    playerBansService = module.get(PlayerBansService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#getAllPlayers()', () => {
    it('should return all players', async () => {
      const spy = spyOn(playersService, 'getAll').and.callThrough();
      const players = await controller.getAllPlayers();
      expect(spy).toHaveBeenCalled();
      expect(players).toEqual([ playersService.player ] as any[]);
    });
  });

  describe('#getPlayer()', () => {
    it('should return the player', async () => {
      const spy = spyOn(playersService, 'getById').and.callThrough();
      const ret = await controller.getPlayer('FAKE_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
      expect(ret).toEqual(playersService.player as any);
    });

    it('should return 404', async () => {
      spyOn(playersService, 'getById').and.returnValue(new Promise(resolve => resolve(null)));
      await expectAsync(controller.getPlayer('FAKE_ID')).toBeRejectedWithError();
    });
  });

  describe('#updatePlayer()', () => {
    it('should update the player', async () => {
      const spy = spyOn(playersService, 'updatePlayer').and.callThrough();
      const ret = await controller.updatePlayer('FAKE_ID', { name: 'FAKE_NEW_NAME' });
      expect(spy).toHaveBeenCalledWith('FAKE_ID', { name: 'FAKE_NEW_NAME' });
      expect(ret).toEqual(playersService.player as any);
    });
  });

  describe('#getPlayerGames()', () => {
    it('should return player games', async () => {
      const spy1 = spyOn(gamesService, 'getPlayerGames').and.callThrough();
      const spy2 = spyOn(gamesService, 'getPlayerGameCount').and.callThrough();

      const ret = await controller.getPlayerGames('FAKE_ID', 44, 52, 'launched_at');
      expect(spy1).toHaveBeenCalledWith('FAKE_ID', { launchedAt: 1 }, 44, 52);
      expect(spy2).toHaveBeenCalled();
      expect(ret).toEqual({
        results: gamesService.games,
        itemCount: 2,
      } as any);
    });

    it('should throw an error unless the sort param is correct', async () => {
      await expectAsync(controller.getPlayerGames('FAKE_ID', 3, 5, 'lol')).toBeRejectedWithError();
    });
  });

  describe('#getPlayerStats()', () => {
    it('should return player stats', async () => {
      const spy = spyOn(playersService, 'getPlayerStats').and.callThrough();
      const ret = await controller.getPlayerStats('FAKE_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
      expect(ret).toEqual(playersService.stats);
    });
  });

  describe('#getAllPlayerSkills()',  () => {
    it('should return all players\' skills', async () => {
      const spy = spyOn(playerSkillService, 'getAll').and.callThrough();
      const ret = await controller.getAllPlayerSkills();
      expect(spy).toHaveBeenCalled();
      expect(ret).toEqual([ playerSkillService.skill ] as any);
    });
  });

  describe('#getPlayerSkill()', () => {
    it('should return player skill', async () => {
      const spy = spyOn(playerSkillService, 'getPlayerSkill').and.callThrough();
      const ret = await controller.getPlayerSkill('FAKE_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
      expect(ret).toEqual(playerSkillService.skill.skill);
    });
  });

  describe('#setPlayerSkill()', () => {
    it('should set player skill', async () => {
      const skill = { soldier: 1, medic: 2 };
      const spy = spyOn(playerSkillService, 'setPlayerSkill').and.callThrough();
      const ret = await controller.setPlayerSkill('FAKE_ID', skill);
      expect(spy).toHaveBeenCalledWith('FAKE_ID', skill);
      expect(ret).toEqual(playerSkillService.skill.skill);
    });
  });

  describe('#getPlayerBans()', () => {
    it('should return player bans', async () => {
      const spy = spyOn(playerBansService, 'getPlayerBans').and.callThrough();
      const ret = await controller.getPlayerBans('FAKE_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
      expect(ret).toEqual(playerBansService.bans as any);
    });
  });

  describe('#addPlayerBan()', () => {
    const ban = {
      player: '5d448875b963ff7e00c6b6b3',
      admin: '5d448875b963ff7e00c6b6b3',
      start: '2019-12-16T00:23:55.000Z',
      end: '2019-12-17T01:51:49.183Z',
      reason: 'dupa',
      id: '5df833c256e77d8768130f9a',
    };

    it('should add player ban', async () => {
      const spy = spyOn(playerBansService, 'addPlayerBan').and.callThrough();
      const ret = await controller.addPlayerBan('FAKE_ID', ban as any, { id: '5d448875b963ff7e00c6b6b3' });
      expect(spy).toHaveBeenCalledWith(ban);
      expect(ret).toEqual(ban as any);
    });

    it('should fail if the authorized user id is not the same as admin\'s', async () => {
      await expectAsync(controller.addPlayerBan('FAKE_ID', ban as any, { id: 'SOME_ID' })).toBeRejectedWithError();
    });
  });
});
