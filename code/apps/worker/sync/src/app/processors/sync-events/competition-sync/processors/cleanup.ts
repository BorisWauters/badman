import {
  DrawCompetition,
  EncounterCompetition,
  EventCompetition,
  Game
} from '@badman/api/database';
import { Op } from 'sequelize';
import { StepOptions, StepProcessor } from '../../../../processing';


export class CompetitionSyncCleanupProcessor extends StepProcessor {
  public event: EventCompetition;

  constructor(
    options?: StepOptions
  ) {
    super(options);
  }

  public async process(): Promise<void> {
    if (!this.event) {
      throw new Error('No Event');
    }

    const subEvents = await this.event.getSubEventCompetitions({
      transaction: this.transaction,
    });

    // Remove subEvents that are not in the xml
    const removedSubEvents = subEvents.filter((s) => s.visualCode == null);
    for (const removed of removedSubEvents) {
      const gameIds = (
        await Game.findAll({
          attributes: ['id'],
          include: [
            {
              attributes: [],
              model: EncounterCompetition,
              required: true,
              include: [
                {
                  attributes: [],
                  required: true,
                  model: DrawCompetition,
                  where: {
                    subeventId: removed.id,
                  },
                },
              ],
            },
          ],
          transaction: this.transaction,
        })
      )
        ?.map((g) => g.id)
        ?.filter((g) => !!g);

      if (gameIds && gameIds.length > 0) {
        await Game.destroy({
          where: {
            id: {
              [Op.in]: gameIds,
            },
          },
          transaction: this.transaction,
        });
      }

      await removed.destroy({ transaction: this.transaction });
    }
  }

}
