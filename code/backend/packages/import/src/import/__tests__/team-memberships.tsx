/* eslint-disable @typescript-eslint/dot-notation */
import { DataBaseHandler, Player, Team, TeamMembership } from '@badvlasim/shared';
import moment from 'moment';
import { Transaction } from 'sequelize/types';
import { CompetitionXmlImporter } from '../importers';

describe('Team Membership', () => {
  let databaseService: DataBaseHandler;
  let service: CompetitionXmlImporter;
  let transaction: Transaction;

  beforeAll(async () => {
    databaseService = new DataBaseHandler({
      dialect: 'sqlite',
      storage: ':memory:'
    });

    service = new CompetitionXmlImporter(transaction);
  });

  beforeEach(async () => {
    // Clear eveything
    await DataBaseHandler.sequelizeInstance.sync({ force: true });
  });

  it('Add membership to team', async () => {
    // Arrange
    const team1 = await new Team({
      name: 'TestTeam1'
    }).save();
    const player1 = await new Player({
      firstName: 'TestPlayer'
    }).save();

    const playerIds = [player1.id];

    service['transaction'] = await DataBaseHandler.sequelizeInstance.transaction();

    // Act
    await service['_addToTeams'](playerIds, moment([2000, 8, 1]), team1.id);
    await service['transaction'].commit();

    // Assert
    const memberships = await TeamMembership.findAll();
    expect(memberships.length).toBe(1);
    expect(memberships[0].start).toEqual(moment([2000, 8, 1]).toDate());
    expect(memberships[0].end).toEqual(moment([2001, 8, 1]).toDate());
    expect(memberships[0].playerId).toBe(player1.id);
    expect(memberships[0].teamId).toBe(team1.id);
  });

  it('extend membership to team', async () => {
    // Arrange
    const team1 = await new Team({
      name: 'TestTeam1'
    }).save();
    const player1 = await new Player({
      firstName: 'TestPlayer'
    }).save();

    const playerIds = [player1.id];

    service['transaction'] = await DataBaseHandler.sequelizeInstance.transaction();

    // Act
    await service['_addToTeams'](playerIds, moment([2000, 8, 1]), team1.id);
    await service['_addToTeams'](playerIds, moment([2001, 8, 1]), team1.id);
    await service['transaction'].commit();

    // Assert
    const memberships = await TeamMembership.findAll();
    expect(memberships.length).toBe(1);
    expect(memberships[0].start).toEqual(moment([2000, 8, 1]).toDate());
    expect(memberships[0].end).toEqual(moment([2002, 8, 1]).toDate());
    expect(memberships[0].playerId).toBe(player1.id);
    expect(memberships[0].teamId).toBe(team1.id);
  });

  it('Skipping 1 year membership to team', async () => {
    // Arrange
    const team1 = await new Team({
      name: 'TestTeam1'
    }).save();
    const player1 = await new Player({
      firstName: 'TestPlayer'
    }).save();

    const playerIds = [player1.id];

    service['transaction'] = await DataBaseHandler.sequelizeInstance.transaction();

    // Act
    await service['_addToTeams'](playerIds, moment([2000, 8, 1]), team1.id);
    await service['_addToTeams'](playerIds, moment([2002, 8, 1]), team1.id);
    await service['transaction'].commit();

    // Assert
    const memberships = await TeamMembership.findAll();
    expect(memberships.length).toBe(2);
    expect(memberships[0].start).toEqual(moment([2000, 8, 1]).toDate());
    expect(memberships[1].start).toEqual(moment([2002, 8, 1]).toDate());
    expect(memberships[1].end).toEqual(moment([2003, 8, 1]).toDate());
    expect(memberships[1].playerId).toBe(player1.id);
    expect(memberships[1].teamId).toBe(team1.id);
  });

  it('switching and going back membership to team', async () => {
    // Arrange
    const team1 = await new Team({
      name: 'TestTeam1'
    }).save();
    const team2 = await new Team({
      name: 'TestTeam2'
    }).save();
    const player1 = await new Player({
      firstName: 'TestPlayer'
    }).save();

    const playerIds = [player1.id];

    service['transaction'] = await DataBaseHandler.sequelizeInstance.transaction();

    // Act
    await service['_addToTeams'](playerIds, moment([2000, 8, 1]), team1.id);
    await service['_addToTeams'](playerIds, moment([2001, 8, 1]), team2.id);
    await service['_addToTeams'](playerIds, moment([2002, 8, 1]), team1.id);
    await service['transaction'].commit();

    // Assert
    const memberships = await TeamMembership.findAll();
    expect(memberships.length).toBe(3);
    expect(memberships[0].start).toEqual(moment([2000, 8, 1]).toDate());
    expect(memberships[0].teamId).toBe(team1.id);

    expect(memberships[1].start).toEqual(moment([2001, 8, 1]).toDate());
    expect(memberships[1].teamId).toBe(team2.id);

    expect(memberships[2].start).toEqual(moment([2002, 8, 1]).toDate());
    expect(memberships[2].playerId).toBe(player1.id);
    expect(memberships[2].teamId).toBe(team1.id);
  });

  it('Having multiple people in one team', async () => {
    // Arrange
    const team1 = await new Team({
      name: 'TestTeam1'
    }).save();
    const player1 = await new Player({
      firstName: 'TestPlayer1'
    }).save();
    const player2 = await new Player({
      firstName: 'TestPlayer2'
    }).save();

    const playerIds = [player1.id, player2.id];

    service['transaction'] = await DataBaseHandler.sequelizeInstance.transaction();

    // Act
    await service['_addToTeams'](playerIds, moment([2000, 8, 1]), team1.id);
    await service['transaction'].commit();

    // Assert
    const memberships = await TeamMembership.findAll();
    expect(memberships.length).toBe(2);
    expect(memberships[0].start).toEqual(moment([2000, 8, 1]).toDate());
    expect(memberships[0].playerId).toBe(player1.id);

    expect(memberships[1].start).toEqual(moment([2000, 8, 1]).toDate());
    expect(memberships[1].playerId).toBe(player2.id);
  });
});
