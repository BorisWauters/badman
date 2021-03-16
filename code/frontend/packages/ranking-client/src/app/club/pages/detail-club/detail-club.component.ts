import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { AddPlayerComponent } from 'app/admin/modules/club-management/dialogs/add-player/add-player.component';
import { UserService } from 'app/player';
import { Club, ClubService, SystemService, Team } from 'app/_shared';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { filter, map, switchMap, tap } from 'rxjs/operators';
import * as moment from 'moment';
import { TeamDialogComponent } from 'app/club/dialogs';

@Component({
  templateUrl: './detail-club.component.html',
  styleUrls: ['./detail-club.component.scss'],
})
export class DetailClubComponent {
  club$: Observable<Club>;

  update$ = new BehaviorSubject(0);

  constructor(
    private clubService: ClubService,
    private systemService: SystemService,
    private route: ActivatedRoute,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    const system$ = this.systemService
      .getPrimarySystem()
      .pipe(filter((x) => !!x));

    this.club$ = combineLatest([
      this.route.paramMap,
      system$,
      this.update$,
    ]).pipe(
      switchMap(([params, system]) =>
        this.clubService.getClub(params.get('id'), {
          rankingSystem: system.id,
          playersfrom: moment().subtract(1, 'year').toDate(),
          includePlayers: true,
          includeTeams: true,
        })
      )
    );
  }

  addPlayer(club) {
    const dialogRef = this.dialog.open(AddPlayerComponent);

    dialogRef.afterClosed().subscribe(async (player) => {
      if (player) {
        await this.clubService.addPlayer(club, player).toPromise();
        this.update$.next(null);
      }
    });
  }

  editTeam(team: Team, club?: Club) {
       let dialogRef = this.dialog.open(TeamDialogComponent, {
      data: { team, club },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.update$.next(0);
    });
  }

  deleteTeam(team: Team) {}
}
