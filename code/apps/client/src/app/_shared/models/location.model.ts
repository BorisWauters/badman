import { EventCompetition, EventTournament } from './events';
import { Availability } from './availibilty.model';

export class Location {
  id?: string;
  name?: string;
  address?: string;
  postalcode?: string;
  city?: string;
  state?: string;
  phone?: string;
  fax?: string;
  street?: string;
  streetNumber?: string;
  competitionEvents?: EventCompetition[];
  eventTournements?: EventTournament[];
  availibilities: Availability[];
  courts?: number;

  constructor(args?: Partial<Location>) {
    this.id = args?.id;
    this.name = args?.name;
    this.address = args?.address;
    this.postalcode = args?.postalcode;
    this.city = args?.city;
    this.state = args?.state;
    this.phone = args?.phone;
    this.fax = args?.fax;
    this.street = args?.street;
    this.streetNumber = args?.streetNumber;
    this.competitionEvents = args?.competitionEvents?.map(
      (r) => new EventCompetition(r)
    );
    this.eventTournements = args?.eventTournements?.map(
      (r) => new EventTournament(r)
    );
    this.availibilities =
      args?.availibilities?.map((r) => new Availability(r)) ?? [];
    this.courts = args?.courts;
  }
}
