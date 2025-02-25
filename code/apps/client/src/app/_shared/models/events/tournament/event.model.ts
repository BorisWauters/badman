import { Event, EventType } from '../event.model';
import { TournamentSubEvent } from './sub-event.model';

export class EventTournament extends Event {
  firstDay?: Date;
  dates: Date[];
  subEventTournaments?: TournamentSubEvent[];
  tournamentNumber?: number;

  constructor({ ...args }: Partial<EventTournament>) {
    super(args);
    this.firstDay =
      args?.firstDay != null ? new Date(args.firstDay) : undefined;
    this.dates = (args.dates as unknown as string)
      ?.split(',')
      .map((x) => new Date(x));
    this.tournamentNumber = args.tournamentNumber;
    this.eventType = args.eventType ?? EventType.TOURNAMENT;
    this.subEventTournaments = args?.subEventTournaments
      ?.map((s) => new TournamentSubEvent(s))
      .sort((a, b) => (a?.level ?? 0) - (b?.level ?? 0))
      .sort((a, b) => (a?.eventType ?? 'A').localeCompare(b?.eventType ?? 'A'))
      .sort((a, b) => (a?.gameType ?? 'A').localeCompare(b?.gameType ?? 'A'));
  }
}
