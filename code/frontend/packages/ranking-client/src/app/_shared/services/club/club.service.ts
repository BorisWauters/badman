import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { map } from 'rxjs/operators';
import { Club } from './../../models';

const clubQuery = require('graphql-tag/loader!../../graphql/clubs/queries/GetClubQuery.graphql');
const clubsQuery = require('graphql-tag/loader!../../graphql/clubs/queries/GetClubsQuery.graphql');

const addClubMutation = require('graphql-tag/loader!../../graphql/clubs/mutations/addClub.graphql');
const updateClubMutation = require('graphql-tag/loader!../../graphql/clubs/mutations/updateClub.graphql');

@Injectable({
  providedIn: 'root',
})
export class ClubService {
  constructor(private apollo: Apollo) {}

  getClub(clubId: number) {
    return this.apollo
      .query<{ club: Club }>({
        query: clubQuery,
        variables: {
          id: clubId,
        },
      })
      .pipe(map((x) => new Club(x.data.club)));
  }

  addClub(club: Club) {
    return this.apollo
      .mutate<{ addClub: Club }>({
        mutation: addClubMutation,
        variables: {
          club: {
            ...club,
            id: -1,
          },
        },
      })
      .pipe(map((x) => new Club(x.data.addClub)));
  }



  updateClub(club: Club) {
    return this.apollo
      .mutate<{ updateClub: Club }>({
        mutation: updateClubMutation,
        variables: {
          club,
        },
      })
      .pipe(map((x) => new Club(x.data.updateClub)));
  }

  getClubs(first: number, after: string, query: string) {
    let where = undefined;
    if (query) {
      where = {
        name: {
          $iLike: `%${query}%`,
        },
      };
    }

    return this.apollo
      .query<{
        clubs: {
          total: number;
          edges: { cursor: string; node: Club }[];
        };
      }>({
        query: clubsQuery,
        variables: {
          first,
          after,
          where,
        },
      })
      .pipe(
        map((x) => {
          if (x.data.clubs) {
            x.data.clubs.edges = x.data.clubs.edges.map((x) => {
              x.node = new Club(x.node);
              return x;
            });
          }
          return x.data;
        })
      );
  }
}
