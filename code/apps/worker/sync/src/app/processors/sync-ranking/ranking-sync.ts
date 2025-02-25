import {
  RankingLastPlace,
  Player,
  RankingPlace,
  RankingSystem,
  RankingSystems,
} from '@badman/api/database';
import { Logger } from '@nestjs/common';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

import moment, { Moment } from 'moment';
import { Op, Transaction } from 'sequelize';
import { Processor, ProcessStep } from '../../processing';
import { correctWrongPlayers, XmlResult } from '../../utils';

export class RankingSyncer {
  private readonly logger = new Logger(RankingSyncer.name);

  public readonly processor: Processor;
  readonly updateMonths = [0, 2, 4, 6, 8, 10];
  readonly fuckedDatesGoods = ['2021-09-12T22:00:00.000Z'];
  readonly fuckedDatesBads = ['2021-09-05T22:00:00.000Z'];

  readonly STEP_RANKING = 'ranking';
  readonly STEP_CATEGORIES = 'categories';
  readonly STEP_PUBLICATIONS = 'publications';
  readonly STEP_POINTS = 'points';
  readonly STEP_INACTIVE = 'inactive';

  readonly xmlParser: XMLParser;

  constructor() {
    this.processor = new Processor(null, { logger: this.logger });
    this.xmlParser = new XMLParser();

    this.processor.addStep(this.getRankings());
    this.processor.addStep(this.getCategories());
    this.processor.addStep(this.getPublications());
    this.processor.addStep(this.getPoints());
  }

  async process(args: { transaction: Transaction }) {
    return this.processor.process({ ...args });
  }

  protected getRankings(): ProcessStep<{
    visualCode: string;
    system: RankingSystem;
  }> {
    return new ProcessStep(
      this.STEP_RANKING,
      async (args: { transaction: Transaction }) => {
        const resultTournament = await axios.get(
          `${process.env.VR_API}/Ranking`,
          {
            withCredentials: true,
            auth: {
              username: `${process.env.VR_API_USER}`,
              password: `${process.env.VR_API_PASS}`,
            },
            headers: {
              // eslint-disable-next-line @typescript-eslint/naming-convention
              'Content-Type': 'application/xml',
            },
          }
        );

        const bodyTournament = this.xmlParser.parse(resultTournament.data, {})
          .Result as XmlResult;
        const rankingDetail = Array.isArray(bodyTournament.Ranking)
          ? bodyTournament.Ranking
          : [bodyTournament.Ranking];

        const system = await RankingSystem.findOne({
          where: {
            name: rankingDetail[0].Name,
            rankingSystem: RankingSystems.VISUAL,
          },
          transaction: args.transaction,
        });


        // Default sync 1 week
        const lastDate = moment().subtract(1, 'week');

        return {
          stop: system == null,
          system,
          visualCode: rankingDetail[0].Code,
          lastDate: lastDate ? moment(lastDate).toDate() : null,
        };
      }
    );
  }

