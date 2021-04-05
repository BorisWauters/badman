import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TeamDialogComponent } from 'app/club/dialogs';
import { Club, CompetitionSubEvent, Team } from 'app/_shared';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-assign-team',
  templateUrl: './assign-team.component.html',
  styleUrls: ['./assign-team.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssignTeamComponent implements OnInit {
  @Input()
  teams: Team[];

  @Input()
  club: Club;

  @Input()
  subEvents: CompetitionSubEvent[];

  @Input()
  type: string;

  @Output()
  onChange = new EventEmitter<{
    teamId: string;
    oldSubEventId: string;
    newSubEventId: string;
  }>();

  issues = {};
  warnings = {};

  ids = [];

  constructor(
    private dialog: MatDialog,
    private changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.ids = this.subEvents.map((s) => s.id);
    this.initialPlacing();
  }

  drop(
    event: CdkDragDrop<Team[], Team[]>,
    subEvent: CompetitionSubEvent
  ): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      const team = subEvent.teams[event.currentIndex];
      this.validate(team, subEvent);

      this.onChange.next({
        teamId: team.id,
        oldSubEventId: event.previousContainer.id,
        newSubEventId: event.container.id,
      });
    }
  }

  editTeam(team: Team, subEvent: CompetitionSubEvent) {
    let dialogRef = this.dialog.open(TeamDialogComponent, {
      data: { team, club: this.club },
    });

    dialogRef
      .afterClosed()
      .pipe(filter((result) => !!result))
      .subscribe((newTeam) => {
        const index = subEvent.teams.findIndex((t) => t.id == team.id);
        this.validate(newTeam, subEvent);
        subEvent.teams[index] = newTeam;
        this.changeDetector.detectChanges();
      });
  }

  private validate(team: Team, subEvent: CompetitionSubEvent) {
    const issues = {
      level: [],
      base: [],
      hasIssues: false,
      message: '',
      class: '',
    };
    const warnings = {
      base: [],
      level: [],
      hasIssues: false,
    };


    for (const player of team.players) {
      if (player?.rankingPlaces && player?.rankingPlaces?.length > 0) {
        const rankingPlace = player?.rankingPlaces[0];
        if (player.base) {
          if (rankingPlace.single < subEvent.maxLevel) {
            issues.hasIssues = true;
            issues.level.push(
              `${player.fullName} not allowed (single: ${rankingPlace.single}, max ${subEvent.maxLevel})`
            );
          }
          if (rankingPlace.double < subEvent.maxLevel) {
            issues.hasIssues = true;
            issues.level.push(
              `${player.fullName} not allowed (double: ${rankingPlace.double}, max ${subEvent.maxLevel})`
            );
          }
          if (subEvent.gameType == 'MX') {
            if (rankingPlace.mix < subEvent.maxLevel) {
              issues.hasIssues = true;
              issues.level.push(
                `${player.fullName} not allowed (mix: ${rankingPlace.mix}, max ${subEvent.maxLevel})`
              );
            }
          }
        } else {
          if (rankingPlace.single < subEvent.maxLevel) {
            warnings.hasIssues = true;
            warnings.level.push(
              `${player.fullName} can't play (single: ${rankingPlace.single}, max: ${subEvent.maxLevel})`
            );
          }
          if (rankingPlace.double < subEvent.maxLevel) {
            warnings.hasIssues = true;
            warnings.level.push(
              `${player.fullName} can't play (double: ${rankingPlace.double} max: ${subEvent.maxLevel})`
            );
          }
          if (subEvent.gameType == 'MX') {
            if (rankingPlace.mix < subEvent.maxLevel) {
              warnings.hasIssues = true;
              warnings.level.push(
                `${player.fullName} can't play (mix: ${rankingPlace.mix} max: ${subEvent.maxLevel})`
              );
            }
          }
        }
      }
    }

    const bestIndex = team.players
    .map((r) => r.index)
    .sort((a, b) => a - b)
    .slice(0, 4)
    .reduce((a, b) => a + b, 0);

    if (bestIndex < subEvent.minBaseIndex){
      warnings.hasIssues = true;
      warnings.base.push('Best 4 players can\'t play together');
    }

    if (team.baseIndex < subEvent.minBaseIndex) {
      issues.hasIssues = true;
      issues.base.push('Team base index is to strong');
    }

    if (issues.hasIssues) {
      issues.message += issues.base.join('\n\r');
      if (issues.base.length > 0 && issues.level.length > 0) {
        issues.message += '\n\r';
      }
      issues.message += issues.level.join('\n\r');
    }

    if (issues.hasIssues && warnings.hasIssues) {
      issues.message += '\n\r';
    }

    if (warnings.hasIssues) {
      issues.message += warnings.base.join('\n\r');
      if (warnings.base.length > 0 && warnings.level.length > 0) {
        issues.message += '\n\r';
      }
      issues.message += warnings.level.join('\n\r');
    }

    issues.class = issues.hasIssues
      ? 'issues'
      : warnings.hasIssues
      ? 'warnings'
      : '';

    this.issues[team.id] = issues;
  }

  private initialPlacing() {
    const subEventsSorted = this.subEvents.sort((a, b) => b.level - a.level);
    for (const team of this.teams) {
      let subEvent = null;
      let wasAlreadyAssigned = false;

      for (const tse of team.subEvents) {
        subEvent = subEventsSorted.find((s) => s.id === tse.id);
        if (subEvent) {
          wasAlreadyAssigned = true;
          break;
        }
      }

      if (!subEvent) {
        subEvent = subEventsSorted.find(
          (subEvent) => team.baseIndex > subEvent.minBaseIndex
        );
      }

      if (!subEvent && subEventsSorted.length > 0) {
        subEventsSorted[0].teams?.push(team);
      } else {
        subEvent?.teams?.push(team);
        if (!wasAlreadyAssigned) {
          this.onChange.next({
            teamId: team.id,
            oldSubEventId: null,
            newSubEventId: subEvent.id,
          });
        }
      }
      this.validate(team, subEvent);
    }

    const natSubEvents = this.subEvents
      .filter((a) => a.levelType == 'NATIONAL')
      .sort((a, b) => a.level - b.level);
    const ligaSubEvents = this.subEvents
      .filter((a) => a.levelType == 'LIGA')
      .sort((a, b) => a.level - b.level);
    const provSubEvents = this.subEvents
      .filter((a) => a.levelType == 'PROV')
      .sort((a, b) => a.level - b.level);

    this.subEvents = [...natSubEvents, ...ligaSubEvents, ...provSubEvents];
  }
}
