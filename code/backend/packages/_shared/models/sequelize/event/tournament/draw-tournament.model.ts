import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique
} from 'sequelize-typescript';
import {
  BuildOptions,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManyCountAssociationsMixin,
  HasManyGetAssociationsMixin,
  HasManyHasAssociationMixin,
  HasManyHasAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManySetAssociationsMixin
} from 'sequelize';
import { SubEventTournament } from './sub-event-tournament.model';
import { DrawType } from '../../../enums';
import { Game } from '../game.model';

@Table({
  timestamps: true,
  schema: 'event'
})
export class DrawTournament extends Model {
  constructor(values?: Partial<DrawTournament>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Unique('DrawTournaments_unique_constraint')
  @Column
  name: string;

  @Unique('DrawTournaments_unique_constraint')
  @Column(DataType.ENUM('KO', 'POULE', 'QUALIFICATION'))
  type: DrawType;

  @Column
  size: number;

  @HasMany(() => Game, {
    foreignKey: 'linkId',
    constraints: false,
    scope: {
      linkType: 'tournament'
    }
  })
  games: Game[];

  @Unique('DrawTournaments_unique_constraint')
  @Column
  visualCode: string;

  @BelongsTo(() => SubEventTournament, {
    foreignKey: 'subeventId',
    onDelete: 'CASCADE'
  })
  subEvent?: SubEventTournament;

  @Unique('DrawTournaments_unique_constraint')
  @ForeignKey(() => SubEventTournament)
  @Column
  subeventId: string;

  // Has many Game
  getGames!: HasManyGetAssociationsMixin<Game>;
  setGames!: HasManySetAssociationsMixin<Game, string>;
  addGames!: HasManyAddAssociationsMixin<Game, string>;
  addGame!: HasManyAddAssociationMixin<Game, string>;
  removeGame!: HasManyRemoveAssociationMixin<Game, string>;
  removeGames!: HasManyRemoveAssociationsMixin<Game, string>;
  hasGame!: HasManyHasAssociationMixin<Game, string>;
  hasGames!: HasManyHasAssociationsMixin<Game, string>;
  countGames!: HasManyCountAssociationsMixin;

  // Belongs to SubEvent
  getSubEvent!: BelongsToGetAssociationMixin<SubEventTournament>;
  setSubEvent!: BelongsToSetAssociationMixin<SubEventTournament, string>;
}
