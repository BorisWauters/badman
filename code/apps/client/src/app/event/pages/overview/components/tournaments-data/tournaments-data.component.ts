import { Component, Input } from '@angular/core';

@Component({
  selector: 'badman-tournaments-data',
  templateUrl: './tournaments-data.component.html',
  styleUrls: ['./tournaments-data.component.scss'],
})
export class tournamentsDataComponent {
  @Input()
  data!: Event;
}
