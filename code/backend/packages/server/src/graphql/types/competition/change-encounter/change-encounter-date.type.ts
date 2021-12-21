import { EncounterChangeDate } from '@badvlasim/shared';
import { GraphQLInputObjectType, GraphQLObjectType } from 'graphql';
import { resolver } from 'graphql-sequelize';
import { getAttributeFields } from '../../attributes.type';
import { EncounterChangeType } from './change-encounter.type';

const EncounterChangeDateType = new GraphQLObjectType({
  name: 'EncounterChangeDate',
  description: 'A EncounterChangeDate',
  fields: () =>
    Object.assign(getAttributeFields(EncounterChangeDate), {
      encounterChange: {
        type: EncounterChangeType,
        resolve: resolver(EncounterChangeDate.associations.encounterChange)
      }
    })
});

const EncounterChangeDateInputType = new GraphQLInputObjectType({
  name: 'EncounterChangeDateInput',
  description: 'This represents a UserInputType',
  fields: () =>
    Object.assign(
      getAttributeFields(EncounterChangeDate, {
        exclude: ['createdAt', 'updatedAt'],
        optionalString: ['id']
      })
    )
});

export { EncounterChangeDateType, EncounterChangeDateInputType };
