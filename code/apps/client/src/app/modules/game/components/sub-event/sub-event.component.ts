import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {
  CompetitionEncounter,
  Player,
  TournamentDraw,
} from '../../../../_shared';

@Component({
  selector: 'badman-sub-event',
  templateUrl: './sub-event.component.html',
  styleUrls: ['./sub-event.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubEventComponent {
  @Input() competition?: CompetitionEncounter;
  @Input() tournament?: TournamentDraw;
  @Input() player?: Player;
}
