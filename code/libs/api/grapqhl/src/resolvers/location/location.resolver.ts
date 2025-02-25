import {
  Availability,
  Club,
  Location,
  LocationNewInput,
  LocationUpdateInput,
  Player,
} from '@badman/api/database';
import {
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  Args,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { Sequelize } from 'sequelize-typescript';
import { User } from '../../decorators';
import { ListArgs } from '../../utils';

@Resolver(() => Location)
export class LocationResolver {
  private readonly logger = new Logger(LocationResolver.name);

  constructor(private _sequelize: Sequelize) {}

  @Query(() => Location)
  async location(
    @Args('id', { type: () => ID }) id: string
  ): Promise<Location> {
    return await Location.findByPk(id);
  }

  @Query(() => [Location])
  async locations(@Args() listArgs: ListArgs): Promise<Location[]> {
    return Location.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [Availability])
  async availibilities(
    @Parent() location: Location,
    @Args() listArgs: ListArgs
  ): Promise<Availability[]> {
    return location.getAvailabilities(ListArgs.toFindOptions(listArgs));
  }

  @Mutation(() => Location)
  async createLocation(
    @Args('data') newLocationData: LocationNewInput,
    @User() user: Player
  ): Promise<Location> {
    const transaction = await this._sequelize.transaction();
    try {
      const dbClub = await Club.findByPk(newLocationData.clubId, {
        transaction,
      });

      if (!dbClub) {
        throw new NotFoundException(`${Club.name}: ${newLocationData.clubId}`);
      }

      if (
        !user.hasAnyPermission([`${dbClub.id}_edit:location`, 'edit-any:club'])
      ) {
        throw new UnauthorizedException(
          `You do not have permission to add a competition`
        );
      }

      const dbLocation = await Location.create(
        { ...newLocationData },
        { transaction }
      );

      await transaction.commit();
      return dbLocation;
    } catch (e) {
      this.logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }

  @Mutation(() => Location)
  async updateLocation(
    @Args('data') updateLocationData: LocationUpdateInput,
    @User() user: Player
  ): Promise<Location> {
    const transaction = await this._sequelize.transaction();
    try {
      const dbLocation = await Location.findByPk(updateLocationData.id);

      if (!dbLocation) {
        throw new NotFoundException(
          `${Location.name}: ${updateLocationData.id}`
        );
      }

      if (
        !user.hasAnyPermission([
          `${dbLocation.clubId}_edit:location`,
          'edit-any:club',
        ])
      ) {
        throw new UnauthorizedException(
          `You do not have permission to add a competition`
        );
      }

      await dbLocation.update(
        { ...dbLocation.toJSON(), ...updateLocationData },
        { transaction }
      );

      // await dbLocation.update(location, { transaction });
      await transaction.commit();
      return dbLocation;
    } catch (e) {
      this.logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
}
