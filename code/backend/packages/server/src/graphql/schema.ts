import { NotificationService } from '@badvlasim/shared';
import { GraphQLObjectType, GraphQLSchema } from 'graphql';
import {
  addChangeEncounterMutation,
  addClubMembershipMutation,
  addClubMutation,
  addCommentMutation,
  addEventCompetitionMutation,
  addEventTournamentMutation,
  addLocationMutation,
  addPlayerBaseSubEventMutation,
  addPlayerMutation,
  addPlayerToClubMutation,
  addPlayerToRoleMutation,
  addPlayerToTeamMutation,
  addRankingSystemGroupMutation,
  addRankingSystemMutation,
  addRoleMutation,
  addSubEventToRankingSystemGroupMutation,
  addTeamMutation,
  deleteClubMembershipMutation,
  removeClubMutation,
  removeLocationMutation,
  removePlayerBaseSubEventMutation,
  removePlayerFromRoleMutation,
  removePlayerFromTeamMutation,
  removeRoleMutation,
  removeSubEventToRankingSystemGroupMutation,
  removeTeamMutation,
  setGroupsCompetitionMutation,
  updateClubMembershipMutation,
  updateClubMutation,
  updateCommentMutation,
  updateEventCompetitionMutation,
  updateEventTournamentMutation,
  updateGlobalClaimUserMutation,
  updateLocationMutation,
  updatePlayerMutation,
  updatePlayerRankingMutation,
  updatePlayerTeamMutation,
  updateRankingSystemGroupMutation,
  updateRankingSystemMutation,
  updateRoleMutation,
  updateSubEventTeamMutation,
  updateTeamLocationMutation,
  updateTeamMutation,
  updateTournamentEventLocationMutation,
  addRankingPlaceMutation,
  removeRankingPlaceMutation,
  updateRankingPlaceMutation
} from './mutations';
import {
  claimsQuery,
  clubQuery,
  clubsQuery,
  competitionDrawQuery,
  competitionEncounterQuery,
  competitionEncountersQuery,
  competitionEventQuery,
  competitionEventsQuery,
  cronQuery,
  cronsQuery,
  encounterChangeQuery,
  encounterChangesQuery,
  entriesQuery,
  entryQuery,
  gameQuery,
  gamesQuery,
  importedQuery,
  locationQuery,
  locationsQuery,
  playerQuery,
  playersQuery,
  pointsQuery,
  roleQuery,
  rolesQuery,
  systemQuery,
  systemsGroupsQuery,
  systemsQuery,
  teamQuery,
  teamsQuery,
  tournamentDrawQuery,
  tournamentDrawsQuery,
  tournamentEventQuery,
  tournamentEventsQuery
} from './queries';

export const createSchema = (notificationService: NotificationService) => {
  return new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'RootQueryType',
      fields: () => ({
        claims: claimsQuery,
        club: clubQuery,
        clubs: clubsQuery,
        competitionDraw: competitionDrawQuery,
        competitionDraws: competitionDrawQuery,
        competitionEncounter: competitionEncounterQuery,
        competitionEncounters: competitionEncountersQuery,
        competitionEvent: competitionEventQuery,
        competitionEvents: competitionEventsQuery,
        cron: cronQuery,
        crons: cronsQuery,
        encounterChange: encounterChangeQuery,
        encounterChanges: encounterChangesQuery,
        entry: entryQuery,
        entries: entriesQuery,
        game: gameQuery,
        games: gamesQuery,
        imported: importedQuery,
        location: locationQuery,
        locations: locationsQuery,
        player: playerQuery,
        players: playersQuery,
        points: pointsQuery,
        rankingSystemGroup: systemsGroupsQuery,
        role: roleQuery,
        roles: rolesQuery,
        system: systemQuery,
        systems: systemsQuery,
        team: teamQuery,
        teams: teamsQuery,
        tournamentDraw: tournamentDrawQuery,
        tournamentDraws: tournamentDrawsQuery,
        tournamentEvent: tournamentEventQuery,
        tournamentEvents: tournamentEventsQuery
      })
    }),
    mutation: new GraphQLObjectType({
      name: 'RootMutationType',
      fields: () => ({
        addChangeEncounter: addChangeEncounterMutation(notificationService),
        addClub: addClubMutation,
        addClubMembership: addClubMembershipMutation,
        addComment: addCommentMutation,
        addEventCompetition: addEventCompetitionMutation, 
        addEventTournament: addEventTournamentMutation,
        addLocation: addLocationMutation,
        addPlayer: addPlayerMutation,
        addPlayerBaseSubEvent: addPlayerBaseSubEventMutation,
        addPlayerToClub: addPlayerToClubMutation,
        addPlayerToRole: addPlayerToRoleMutation,
        addPlayerToTeam: addPlayerToTeamMutation,
        addRankingPlace: addRankingPlaceMutation,
        addRankingSystem: addRankingSystemMutation,
        addRankingSystemGroup: addRankingSystemGroupMutation,
        addRole: addRoleMutation,
        addSubEventToRankingSystemGroup: addSubEventToRankingSystemGroupMutation,
        addTeam: addTeamMutation,
        deleteClubMembership: deleteClubMembershipMutation,
        removeClub: removeClubMutation,
        removeLocation: removeLocationMutation, 
        removePlayerBaseSubEvent: removePlayerBaseSubEventMutation,
        removePlayerFromRole: removePlayerFromRoleMutation,
        removePlayerFromTeam: removePlayerFromTeamMutation,
        removeRankingPlace: removeRankingPlaceMutation,
        removeRole: removeRoleMutation,
        removeSubEventToRankingSystemGroup: removeSubEventToRankingSystemGroupMutation,
        removeTeam: removeTeamMutation,
        setGroupsCompetition: setGroupsCompetitionMutation,
        updateClub: updateClubMutation,
        updateClubMembership: updateClubMembershipMutation,
        updateComment: updateCommentMutation,
        updateEventCompetition: updateEventCompetitionMutation,
        updateEventTournament: updateEventTournamentMutation,
        updateGlobalClaimUser: updateGlobalClaimUserMutation,
        updateLocation: updateLocationMutation,
        updatePlayer: updatePlayerMutation,
        updatePlayerRanking: updatePlayerRankingMutation,
        updatePlayerTeam: updatePlayerTeamMutation,
        updateRankingPlace: updateRankingPlaceMutation,
        updateRankingSystem: updateRankingSystemMutation,
        updateRankingSystemGroup: updateRankingSystemGroupMutation,
        updateRole: updateRoleMutation,
        updateSubEventTeam: updateSubEventTeamMutation,
        updateTeam: updateTeamMutation,
        updateTeamLocation: updateTeamLocationMutation,
        updateTournamentEventLocation: updateTournamentEventLocationMutation
      })
    })
  });
};
