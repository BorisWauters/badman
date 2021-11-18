import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { iif, Observable, of } from 'rxjs';
import { filter, mergeMap, shareReplay, startWith, tap } from 'rxjs/operators';
import { RequestLink, RankingPlace, Player } from '../../../_shared/models';
import { environment } from '../../../../environments/environment';
import { AuthService } from '@auth0/auth0-angular';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private urlBase = `${environment.api}/${environment.apiVersion}/user`;

  profile$: Observable<{ player: Player; request: any } | { player: null; request: null } | null>;
  profile?: Player;

  constructor(private httpClient: HttpClient, private auth: AuthService) {
    const whenAuthenticated = this.httpClient.get<{ player: Player; request: any }>(`${this.urlBase}/profile`).pipe(
      startWith({ player: null, request: null }),
      filter((user) => user !== null),
      tap(({ player }) => (this.profile = player!)),
      shareReplay(1)
    );

    this.profile$ = this.auth.user$.pipe(
      mergeMap((x) => iif(() => x != null && x != undefined, whenAuthenticated, of(null)))
    );
  }

  requestLink(playerId: string): Observable<RequestLink> {
    return this.httpClient.post<RequestLink>(
      `${environment.api}/${environment.apiVersion}/request-link/${playerId}`,
      {}
    );
  }

  // permissions() {
  //   return this.auth.userPermissions$;
  // }
}
