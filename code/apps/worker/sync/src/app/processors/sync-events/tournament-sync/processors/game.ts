import {
  DrawTournament,
  Game,
  GamePlayerMembership,
  GameStatus,
  Player,
} from '@badman/api/database';
import moment from 'moment-timezone';
import { StepProcessor, StepOptions } from '../../../../processing';
import { VisualService } from '../../../../services';
import {
  XmlTournament,
  XmlMatch,
  XmlScoreStatus,
  XmlPlayer,
  correctWrongPlayers,
} from '../../../../utils';
import { DrawStepData } from './draw';
import { EventStepData } from './event';
import { SubEventStepData } from './subEvent';

export interface GameStepOptions {
  newGames?: boolean;
}

export class TournamentSyncGameProcessor extends StepProcessor {
  public players: Map<string, Player>;
  public draws: DrawStepData[];
  public subEvents: SubEventStepData[];
  public event: EventStepData;
  private _games: Game[] = [];

  private gameOptions: GameStepOptions;

  constructor(
    protected readonly visualTournament: XmlTournament,
    protected readonly visualService: VisualService,
    options?: StepOptions & GameStepOptions
  ) {
    super(options);

    this.gameOptions = options || {};
  }

  public async process(): Promise<Game[]> {
    await Promise.all(
      this.draws.map((e) => this._processSubevent(e.draw, e.internalId))
    );

    return this._games;
  }

  private async _processSubevent(draw: DrawTournament, internalId: number) {
    const games = await draw.getGames({
      transaction: this.transaction,
      // include: [Player]
    });
    const subEvent = this.subEvents.find(
      (sub) => draw.subeventId === sub.subEvent.id
    ).subEvent;

    const isLastWeek = moment()
      .subtract(2, 'week')
      .isBefore(this.event.event.firstDay);

    const visualMatch = (await this.visualService.getMatches(
      this.visualTournament.Code,
      internalId,
      !isLastWeek
    )) as XmlMatch[];

    for (const xmlMatch of visualMatch) {
      let game = games.find((r) => r.visualCode === `${xmlMatch.Code}`);

      const playedAt =
        xmlMatch.MatchTime != null
          ? moment(xmlMatch.MatchTime).tz('Europe/Brussels').toDate()
          : this.event.event.firstDay;

      // Check if encounter was before last run, skip if only process new events
      if (this.gameOptions.newGames && playedAt < this.lastRun) {
        continue;
      }

      let gameStatus = GameStatus.NORMAL;
      switch (xmlMatch.ScoreStatus) {
        case XmlScoreStatus.Retirement:
          gameStatus = GameStatus.RETIREMENT;
          break;
        case XmlScoreStatus.Disqualified:
          gameStatus = GameStatus.DISQUALIFIED;
          break;
        case XmlScoreStatus['No Match']:
          gameStatus = GameStatus.NO_MATCH;
          break;
        case XmlScoreStatus.Walkover:
          gameStatus = GameStatus.WALKOVER;
          break;
        default:
        case XmlScoreStatus.Normal:
          // This is the case when the tournament didn't configured their score status
          if (
            // No scores
            xmlMatch?.Sets?.Set[0]?.Team1 == null &&
            xmlMatch?.Sets?.Set[0]?.Team2 == null &&
            // But not both players filled
            !(
              xmlMatch?.Team1?.Player1?.MemberID == null &&
              xmlMatch?.Team2?.Player1?.MemberID == null
            ) &&
            // And not both players null
            (xmlMatch?.Team2?.Player1?.MemberID !== null ||
              xmlMatch?.Team2?.Player1?.MemberID !== null)
          ) {
            gameStatus = GameStatus.WALKOVER;
          } else {
            gameStatus = GameStatus.NORMAL;
          }
          break;
      }

      if (!game) {
        game = new Game({
          round: xmlMatch.RoundName,
          order: xmlMatch.MatchOrder,
          winner: xmlMatch.Winner,
          gameType: subEvent.gameType,
          visualCode: xmlMatch.Code,
          linkId: draw.id,
          linkType: 'tournament',
          status: gameStatus,
          playedAt,
          set1Team1: xmlMatch?.Sets?.Set[0]?.Team1,
          set1Team2: xmlMatch?.Sets?.Set[0]?.Team2,
          set2Team1: xmlMatch?.Sets?.Set[1]?.Team1,
          set2Team2: xmlMatch?.Sets?.Set[1]?.Team2,
          set3Team1: xmlMatch?.Sets?.Set[2]?.Team1,
          set3Team2: xmlMatch?.Sets?.Set[2]?.Team2,
        });
      } else {
        if (game.playedAt != playedAt) {
          game.playedAt = playedAt;
        }

        if (game.order != xmlMatch.MatchOrder) {
          game.order = xmlMatch.MatchOrder;
        }

        if (game.round != xmlMatch.RoundName) {
          game.round = xmlMatch.RoundName;
        }

        if (game.winner != xmlMatch.Winner) {
          game.winner = xmlMatch.Winner;
        }

        if (game.set1Team1 != xmlMatch?.Sets?.Set[0]?.Team1) {
          game.set1Team1 = xmlMatch?.Sets?.Set[0]?.Team1;
        }

        if (game.set1Team2 != xmlMatch?.Sets?.Set[0]?.Team2) {
          game.set1Team2 = xmlMatch?.Sets?.Set[0]?.Team2;
        }

        if (game.set2Team1 != xmlMatch?.Sets?.Set[1]?.Team1) {
          game.set2Team1 = xmlMatch?.Sets?.Set[1]?.Team1;
        }

        if (game.set2Team2 != xmlMatch?.Sets?.Set[1]?.Team2) {
          game.set2Team2 = xmlMatch?.Sets?.Set[1]?.Team2;
        }

        if (game.set3Team1 != xmlMatch?.Sets?.Set[2]?.Team1) {
          game.set3Team1 = xmlMatch?.Sets?.Set[2]?.Team1;
        }

        if (game.set3Team2 != xmlMatch?.Sets?.Set[2]?.Team2) {
          game.set3Team2 = xmlMatch?.Sets?.Set[2]?.Team2;
        }

        if (game.status !== gameStatus) {
          game.status = gameStatus;
        }
      }

      await game.save({ transaction: this.transaction });
      await GamePlayerMembership.bulkCreate(
        this._createGamePlayers(xmlMatch, game),
        {
          transaction: this.transaction,
          ignoreDuplicates: true,
        }
      );
    }

    // Remove draw that are not in the xml
    const removedGames = games.filter((g) => g.visualCode == null);
    for (const removed of removedGames) {
      await removed.destroy({ transaction: this.transaction });
      games.splice(games.indexOf(removed), 1);
    }

    this._games = this._games.concat(games);
  }

