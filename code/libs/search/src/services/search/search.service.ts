import {
  Club,
  EventCompetition,
  EventTournament,
  Player,
} from '@badman/api/database';
import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';

@Injectable()
export class SearchService {
  async search(
    query: string
  ): Promise<(Player | Club | EventCompetition | EventTournament)[]> {
    const parts =
      `${query}`
        ?.toLowerCase()
        ?.replace(/[;\\\\/:*?"<>|&',]/, ' ')
        ?.split(' ')
        ?.map((r) => r.trim())
        ?.filter((r) => r?.length > 0)
        ?.filter((r) => (r ?? null) != null) ?? [];

    if (parts.length === 0) {
      return [];
    }

    const results = await Promise.all([
      this._getPlayerResult(parts),
      this._getClubs(parts),
      this._getCompetitionEvents(parts),
      this._getTournamnetsEvents(parts),
    ]);

    return results.flat();
  }

  private async _getPlayerResult(parts: string[]): Promise<Player[]> {
    const queries = [];
    for (const part of parts) {
      queries.push({
        [Op.or]: [
          { firstName: { [Op.iLike]: `%${part}%` } },
          { lastName: { [Op.iLike]: `%${part}%` } },
          { memberId: { [Op.iLike]: `%${part}%` } },
        ],
      });
    }

    // Temporary structure to return the results.
    return await Player.findAll({
      attributes: ['id', 'slug', 'memberId', 'firstName', 'lastName', 'gender'],
      where: { [Op.and]: queries },
      limit: 100,
    });
  }

  private async _getCompetitionEvents(
    parts: string[]
  ): Promise<EventCompetition[]> {
    const queries = [];
    for (const part of parts) {
      queries.push({
        [Op.or]: [{ name: { [Op.iLike]: `%${part}%` } }],
      });
    }

    // Temporary structure to return the results.
    return await EventCompetition.findAll({
      attributes: ['id', 'slug', 'name'],
      order: [['startYear', 'DESC']],
      where: { [Op.and]: queries },
      limit: 100,
    });
  }

  private async _getTournamnetsEvents(
    parts: string[]
  ): Promise<EventTournament[]> {
    const queries = [];
    for (const part of parts) {
      queries.push({
        [Op.or]: [{ name: { [Op.iLike]: `%${part}%` } }],
      });
    }

    // Temporary structure to return the results.
    return await EventTournament.findAll({
      attributes: ['id', 'slug', 'name'],
      order: [['firstDay', 'DESC']],
      where: { [Op.and]: queries },
      limit: 100,
    });
  }

  private async _getClubs(parts: string[]): Promise<Club[]> {
    const queries = [];
    for (const part of parts) {
      queries.push({
        [Op.or]: [
          { name: { [Op.iLike]: `%${part}%` } },
          { abbreviation: { [Op.iLike]: `%${part}%` } },
        ],
      });
    }

    // Temporary structure to return the results.
    return await Club.findAll({
      attributes: ['id', 'slug', 'name', 'abbreviation'],
      where: { [Op.and]: queries },
      limit: 100,
    });
  }
}
