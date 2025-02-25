import { Field, ID, InputType, ObjectType, OmitType, PartialType } from '@nestjs/graphql';
import {
  BelongsToGetAssociationMixin,
  BelongsToManyAddAssociationMixin,
  BelongsToManyAddAssociationsMixin,
  BelongsToManyCountAssociationsMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManyHasAssociationMixin,
  BelongsToManyHasAssociationsMixin,
  BelongsToManyRemoveAssociationMixin,
  BelongsToManyRemoveAssociationsMixin,
  BelongsToManySetAssociationsMixin,
  BelongsToSetAssociationMixin,
  BuildOptions,
  CreateOptions,
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManyCountAssociationsMixin,
  HasManyGetAssociationsMixin,
  HasManyHasAssociationMixin,
  HasManyHasAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManySetAssociationsMixin,
} from 'sequelize';
import {
  BeforeBulkCreate,
  BeforeCreate,
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  Index,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from 'sequelize-typescript';
import { SubEventType } from '../enums';
import { UseForTeamName } from '../enums/useForTeams.enum';
import { Slugify } from '../types';
import { TeamPlayer } from '../_interception';
import { Club } from './club.model';
import {
  EncounterCompetition,
  EventEntry,
  Location,
  SubEventCompetition,
} from './event';
import { TeamLocationCompetition } from './event/competition/team-location-membership.model';
import { Player } from './player.model';
import { RankingSystem } from './ranking';
import { TeamPlayerMembership } from './team-player-membership.model';

@Table({
  timestamps: true,
  schema: 'public',
})
@ObjectType({ description: 'A Team' })
export class Team extends Model {
  constructor(values?: Partial<Team>, options?: BuildOptions) {
    super(values, options);
  }

  @Field({ nullable: true })
  updatedAt?: Date;

  @Field({ nullable: true })
  createdAt?: Date;

  @Field(() => ID)
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id!: string;

  @Field({ nullable: true })
  @Unique('unique_constraint')
  @Column
  name: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.TIME)
  preferredTime: Date;

  @Field(() => String, { nullable: true })
  @Column(
    DataType.ENUM(
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday'
    )
  )
  preferredDay: string;

  @BelongsToMany(() => Location, () => TeamLocationCompetition)
  locations: Location[];

  @Field({ nullable: true })
  @Column
  abbreviation: string;

  @HasMany(() => EventEntry, 'teamId')
  entries: EventEntry[];

  @Field(() => Club, { nullable: true })
  @BelongsTo(() => Club, 'clubId')
  club?: Club;

  @Field({ nullable: true })
  @ForeignKey(() => Club)
  @Unique('unique_constraint')
  @Index('club_index')
  @Column
  clubId: string;

  @Field({ nullable: true })
  @Column
  slug: string;

  @Field(() => [TeamPlayer], { nullable: true })
  @BelongsToMany(() => Player, () => TeamPlayerMembership)
  players: (Player & { TeamPlayerMembership: TeamPlayerMembership })[];

  @Field(() => String, { nullable: true })
  @Column({
    type: DataType.STRING,
  })
  type: SubEventType;

  @Field(() => Player, { nullable: true })
  @BelongsTo(() => Player, 'captainId')
  captain: Player;

  @Field({ nullable: true })
  @Column
  captainId: string;

  @Field({ nullable: true })
  @Column
  email: string;

  @Field({ nullable: true })
  @Column
  phone: string;

  @Field({ nullable: true })
  @Unique('unique_constraint')
  @Column
  teamNumber?: number;

  @Field({ nullable: true })
  @Default(true)
  @Column
  active: boolean;

  @HasMany(() => EncounterCompetition, 'homeTeamId')
  homeEncounters: EncounterCompetition;

  @HasMany(() => EncounterCompetition, 'awayTeamId')
  awayEncounters: EncounterCompetition;

  // #region hooks
  @BeforeBulkCreate
  static async setAbbriviations(instances: Team[], options: CreateOptions) {
    for (const instance of instances ?? []) {
      await this.setAbbriviation(instance, options);
    }
  }

  @BeforeCreate
  static async setAbbriviation(instance: Team, options: CreateOptions) {
    if (instance.isNewRecord) {
      await this.generateAbbreviation(instance, options);
    }
  }

  static async generateAbbreviation(
    instance: Team,
    options: CreateOptions,
    club?: Club
  ) {
    club =
      club ?? (await instance.getClub({ transaction: options.transaction }));

    switch (club?.useForTeamName ?? UseForTeamName.NAME) {
      case UseForTeamName.FULL_NAME:
        instance.name = `${club.fullName} ${
          instance.teamNumber
        }${this.getLetterForRegion(instance.type, 'vl')}`;
        break;
      case UseForTeamName.ABBREVIATION:
        instance.name = `${club.abbreviation} ${
          instance.teamNumber
        }${this.getLetterForRegion(instance.type, 'vl')}`;
        break;

      default:
      case UseForTeamName.NAME:
        instance.name = `${club.name} ${
          instance.teamNumber
        }${this.getLetterForRegion(instance.type, 'vl')}`;
        break;
    }

    instance.abbreviation = `${club.abbreviation} ${
      instance.teamNumber
    }${this.getLetterForRegion(instance.type, 'vl')}`;
  }
  // #endregion

  private _baseIndex = -1;

  baseIndex(system: RankingSystem): number {
    // Only run this once per team
    if (this._baseIndex !== -1) {
      return this._baseIndex;
    }

    if (this.players?.length === null) {
      return -1;
    }

    this._baseIndex = Team.getIndexFromPlayers(
      this.type,
      this.basePlayers(system).map((r) =>
        r.rankingLastPlaces?.find((place) => place.systemId === system.id)
      )
    );
    return this._baseIndex;
  }

  private _basePlayers: Player[] | null = null;
  basePlayers(system: RankingSystem): Player[] {
    if (this._basePlayers !== null) {
      return this._basePlayers;
    }

    this._basePlayers = this.players.filter(
      (r) => r.getDataValue('TeamPlayerMembership')?.base ?? false
    );

    if (this._basePlayers.length > 4) {
      if (this.type === SubEventType.MX) {
        this._basePlayers = [
          ...this._basePlayers
            .filter((p) => p.gender === 'M')
            .sort(
              (b, a) =>
                (b.rankingLastPlaces?.find((p) => p.systemId === system.id)
                  ?.single ?? 12) +
                (b.rankingLastPlaces?.find((p) => p.systemId === system.id)
                  ?.double ?? 12) +
                (b.rankingLastPlaces?.find((p) => p.systemId === system.id)
                  ?.mix ?? 12) -
                ((a.rankingLastPlaces?.find((p) => p.systemId === system.id)
                  ?.single ?? 12) +
                  (a.rankingLastPlaces?.find((p) => p.systemId === system.id)
                    ?.double ?? 12) +
                  (a.rankingLastPlaces?.find((p) => p.systemId === system.id)
                    ?.mix ?? 12))
            )
            .slice(0, 2),
          ...this._basePlayers
            .filter((p) => p.gender === 'F')
            .sort(
              (b, a) =>
                (b.rankingLastPlaces?.find((p) => p.systemId === system.id)
                  ?.single ?? 12) +
                (b.rankingLastPlaces?.find((p) => p.systemId === system.id)
                  ?.double ?? 12) +
                (b.rankingLastPlaces?.find((p) => p.systemId === system.id)
                  ?.mix ?? 12) -
                ((a.rankingLastPlaces?.find((p) => p.systemId === system.id)
                  ?.single ?? 12) +
                  (a.rankingLastPlaces?.find((p) => p.systemId === system.id)
                    ?.double ?? 12) +
                  (a.rankingLastPlaces?.find((p) => p.systemId === system.id)
                    ?.mix ?? 12))
            )
            .slice(0, 2),
        ];
      } else {
        this._basePlayers = this._basePlayers
          .sort(
            (b, a) =>
              (b.rankingLastPlaces?.find((p) => p.systemId === system.id)
                ?.single ?? 12) +
              (b.rankingLastPlaces?.find((p) => p.systemId === system.id)
                ?.double ?? 12) -
              ((a.rankingLastPlaces?.find((p) => p.systemId === system.id)
                ?.single ?? 12) +
                (a.rankingLastPlaces?.find((p) => p.systemId === system.id)
                  ?.double ?? 12))
          )
          .slice(0, 4);
      }
    }

    return this._basePlayers;
  }

  regenerateSlug!: Slugify<Team>;

  // Belongs to Club
  getClub!: BelongsToGetAssociationMixin<Club>;
  setClub!: BelongsToSetAssociationMixin<Club, string>;

  // Belongs to many Player
  getPlayers!: BelongsToManyGetAssociationsMixin<Player>;
  setPlayer!: BelongsToManySetAssociationsMixin<Player, string>;
  addPlayers!: BelongsToManyAddAssociationsMixin<Player, string>;
  addPlayer!: BelongsToManyAddAssociationMixin<Player, string>;
  removePlayer!: BelongsToManyRemoveAssociationMixin<Player, string>;
  removePlayers!: BelongsToManyRemoveAssociationsMixin<Player, string>;
  hasPlayer!: BelongsToManyHasAssociationMixin<Player, string>;
  hasPlayers!: BelongsToManyHasAssociationsMixin<Player, string>;
  countPlayer!: BelongsToManyCountAssociationsMixin;

  // Belongs to many SubEvent
  getSubEvents!: BelongsToManyGetAssociationsMixin<SubEventCompetition>;
  setSubEvents!: BelongsToManySetAssociationsMixin<SubEventCompetition, string>;
  addSubEvents!: BelongsToManyAddAssociationsMixin<SubEventCompetition, string>;
  addSubEvent!: BelongsToManyAddAssociationMixin<SubEventCompetition, string>;
  removeSubEvent!: BelongsToManyRemoveAssociationMixin<
    SubEventCompetition,
    string
  >;
  removeSubEvents!: BelongsToManyRemoveAssociationsMixin<
    SubEventCompetition,
    string
  >;
  hasSubEvent!: BelongsToManyHasAssociationMixin<SubEventCompetition, string>;
  hasSubEvents!: BelongsToManyHasAssociationsMixin<SubEventCompetition, string>;
  countSubEvent!: BelongsToManyCountAssociationsMixin;

  // Has many HomeEncounter
  getHomeEncounters!: HasManyGetAssociationsMixin<EncounterCompetition>;
  setHomeEncounters!: HasManySetAssociationsMixin<EncounterCompetition, string>;
  addHomeEncounters!: HasManyAddAssociationsMixin<EncounterCompetition, string>;
  addHomeEncounter!: HasManyAddAssociationMixin<EncounterCompetition, string>;
  removeHomeEncounter!: HasManyRemoveAssociationMixin<
    EncounterCompetition,
    string
  >;
  removeHomeEncounters!: HasManyRemoveAssociationsMixin<
    EncounterCompetition,
    string
  >;
  hasHomeEncounter!: HasManyHasAssociationMixin<EncounterCompetition, string>;
  hasHomeEncounters!: HasManyHasAssociationsMixin<EncounterCompetition, string>;
  countHomeEncounters!: HasManyCountAssociationsMixin;

  // Has many AwayEncounter
  getAwayEncounters!: HasManyGetAssociationsMixin<EncounterCompetition>;
  setAwayEncounters!: HasManySetAssociationsMixin<EncounterCompetition, string>;
  addAwayEncounters!: HasManyAddAssociationsMixin<EncounterCompetition, string>;
  addAwayEncounter!: HasManyAddAssociationMixin<EncounterCompetition, string>;
  removeAwayEncounter!: HasManyRemoveAssociationMixin<
    EncounterCompetition,
    string
  >;
  removeAwayEncounters!: HasManyRemoveAssociationsMixin<
    EncounterCompetition,
    string
  >;
  hasAwayEncounter!: HasManyHasAssociationMixin<EncounterCompetition, string>;
  hasAwayEncounters!: HasManyHasAssociationsMixin<EncounterCompetition, string>;
  countAwayEncounters!: HasManyCountAssociationsMixin;

  // Belongs to many Location
  getLocations!: BelongsToManyGetAssociationsMixin<Location>;
  setLocations!: BelongsToManySetAssociationsMixin<Location, string>;
  addLocations!: BelongsToManyAddAssociationsMixin<Location, string>;
  addLocation!: BelongsToManyAddAssociationMixin<Location, string>;
  removeLocation!: BelongsToManyRemoveAssociationMixin<Location, string>;
  removeLocations!: BelongsToManyRemoveAssociationsMixin<Location, string>;
  hasLocation!: BelongsToManyHasAssociationMixin<Location, string>;
  hasLocations!: BelongsToManyHasAssociationsMixin<Location, string>;
  countLocation!: BelongsToManyCountAssociationsMixin;

  // Belongs to Captain
  getCaptain!: BelongsToGetAssociationMixin<Player>;
  setCaptain!: BelongsToSetAssociationMixin<Player, string>;

  // Has many EventEntry
  getEntries!: HasManyGetAssociationsMixin<EventEntry>;
  setEntries!: HasManySetAssociationsMixin<EventEntry, string>;
  addEntries!: HasManyAddAssociationsMixin<EventEntry, string>;
  addEntry!: HasManyAddAssociationMixin<EventEntry, string>;
  removeEntry!: HasManyRemoveAssociationMixin<EventEntry, string>;
  removeEntries!: HasManyRemoveAssociationsMixin<EventEntry, string>;
  hasEntry!: HasManyHasAssociationMixin<EventEntry, string>;
  hasEntries!: HasManyHasAssociationsMixin<EventEntry, string>;
  countEntries!: HasManyCountAssociationsMixin;

  static getIndexFromPlayers(
    type: SubEventType,
    rankings: ({ single: number; double: number; mix: number } | undefined)[]
  ): number {
    if (type !== 'MX') {
      const bestPlayers = rankings.map(
        (r) => (r?.single ?? 12) + (r?.double ?? 12)
      );

      let missingIndex = 0;
      if (bestPlayers.length < 4) {
        missingIndex = (4 - bestPlayers.length) * 24;
      }

      return bestPlayers.reduce((a, b) => a + b, missingIndex);
    } else {
      const bestPlayers = rankings.map(
        (r) => (r?.single ?? 12) + (r?.double ?? 12) + (r?.mix ?? 12)
      );

      let missingIndex = 0;
      if (bestPlayers.length < 4) {
        missingIndex = (4 - bestPlayers.length) * 36;
      }

      return bestPlayers.reduce((a, b) => a + b, missingIndex);
    }
  }

  static getLetterForRegion(type: SubEventType, region: 'vl' | 'wl') {
    switch (type) {
      case SubEventType.F:
        return region === 'vl' ? 'D' : 'D';
      case SubEventType.M:
        return region === 'vl' ? 'H' : 'M';
      case SubEventType.MX:
        return region === 'vl' ? 'G' : 'Mx';
      case SubEventType.NATIONAL:
        return '';
    }
  }
}


@InputType()
export class TeamUpdateInput extends PartialType(
  OmitType(Team, ['createdAt', 'updatedAt', 'club', 'players', 'captain'] as const),
  InputType
) {}

@InputType()
export class TeamNewInput extends PartialType(
  OmitType(TeamUpdateInput, ['id'] as const),
  InputType
) {}
