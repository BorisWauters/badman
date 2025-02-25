import {
  Club,
  Location,
  Role,
  Team,
  ClubUpdateInput,
  Player,
  ClubPlayer,
  ClubPlayerMembership,
  ClubPlayerMembershipNewInput,
  ClubPlayerMembershipUpdateInput,
  ClubNewInput,
} from '@badman/api/database';
import {
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  Args,
  Field,
  ID,
  Mutation,
  ObjectType,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { Sequelize } from 'sequelize-typescript';
import { User } from '../../decorators';
import { ListArgs } from '../../utils';

@ObjectType()
export class PagedClub {
  @Field()
  count: number;

  @Field(() => [Club])
  rows: Club[];
}

@Resolver(() => Club)
export class ClubsResolver {
  private readonly logger = new Logger(ClubsResolver.name);

  constructor(private _sequelize: Sequelize) {}

  @Query(() => Club)
  async club(@Args('id', { type: () => ID }) id: string): Promise<Club> {
    let club = await Club.findByPk(id);

    if (!club) {
      club = await Club.findOne({
        where: {
          slug: id,
        },
      });
    }

    if (!club) {
      throw new NotFoundException(id);
    }
    return club;
  }

  @Query(() => PagedClub)
  async clubs(
    @Args() listArgs: ListArgs
  ): Promise<{ count: number; rows: Club[] }> {
    return Club.findAndCountAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [Team])
  async teams(
    @Parent() club: Club,
    @Args() listArgs: ListArgs
  ): Promise<Team[]> {
    return club.getTeams(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [Location])
  async locations(
    @Parent() club: Club,
    @Args() listArgs: ListArgs
  ): Promise<Location[]> {
    return club.getLocations(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [Role])
  async roles(
    @Parent() club: Club,
    @Args() listArgs: ListArgs
  ): Promise<Role[]> {
    return club.getRoles(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [Player])
  async players(
    @Parent() club: Club,
    @Args() listArgs: ListArgs
  ): Promise<Player[]> {
    return club.getPlayers(ListArgs.toFindOptions(listArgs));
  }

  @Mutation(() => Club)
  async addClub(@User() user: Player, @Args('data') newClubData: ClubNewInput) {
    if (!user.hasAnyPermission(['add:club'])) {
      throw new UnauthorizedException(
        `You do not have permission to add a club`
      );
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const clubDb = await Club.create({ ...newClubData }, { transaction });

      // Commit transaction
      await transaction.commit();

      return clubDb;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  @Mutation(() => Club)
  async removeClub(
    @User() user: Player,
    @Args('id', { type: () => ID }) id: string
  ) {
    if (!user.hasAnyPermission(['remove:club'])) {
      throw new UnauthorizedException(
        `You do not have permission to add a club`
      );
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const clubDb = await Club.findByPk(id, { transaction });

      if (!clubDb) {
        throw new NotFoundException(`${Club.name}: ${id}`);
      }

      await clubDb.destroy({ transaction });

      // Commit transaction
      await transaction.commit();

      return clubDb;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  @Mutation(() => Club)
  async updateClub(
    @User() user: Player,
    @Args('data') updateClubData: ClubUpdateInput
  ) {
    if (
      !user.hasAnyPermission([
        `${updateClubData.id}_edit:club`,
        'edit-any:club',
      ])
    ) {
      throw new UnauthorizedException(
        `You do not have permission to edit this club`
      );
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const clubDb = await Club.findByPk(updateClubData.id, { transaction });

      if (!clubDb) {
        throw new NotFoundException(`${Club.name}: ${updateClubData.id}`);
      }

      // If the abbreviation is changed, we need to update the teams
      if (updateClubData.abbreviation !== clubDb.abbreviation) {
        const teams = await clubDb.getTeams({
          where: { active: true },
          transaction,
        });
        this.logger.debug(`updating teams ${teams.length}`);
        for (const team of teams) {
          await Team.generateAbbreviation(team, { transaction });
          await team.save({ transaction });
        }
      }

      // Update club
      const result = await clubDb.update(updateClubData, { transaction });

      // Commit transaction
      await transaction.commit();

      return result;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  @Mutation(() => Boolean)
  async addPlayerToClub(
    @User() user: Player,
    @Args('data') addPlayerToClubData: ClubPlayerMembershipNewInput
  ) {
    if (
      !user.hasAnyPermission([
        `${addPlayerToClubData.clubId}_edit:club`,
        'edit-any:club',
      ])
    ) {
      throw new UnauthorizedException(
        `You do not have permission to edit this club`
      );
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const club = await Club.findByPk(addPlayerToClubData.clubId, {
        transaction,
      });
      const player = await Player.findByPk(addPlayerToClubData.playerId, {
        transaction,
      });

      if (!club) {
        throw new NotFoundException(
          `${Club.name}: ${addPlayerToClubData.clubId}`
        );
      }
      if (!player) {
        throw new NotFoundException(
          `${Player.name}: ${addPlayerToClubData.playerId}`
        );
      }

      // Add player to club
      await club.addPlayer(player, {
        transaction,
        through: {
          start: addPlayerToClubData.start,
          end: addPlayerToClubData.end,
        },
      });

      // Commit transaction
      await transaction.commit();

      return true;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }
  @Mutation(() => Boolean)
  async updatePlayerClubMembership(
    @User() user: Player,
    @Args('data')
    updatePlayerClubMembershipData: ClubPlayerMembershipUpdateInput
  ) {
    const membership = await ClubPlayerMembership.findByPk(
      updatePlayerClubMembershipData.id
    );

    if (!membership) {
      throw new NotFoundException(
        `${ClubPlayerMembership.name}: ${updatePlayerClubMembershipData.id}`
      );
    }

    if (
      !user.hasAnyPermission([
        `${membership.clubId}_edit:club`,
        'edit-any:club',
      ])
    ) {
      throw new UnauthorizedException(
        `You do not have permission to edit this club`
      );
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      await membership.update(updatePlayerClubMembershipData, {
        transaction,
      });

      // Commit transaction
      await transaction.commit();

      return true;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  @Mutation(() => Boolean)
  async removePlayerFromClub(
    @User() user: Player,
    @Args('id', { type: () => ID }) id: string
  ) {
    const membership = await ClubPlayerMembership.findByPk(id);

    if (!membership) {
      throw new NotFoundException(`${ClubPlayerMembership.name}: ${id}`);
    }

    if (
      !user.hasAnyPermission([
        `${membership.clubId}_edit:club`,
        'edit-any:club',
      ])
    ) {
      throw new UnauthorizedException(
        `You do not have permission to edit this club`
      );
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const club = await Club.findByPk(membership.clubId, { transaction });
      const player = await Player.findByPk(membership.playerId, {
        transaction,
      });

      if (!club) {
        throw new NotFoundException(`${Club.name}: ${membership.clubId}`);
      }
      if (!player) {
        throw new NotFoundException(`${Player.name}: ${membership.playerId}`);
      }

      // Remove player from club
      await club.removePlayer(player, { transaction });

      // Commit transaction
      await transaction.commit();

      return true;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }
}

@Resolver(() => ClubPlayer)
export class ClubPlayerResolver extends ClubsResolver {
  @ResolveField(() => ClubPlayerMembership)
  async clubMembership(
    @Parent() club: Club & { ClubPlayerMembership: ClubPlayerMembership }
  ): Promise<ClubPlayerMembership> {
    return club.ClubPlayerMembership;
  }
}