  private _createGamePlayers(xmlMatch: XmlMatch, game: Game) {
    const gamePlayers = [];
    game.players = [];

    const t1p1 = this._getPlayer(xmlMatch?.Team1?.Player1);
    const t1p2 = this._getPlayer(xmlMatch?.Team1?.Player2);
    const t2p1 = this._getPlayer(xmlMatch?.Team2?.Player1);
    const t2p2 = this._getPlayer(xmlMatch?.Team2?.Player2);

    if (t1p1) {
      const gp = new GamePlayerMembership({
        gameId: game.id,
        playerId: t1p1.id,
        team: 1,
        player: 1,
      });
      gamePlayers.push(gp.toJSON());

      // Push to list
      game.players.push({
        ...t1p1.toJSON(),
        GamePlayerMembership: gp,
      } as Player & { GamePlayerMembership: GamePlayerMembership });
    }

    if (t1p2 && t1p2?.id !== t1p1?.id) {
      const gp = new GamePlayerMembership({
        gameId: game.id,
        playerId: t1p2.id,
        team: 1,
        player: 2,
      });
      gamePlayers.push(gp.toJSON());
      // Push to list
      game.players.push({
        ...t1p2.toJSON(),
        GamePlayerMembership: gp,
      } as Player & { GamePlayerMembership: GamePlayerMembership });
    }

    if (t2p1) {
      const gp = new GamePlayerMembership({
        gameId: game.id,
        playerId: t2p1.id,
        team: 2,
        player: 1,
      });
      gamePlayers.push(gp.toJSON());
      // Push to list
      game.players.push({
        ...t2p1.toJSON(),
        GamePlayerMembership: gp,
      } as Player & { GamePlayerMembership: GamePlayerMembership });
    }

    if (t2p2 && t2p2?.id !== t2p1?.id) {
      const gp = new GamePlayerMembership({
        gameId: game.id,
        playerId: t2p2.id,
        team: 2,
        player: 2,
      });
      gamePlayers.push(gp.toJSON());
      // Push to list
      game.players.push({
        ...t2p2.toJSON(),
        GamePlayerMembership: gp,
      } as Player & { GamePlayerMembership: GamePlayerMembership });
    }

    return gamePlayers;
  }

  private _getPlayer(player: XmlPlayer) {
    let returnPlayer = this.players.get(`${player?.MemberID}`);

    if ((returnPlayer ?? null) == null && (player ?? null) != null) {
      // Search our map for unkowns
      const corrected = correctWrongPlayers({
        firstName: player.Firstname,
        lastName: player.Lastname,
      });

      returnPlayer = [...this.players.values()].find(
        (p) =>
          (p.firstName === corrected.firstName &&
            p.lastName === corrected.lastName) ||
          (p.firstName === corrected.lastName &&
            p.lastName === corrected.firstName)
      );
    }
    return returnPlayer;
  }
}
