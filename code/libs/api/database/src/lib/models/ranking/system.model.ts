import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  BelongsToManyAddAssociationMixin,
  BelongsToManyAddAssociationsMixin,
  BelongsToManyCountAssociationsMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManyHasAssociationMixin,
  BelongsToManyHasAssociationsMixin,
  BelongsToManyRemoveAssociationMixin,
  BelongsToManyRemoveAssociationsMixin,
  BelongsToManySetAssociationsMixin,
  BuildOptions,
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
  BelongsToMany,
  Column,
  DataType,
  Default,
  HasMany,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from 'sequelize-typescript';
import { RankingSystems, RankingTiming, StartingType } from '../../enums/';
import { RankingSystemGroup } from './group.model';
import { GroupSystemsMembership } from './group-system-membership.model';
import { LastRankingPlace } from './last-place.model';
import { RankingPlace } from './place.model';
import { RankingPoint } from './point.model';

@Table({
  timestamps: true,
  tableName: 'Systems',
  schema: 'ranking',
})
@ObjectType({ description: 'A RankingSystem' })
export class RankingSystem extends Model {
  constructor(values?: Partial<RankingSystem>, options?: BuildOptions) {
    super(values, options);

    if (values?.amountOfLevels) {
      this._setupValues();
    }
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column
  id: string;

  @Unique
  @Field({ nullable: true })
  @Column
  name: string;

  @Field({ nullable: true })
  @Column
  amountOfLevels: number;

  @Field({ nullable: true })
  @Column
  procentWinning: number;
  @Field({ nullable: true })
  @Column
  procentWinningPlus1: number;
  @Field({ nullable: true })
  @Column
  procentLosing: number;
  @Field({ nullable: true })
  @Column
  minNumberOfGamesUsedForUpgrade: number;
  @Field({ nullable: true })
  @Column
  maxDiffLevels: number;
  @Field({ nullable: true })
  @Column
  maxDiffLevelsHighest: number;
  @Field({ nullable: true })
  @Column
  latestXGamesToUse: number;
  @Field({ nullable: true })
  @Column
  maxLevelUpPerChange: number;
  @Field({ nullable: true })
  @Column
  maxLevelDownPerChange: number;

  @Field({ nullable: true })
  @Column
  gamesForInactivty: number;

  @Field({ nullable: true })
  @Column
  inactivityAmount: number;

  @Field(() => String, { nullable: true })
  @Column(DataType.ENUM('months', 'weeks', 'days'))
  inactivityUnit: 'months' | 'weeks' | 'days';

  get inactivity(): RankingTiming {
    return {
      amount: this.inactivityAmount,
      unit: this.inactivityUnit,
    };
  }
  @Default(new Date('2016-08-31T22:00:00.000Z'))
  @Field({ nullable: true })
  @Column
  caluclationIntervalLastUpdate: Date;
  @Field({ nullable: true })
  @Column
  caluclationIntervalAmount: number;
  @Field(() => String, { nullable: true })
  @Column(DataType.ENUM('months', 'weeks', 'days'))
  calculationIntervalUnit: 'months' | 'weeks' | 'days';

  get calculationInterval(): RankingTiming {
    return {
      amount: this.caluclationIntervalAmount,
      unit: this.calculationIntervalUnit,
    };
  }

  @Field({ nullable: true })
  @Column
  periodAmount: number;
  @Field(() => String, { nullable: true })
  @Column(DataType.ENUM('months', 'weeks', 'days'))
  periodUnit: 'months' | 'weeks' | 'days';

  get period(): RankingTiming {
    return {
      amount: this.periodAmount,
      unit: this.periodUnit,
    };
  }
  @Default(new Date('2016-08-31T22:00:00.000Z'))
  @Field({ nullable: true })
  @Column
  updateIntervalAmountLastUpdate: Date;
  @Field({ nullable: true })
  @Column
  updateIntervalAmount: number;
  @Field(() => String, { nullable: true })
  @Column(DataType.ENUM('months', 'weeks', 'days'))
  updateIntervalUnit: 'months' | 'weeks' | 'days';

  get updateInterval(): RankingTiming {
    return {
      amount: this.updateIntervalAmount,
      unit: this.updateIntervalUnit,
    };
  }

  @Field(() => String, { nullable: true })
  @Column(DataType.ENUM('BVL', 'ORIGINAL', 'LFBB', 'VISUAL'))
  rankingSystem: RankingSystems;

  @Field({ nullable: true })
  @Column
  primary: boolean;

  @Field({ nullable: true })
  @Column({ defaultValue: false })
  runCurrently: boolean;

  @Field({ nullable: true })
  @Column
  runDate: Date;

  @Field({ nullable: true })
  @Column({ defaultValue: 1 })
  differenceForUpgrade: number;

  @Field({ nullable: true })
  @Column({ defaultValue: 0 })
  differenceForDowngrade: number;

  @Field(() => String, { nullable: true })
  @Column({
    type: DataType.ENUM('formula', 'tableLFBB', 'tableBVL'),
    defaultValue: 'formula',
  })
  startingType: StartingType;

  @HasMany(() => RankingPoint, 'SystemId')
  rankingPoints: RankingPoint;

  @HasMany(() => RankingPlace, 'SystemId')
  places: RankingPlace;

  @HasMany(() => LastRankingPlace, 'systemId')
  lastPlaces: LastRankingPlace;

  @BelongsToMany(() => RankingSystemGroup, () => GroupSystemsMembership)
  groups: RankingSystemGroup[];

  // Has many RankingPoint
  getRankingPoints!: HasManyGetAssociationsMixin<RankingPoint>;
  setRankingPoints!: HasManySetAssociationsMixin<RankingPoint, string>;
  addRankingPoints!: HasManyAddAssociationsMixin<RankingPoint, string>;
  addRankingPoint!: HasManyAddAssociationMixin<RankingPoint, string>;
  removeRankingPoint!: HasManyRemoveAssociationMixin<RankingPoint, string>;
  removeRankingPoints!: HasManyRemoveAssociationsMixin<RankingPoint, string>;
  hasRankingPoint!: HasManyHasAssociationMixin<RankingPoint, string>;
  hasRankingPoints!: HasManyHasAssociationsMixin<RankingPoint, string>;
  countRankingPoints!: HasManyCountAssociationsMixin;

  // Belongs to many Group
  getGroups!: BelongsToManyGetAssociationsMixin<RankingSystemGroup>;
  setGroups!: BelongsToManySetAssociationsMixin<RankingSystemGroup, string>;
  addGroups!: BelongsToManyAddAssociationsMixin<RankingSystemGroup, string>;
  addGroup!: BelongsToManyAddAssociationMixin<RankingSystemGroup, string>;
  removeGroup!: BelongsToManyRemoveAssociationMixin<RankingSystemGroup, string>;
  removeGroups!: BelongsToManyRemoveAssociationsMixin<
    RankingSystemGroup,
    string
  >;
  hasGroup!: BelongsToManyHasAssociationMixin<RankingSystemGroup, string>;
  hasGroups!: BelongsToManyHasAssociationsMixin<RankingSystemGroup, string>;
  countGroup!: BelongsToManyCountAssociationsMixin;


  // Has many LastPlace
  getLastPlaces!: HasManyGetAssociationsMixin<LastRankingPlace>;
  setLastPlaces!: HasManySetAssociationsMixin<LastRankingPlace, string>;
  addLastPlaces!: HasManyAddAssociationsMixin<LastRankingPlace, string>;
  addLastPlace!: HasManyAddAssociationMixin<LastRankingPlace, string>;
  removeLastPlace!: HasManyRemoveAssociationMixin<LastRankingPlace, string>;
  removeLastPlaces!: HasManyRemoveAssociationsMixin<LastRankingPlace, string>;
  hasLastPlace!: HasManyHasAssociationMixin<LastRankingPlace, string>;
  hasLastPlaces!: HasManyHasAssociationsMixin<LastRankingPlace, string>;
  countLastPlaces!: HasManyCountAssociationsMixin;

  private _pointsToGoUp: number[];
  private _pointsWhenWinningAgainst: number[];
  private _pointsToGoDown: number[];

  private _levelArray: number[];
  private _levelArrayOneMinus: number[];

  @Field(() => [Int], { nullable: true })
  @Column(DataType.VIRTUAL)
  get pointsToGoUp(): number[] {
    return this._pointsToGoUp;
  }

  @Field(() => [Int], { nullable: true })
  @Column(DataType.VIRTUAL)
  get pointsWhenWinningAgainst(): number[] {
    return this._pointsWhenWinningAgainst;
  }

  @Field(() => [Int], { nullable: true })
  @Column(DataType.VIRTUAL)
  get pointsToGoDown(): number[] {
    return this._pointsToGoDown;
  }

  @Field(() => [Int], { nullable: true })
  @Column(DataType.VIRTUAL)
  get levelArray(): number[] {
    return this._levelArray;
  }
  @Field(() => [Int], { nullable: true })
  @Column(DataType.VIRTUAL)
  get levelArrayOneMinus(): number[] {
    return this._levelArrayOneMinus;
  }

  private _setupValues() {
    this._levelArray = Array(this.amountOfLevels)
      .fill(0)
      .map((v, i) => i);
    this._levelArrayOneMinus = Array(this.amountOfLevels - 1)
      .fill(0)
      .map((v, i) => i);

    switch (this.rankingSystem) {
      case RankingSystems.BVL:
      case RankingSystems.VISUAL:
        this._bvlCaps();
        break;
      case RankingSystems.LFBB:
        this._lfbbCaps();
        break;
      case RankingSystems.ORIGINAL:
        this._originalCaps();
        break;
    }
  }

  private _bvlCaps() {
    this._pointsToGoUp = [];
    this._pointsWhenWinningAgainst = [];
    this._pointsToGoDown = [];

    this._levelArray.forEach((x) => {
      if (x === 0) {
        this._pointsWhenWinningAgainst[x] = 50;
      } else {
        this._pointsWhenWinningAgainst[x] =
          (this._pointsWhenWinningAgainst[x - 1] * this.procentWinning) /
          this.procentWinningPlus1;
      }
    });

    this._levelArrayOneMinus.forEach((x) => {
      this._pointsToGoUp[x] = Math.round(
        (this._pointsWhenWinningAgainst[x] * this.procentWinning) / 100
      );
    });
    this._levelArrayOneMinus.forEach((x) => {
      this._pointsToGoDown[x] = Math.round(
        (this._pointsWhenWinningAgainst[x + 1] * this.procentLosing) / 100
      );
    });

    this._pointsWhenWinningAgainst = this._pointsWhenWinningAgainst.map((p) =>
      Math.round(p)
    );
  }

  private _lfbbCaps() {
    this._pointsWhenWinningAgainst = [
      10, 30, 45, 60, 75, 120, 165, 210, 255, 390, 525, 660, 795, 1200, 1605,
      2010, 2415,
    ];
    this._pointsToGoUp = [
      5, 20, 31, 38, 61, 83, 106, 128, 196, 263, 331, 398, 601, 803, 1006, 1208,
    ];
    this._pointsToGoDown = this._pointsToGoUp;
  }
  private _originalCaps() {
    throw new Error('Not implementd');
  }
}
