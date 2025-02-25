import {
  EncounterChange,
  EncounterChangeDate,
  Comment,
} from '@badman/api/database';
import { Logger, NotFoundException } from '@nestjs/common';
import {
  Args,
  Field,
  ID,
  ObjectType,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { ListArgs } from '../../../utils';

@ObjectType()
export class PagedEncounterChange {
  @Field()
  count: number;

  @Field(() => [EncounterChange])
  rows: EncounterChange[];
}

@Resolver(() => EncounterChange)
export class EncounterChangeCompetitionResolver {
  private readonly logger = new Logger(EncounterChangeCompetitionResolver.name);

  @Query(() => EncounterChange)
  async encounterChange(
    @Args('id', { type: () => ID }) id: string
  ): Promise<EncounterChange> {
    const encounterCompetition = await EncounterChange.findByPk(id);

    if (!encounterCompetition) {
      throw new NotFoundException(id);
    }
    return encounterCompetition;
  }

  @Query(() => PagedEncounterChange)
  async encounterChanges(
    @Args() listArgs: ListArgs
  ): Promise<{ count: number; rows: EncounterChange[] }> {
    return EncounterChange.findAndCountAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [EncounterChangeDate])
  async dates(
    @Parent() encounterChange: EncounterChange
  ): Promise<EncounterChangeDate[]> {
    return encounterChange.getDates();
  }

  @ResolveField(() => Comment)
  async homeComment(
    @Parent() encounterChange: EncounterChange
  ): Promise<Comment> {
    return encounterChange.getHomeComment();
  }

  @ResolveField(() => Comment)
  async awayComment(
    @Parent() encounterChange: EncounterChange
  ): Promise<Comment> {
    return encounterChange.getAwayComment();
  }
}