  protected getCategories(): ProcessStep<{ code: string; name: string }[]> {
    return new ProcessStep(this.STEP_CATEGORIES, async () => {
      const ranking: { visualCode: string; system: RankingSystem } =
        this.processor.getData(this.STEP_RANKING);

      const resultTournament = await axios.get(
        `${process.env.VR_API}/Ranking/${ranking.visualCode}/Category`,
        {
          withCredentials: true,
          auth: {
            username: `${process.env.VR_API_USER}`,
            password: `${process.env.VR_API_PASS}`,
          },
          headers: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Content-Type': 'application/xml',
          },
        }
      );

      const bodyTournament = this.xmlParser.parse(resultTournament.data)
        .Result as XmlResult;

      return bodyTournament.RankingCategory.map((c) => {
        return {
          code: c.Code,
          name: c.Name,
        };
      });
    });
  }

  protected getPublications(): ProcessStep<VisualPublication[]> {
    return new ProcessStep(this.STEP_PUBLICATIONS, async () => {
      const ranking: { visualCode: string; system: RankingSystem } =
        this.processor.getData(this.STEP_RANKING);

      const resultTournament = await axios.get(
        `${process.env.VR_API}/Ranking/${ranking.visualCode}/Publication`,
        {
          withCredentials: true,
          auth: {
            username: `${process.env.VR_API_USER}`,
            password: `${process.env.VR_API_PASS}`,
          },
          headers: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Content-Type': 'application/xml',
          },
        }
      );

      const bodyTournament = this.xmlParser.parse(resultTournament.data)
        .Result as XmlResult;

      let pubs = bodyTournament.RankingPublication.filter(
        (publication) => publication.Visible
      ).map((publication) => {
        const momentDate = moment(publication.PublicationDate, 'YYYY-MM-DD');
        let canUpdate = false;

        if (this.updateMonths.includes(momentDate.month())) {
          const firstMondayOfMonth = momentDate.clone().date(1).day(8);
          if (firstMondayOfMonth.date() > 7) {
            firstMondayOfMonth.day(-6);
          }

          // Create some margin
          const margin = firstMondayOfMonth.clone().add(2, 'days');
          canUpdate =
            momentDate.isSame(firstMondayOfMonth) ||
            momentDate.isBetween(firstMondayOfMonth, margin);
        }

        if (this.fuckedDatesGoods.includes(momentDate.toISOString())) {
          canUpdate = true;
        }
        if (this.fuckedDatesBads.includes(momentDate.toISOString())) {
          canUpdate = false;
        }

        return {
          usedForUpdate: canUpdate,
          code: publication.Code,
          name: publication.Name,
          year: publication.Year,
          week: publication.Week,
          publicationDate: publication.PublicationDate,
          visible: publication.Visible,
          date: momentDate,
        } as VisualPublication;
      });
      pubs = pubs.sort((a, b) => a.date.diff(b.date));
      return pubs;
    });
  }

  protected getPoints(): ProcessStep {
    return new ProcessStep(
      this.STEP_POINTS,
      async (args: { transaction: Transaction }) => {
        const ranking: {
          visualCode: string;
          system: RankingSystem;
          lastDate: Date;
        } = this.processor.getData(this.STEP_RANKING);

        const publications: VisualPublication[] = this.processor.getData(
          this.STEP_PUBLICATIONS
        );

        const categories: { code: string; name: string }[] =
          this.processor.getData(this.STEP_CATEGORIES);

        const pointsForCategory = async (
          publication: VisualPublication,
          category: string,
          places: Map<string, RankingPlace>,
          type: 'single' | 'double' | 'mix',
          gender: 'M' | 'F'
        ) => {
          const resultTournament = await axios.get(
            `${process.env.VR_API}/Ranking/${ranking.visualCode}/Publication/${publication.code}/Category/${category}`,
            {
              withCredentials: true,
              auth: {
                username: `${process.env.VR_API_USER}`,
                password: `${process.env.VR_API_PASS}`,
              },
              headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Content-Type': 'application/xml',
              },
            }
          );
          const bodyTournament = this.xmlParser.parse(resultTournament.data)
            .Result as XmlResult;

          const memberIds = bodyTournament.RankingPublicationPoints.map(
            (points) =>
              correctWrongPlayers({ memberId: `${points.Player1.MemberID}` })
                .memberId
          );

          this.logger.debug(
            `Getting ${memberIds.length} players for ${publication.name} ${type} ${gender}`
          );

          const players = await Player.findAll({
            attributes: ['id', 'memberId'],
            where: {
              memberId: {
                [Op.in]: memberIds,
              },
            },
            include: [
              {
                required: false,
                model: RankingLastPlace,
                where: {
                  systemId: ranking.system.id,
                },
                attributes: ['id', 'systemId', 'single', 'double', 'mix'],
              },
            ],
            transaction: args.transaction,
          });

          for (const points of bodyTournament.RankingPublicationPoints) {
            let foundPlayer = players.find(
              (p) =>
                p.memberId ===
                correctWrongPlayers({ memberId: `${points.Player1.MemberID}` })
                  .memberId
            );

            if (foundPlayer == null) {
              this.logger.log('New player');
              const [firstName, ...lastName] =
                points.Player1.Name.split(' ').filter(Boolean);
              foundPlayer = await new Player(
                correctWrongPlayers({
                  memberId: points.Player1.MemberID,
                  firstName,
                  lastName: lastName.join(' '),
                  gender,
                })
              ).save({ transaction: args.transaction });
            }
            if (places.has(foundPlayer.id)) {
              places.get(foundPlayer.id)[type] = points.Level;
              places.get(foundPlayer.id)[`${type}Points`] = points.Totalpoints;
              places.get(foundPlayer.id)[`${type}Rank`] = points.Rank;
            } else {
              places.set(
                foundPlayer.id,
                new RankingPlace({
                  updatePossible: publication.usedForUpdate,
                  playerId: foundPlayer.id,
                  rankingDate: publication.date.toDate(),
                  [type]: points.Level,
                  [`${type}Points`]: points.Totalpoints,
                  [`${type}Rank`]: points.Rank,
                  systemId: ranking.system.id,
                  gender,
                })
              );

              if (
                publication.usedForUpdate === false &&
                foundPlayer.rankingLastPlaces != null
              ) {
                const place = foundPlayer.rankingLastPlaces.find(
                  (r) => r.systemId === ranking.system.id
                );
                if (
                  place != null &&
                  place[type] != null &&
                  place[type] !== points.Level
                ) {
                  place[type] = points.Level;
                  await place.save({ transaction: args.transaction });
                }
              }
            }
          }
        };

        for (const publication of publications) {
          const rankingPlaces = new Map<string, RankingPlace>();

          if (publication.date.isAfter(ranking.lastDate)) {
            if (publication.usedForUpdate) {
              this.logger.log(`Updating ranking on ${publication.date}`);
            }

            this.logger.debug(
              'Removing old points for date (voiding collision)'
            );
            await RankingPlace.destroy({
              where: {
                rankingDate: publication.date.toDate(),
                systemId: ranking.system.id,
              },
              transaction: args.transaction,
            });

            this.logger.debug(
              `Getting single levels for ${publication.date.format('LLL')}`
            );
            await pointsForCategory(
              publication,
              categories.find((category) => category.name === 'HE/SM').code,
              rankingPlaces,
              'single',
              'M'
            );
            await pointsForCategory(
              publication,
              categories.find((category) => category.name === 'DE/SD').code,
              rankingPlaces,
              'single',
              'F'
            );

            this.logger.debug(
              `Getting double levels for ${publication.date.format('LLL')}`
            );
            await pointsForCategory(
              publication,
              categories.find((category) => category.name === 'HD/DM').code,
              rankingPlaces,
              'double',
              'M'
            );
            await pointsForCategory(
              publication,
              categories.find((category) => category.name === 'DD').code,
              rankingPlaces,
              'double',
              'F'
            );

            this.logger.debug(
              `Getting mix levels for ${publication.date.format('LLL')}`
            );
            await pointsForCategory(
              publication,
              categories.find((category) => category.name === 'GD H/DX M').code,
              rankingPlaces,
              'mix',
              'M'
            );
            await pointsForCategory(
              publication,
              categories.find((category) => category.name === 'GD D/DX D').code,
              rankingPlaces,
              'mix',
              'F'
            );

            const instances = Array.from(rankingPlaces).map(([, place]) =>
              place.toJSON()
            );
            await RankingPlace.bulkCreate(instances, {
              ignoreDuplicates: true,
              transaction: args.transaction,
              returning: false,
            });

            this.logger.debug(`RankingPlace were created`);

            ranking.system.caluclationIntervalLastUpdate =
              publication.date.toDate();
            if (publication.usedForUpdate) {
              ranking.system.updateIntervalAmountLastUpdate =
                publication.date.toDate();
            }
            await ranking.system.save({ transaction: args.transaction });
          }
        }
      }
    );
  }
}

interface VisualPublication {
  usedForUpdate: boolean;
  code: string;
  name: string;
  year: string;
  week: string;
  publicationDate: Date;
  visible: string;
  date: Moment;
}
