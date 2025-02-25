import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  copyArrayItem,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { Component, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';
import {
  Club,
  EventCompetition,
  Entry,
  LevelType,
  Player,
  SystemService,
  Team,
} from '../../../../../../../_shared';
import moment from 'moment';
import {
  combineLatest,
  distinctUntilChanged,
  filter,
  lastValueFrom,
  map,
  pairwise,
  switchMap,
  take,
} from 'rxjs';

@Component({
  selector: 'badman-assembly',
  templateUrl: './assembly.component.html',
  styleUrls: ['./assembly.component.scss'],
})
export class AssemblyComponent implements OnInit {
  @Input()
  formGroup!: FormGroup;

  lists = [
    'playerList',
    'substitudeList',
    'single1List',
    'single2List',
    'single3List',
    'single4List',
    'double1List',
    'double2List',
    'double3List',
    'double4List',
  ];

  single1: Player[] = [];
  single2: Player[] = [];
  single3: Player[] = [];
  single4: Player[] = [];

  double1: Player[] = [];
  double2: Player[] = [];
  double3: Player[] = [];
  double4: Player[] = [];

  substitude: Player[] = [];
  players: Player[] = [];

  wherePlayer: { [key: string]: unknown } = {};

  captionSingle1Prefix = '';
  captionSingle2Prefix = '';
  captionSingle3Prefix = '';
  captionSingle4Prefix = '';
  captionDouble1Prefix = '';
  captionDouble2Prefix = '';
  captionDouble3Prefix = '';
  captionDouble4Prefix = '';

  captionSingle1 = 'competition.team-assembly.single1';
  captionSingle2 = 'competition.team-assembly.single2';
  captionSingle3 = 'competition.team-assembly.single3';
  captionSingle4 = 'competition.team-assembly.single4';

  captionDouble1 = 'competition.team-assembly.double1';
  captionDouble2 = 'competition.team-assembly.double2';
  captionDouble3 = 'competition.team-assembly.double3';
  captionDouble4 = 'competition.team-assembly.double4';

  type?: string;

  teamIndex = 0;
  teamNumber = 0;
  club!: string;

  entry?: Entry;

  ignorePlayers!: Player[];
  loaded = false;
  gotRequired = false;
  errors = {} as { [key: string]: string };
  totalPlayers = 0;

  constructor(private apollo: Apollo, private systemService: SystemService) {}

  ngOnInit() {
    this.formGroup.addControl('single1', new FormControl());
    this.formGroup.addControl('single2', new FormControl());
    this.formGroup.addControl('single3', new FormControl());
    this.formGroup.addControl('single4', new FormControl());
    this.formGroup.addControl('double1', new FormControl());
    this.formGroup.addControl('double2', new FormControl());
    this.formGroup.addControl('double3', new FormControl());
    this.formGroup.addControl('double4', new FormControl());
    this.formGroup.addControl('substitude', new FormControl());
    this.formGroup.addControl('captain', new FormControl());

    const encounterCntrl = this.formGroup.get('encounter');
    if (!encounterCntrl) {
      throw new Error('encounter is not set');
    }

    const teamCntrl = this.formGroup.get('team');
    if (!teamCntrl) {
      throw new Error('team is not set');
    }

    // only update if the encounter was null or became null
    const encoutner$ = encounterCntrl.valueChanges.pipe(
      pairwise(),
      filter(([prev, next]) => next == null || (prev == null && next != null)),
      map(([, next]) => next)
    );

    combineLatest([teamCntrl.valueChanges, encoutner$])
      .pipe(
        map(([team, encounter]) => team != null && encounter != null),
        distinctUntilChanged()
      )
      .subscribe(async (gotRequired) => {
        this.gotRequired = gotRequired;

        if (gotRequired) {
          await this.loadData();
        }
      });
  }

  async loadData() {
    // Clear everything
    this.formGroup.get('single1')?.reset();
    this.formGroup.get('single2')?.reset();
    this.formGroup.get('single3')?.reset();
    this.formGroup.get('single4')?.reset();
    this.formGroup.get('double1')?.reset();
    this.formGroup.get('double2')?.reset();
    this.formGroup.get('double3')?.reset();
    this.formGroup.get('double4')?.reset();
    this.formGroup.get('substitude')?.reset();

    this.single1 = [];
    this.single2 = [];
    this.single3 = [];
    this.single4 = [];

    this.double1 = [];
    this.double2 = [];
    this.double3 = [];
    this.double4 = [];

    // Get values
    this.club = this.formGroup.get('club')?.value;
    const teamId = this.formGroup.get('team')?.value;
    const event = this.formGroup.get('event')?.value as EventCompetition;

    if (
      !event ||
      !event.startYear ||
      !event.usedRankingUnit ||
      !event.usedRankingAmount
    ) {
      throw new Error('event is not set');
    }

    const usedRankingDate = moment();
    usedRankingDate.set('year', event.startYear);
    usedRankingDate.set(event.usedRankingUnit, event.usedRankingAmount);

    const startRanking = usedRankingDate.clone().set('date', 0);
    const endRanking = usedRankingDate.clone().clone().endOf('month');

    const teams =
      (await lastValueFrom(
        this.systemService
          .getPrimarySystem()
          .pipe(
            take(1),
            switchMap((system) =>
              this.apollo.query<{ club: Club }>({
                query: gql`
                  query GetTeamInfo(
                    $clubId: ID!
                    $rankingWhere: JSONObject
                    $entryWhere: JSONObject
                    $lastRankginWhere: JSONObject
                  ) {
                    club(id: $clubId) {
                      id
                      teams(where: { active: true }) {
                        id
                        type
                        teamNumber
                        entries(where: $entryWhere) {
                          id
                          competitionSubEvent {
                            id
                            maxLevel
                            minBaseIndex
                            maxBaseIndex
                            eventCompetition {
                              id
                              type
                            }
                          }
                          meta {
                            competition {
                              teamIndex
                              players {
                                id
                              }
                            }
                          }
                        }
                        players {
                          id
                          slug
                          fullName
                          gender
                          competitionPlayer
                          base
                          rankingLastPlaces(where: $lastRankginWhere) {
                            id
                            single
                            double
                            mix
                          }
                          rankingPlaces(where: $rankingWhere) {
                            id
                            rankingDate
                            single
                            double
                            mix
                          }
                        }
                        captain {
                          id
                          fullName
                        }
                      }
                    }
                  }
                `,
                variables: {
                  clubId: this.club,
                  rankingWhere: {
                    rankingDate: {
                      $between: [startRanking, endRanking],
                    },
                    systemId: system?.id,
                  },
                  lastRankginWhere: {
                    systemId: system?.id,
                  },
                  entryWhere: {
                    subEventId: {
                      $in: event.subEventCompetitions?.map((r) => r.id),
                    },
                  },
                },
              })
            )
          )
          .pipe(
            map((x) =>
              x.data?.club?.teams?.map((t: Partial<Team>) => new Team(t))
            )
          )
      )) ?? [];

    const team = teams?.find((r) => r.id === teamId);
    if (!team || !team.teamNumber) {
      throw new Error('team is not set');
    }
    this.teamNumber = team.teamNumber;
    this.type = team?.type;
    this.formGroup.get('captain')?.setValue(team?.captain?.id);

    // Sort the players
    this.players =
      team?.players.sort((a, b) => {
        if (a.gender != b.gender) {
          return a.gender == 'F' ? -1 : 1;
        }

        const playerA =
          (a.lastRanking?.single ?? 12) +
          (a.lastRanking?.double ?? 12) +
          (this.type == 'MX' ? a.lastRanking?.mix ?? 12 : 0);

        const playerB =
          (b.lastRanking?.single ?? 12) +
          (b.lastRanking?.double ?? 12) +
          (this.type == 'MX' ? b.lastRanking?.mix ?? 12 : 0);

        // If the same return single
        if (playerA == playerB) {
          return a.lastRanking?.single ?? 12 - (b.lastRanking?.single ?? 12);
        }

        return playerA - playerB;
      }) ?? [];

    this.entry = team.entries?.[0];
    if (!this.entry) {
      throw new Error('entry is not set');
    }

    this.wherePlayer = {
      gender:
        this.type == 'MX' || this.type == 'NATIONAL' ? undefined : this.type,
      id: {
        $notIn: this.players?.map((p) => p.id),
      },
    };

    // Reset prefix when not full reloading this would be cached
    this.captionSingle1Prefix = '';
    this.captionDouble4Prefix = '';
    this.captionSingle2Prefix = '';
    this.captionSingle3Prefix = '';
    this.captionSingle4Prefix = '';
    this.captionDouble1Prefix = '';
    this.captionDouble2Prefix = '';
    this.captionDouble3Prefix = '';

    this.captionSingle1 = 'competition.team-assembly.single1';
    this.captionSingle2 = 'competition.team-assembly.single2';
    this.captionSingle3 = 'competition.team-assembly.single3';
    this.captionSingle4 = 'competition.team-assembly.single4';

    this.captionDouble1 = 'competition.team-assembly.double1';
    this.captionDouble2 = 'competition.team-assembly.double2';
    this.captionDouble3 = 'competition.team-assembly.double3';
    this.captionDouble4 = 'competition.team-assembly.double4';

    // Set prefixes of form
    if (this.type == 'M') {
      this.captionSingle1Prefix = 'gender.male';
      this.captionSingle2Prefix = 'gender.male';
      this.captionSingle3Prefix = 'gender.male';
      this.captionSingle4Prefix = 'gender.male';
      this.captionDouble1Prefix = 'gender.male';
      this.captionDouble2Prefix = 'gender.male';
      this.captionDouble3Prefix = 'gender.male';
      this.captionDouble4Prefix = 'gender.male';
    } else if (this.type == 'F') {
      this.captionSingle1Prefix = 'gender.female';
      this.captionSingle2Prefix = 'gender.female';
      this.captionSingle3Prefix = 'gender.female';
      this.captionSingle4Prefix = 'gender.female';
      this.captionDouble1Prefix = 'gender.female';
      this.captionDouble2Prefix = 'gender.female';
      this.captionDouble3Prefix = 'gender.female';
      this.captionDouble4Prefix = 'gender.female';
    } else {
      this.captionSingle1Prefix = 'gender.male';
      this.captionSingle2Prefix = 'gender.male';

      this.captionSingle3Prefix = 'gender.female';
      this.captionSingle4Prefix = 'gender.female';

      this.captionSingle3 = 'competition.team-assembly.single1';
      this.captionSingle4 = 'competition.team-assembly.single2';

      this.captionDouble1 = `competition.team-assembly.mix1`;
      this.captionDouble2 = `competition.team-assembly.mix2`;
      this.captionDouble3 = `competition.team-assembly.mix3`;
      this.captionDouble4 = `competition.team-assembly.mix4`;
    }

    // Ignore ids
    this.ignorePlayers = [];
    const ignoredLevels: LevelType[] = [];
    if (
      this.entry.competitionSubEvent?.eventCompetition?.type == LevelType.PROV
    ) {
      ignoredLevels.push(LevelType.LIGA);
      ignoredLevels.push(LevelType.NATIONAL);
    } else if (
      this.entry.competitionSubEvent?.eventCompetition?.type == LevelType.LIGA
    ) {
      ignoredLevels.push(LevelType.NATIONAL);
    }

    for (const dbTeam of teams) {
      if (dbTeam.type == team.type && dbTeam.id != teamId) {
        if (
          (dbTeam.entries?.[0]?.competitionSubEvent?.eventCompetition?.type ??
            null) == null
        ) {
          continue;
        }

        // Base players
        if (
          dbTeam.entries?.[0].competitionSubEvent?.eventCompetition?.type &&
          ignoredLevels.includes(
            dbTeam.entries?.[0].competitionSubEvent?.eventCompetition?.type
          )
        ) {
          this.ignorePlayers.push(
            ...(dbTeam?.entries?.[0]?.meta?.competition?.players?.map((p) => {
              return { id: p.id } as Player;
            }) ?? [])
          );
        } else if (
          dbTeam.entries?.[0].competitionSubEvent?.eventCompetition?.type ==
          team.entries?.[0].competitionSubEvent?.eventCompetition?.type
        ) {
          if (!dbTeam || !dbTeam.teamNumber) {
            throw new Error('dbTeam is not set');
          }

          if (dbTeam.teamNumber < team.teamNumber) {
            this.ignorePlayers.push(
              ...(dbTeam.entries?.[0]?.meta?.competition?.players?.map((p) => {
                return { id: p.id } as Player;
              }) ?? [])
            );
          } else if (dbTeam.entries?.[0]?.id == team?.entries?.[0]?.id) {
            this.ignorePlayers.push(
              ...(dbTeam.entries?.[0]?.meta?.competition?.players?.map((p) => {
                return { id: p.id } as Player;
              }) ?? [])
            );
          }
        }

        const levelRestirced = dbTeam.players.filter((p) => {
          if (!this.entry?.competitionSubEvent?.maxLevel) {
            throw new Error('entry.competitionSubEvent is not set');
          }

          return (
            (p.rankingPlaces?.[0]?.single ?? 12) <
              this.entry.competitionSubEvent.maxLevel ||
            (p.rankingPlaces?.[0]?.double ?? 12) <
              this.entry?.competitionSubEvent.maxLevel ||
            (this.type == 'MX' &&
              (p.rankingPlaces?.[0]?.mix ?? 12) <
                this.entry.competitionSubEvent.maxLevel)
          );
        });
        if (levelRestirced.length > 0) {
          this.ignorePlayers.push(...levelRestirced);
        }
      }

      // ignore duplicates for improved queries
      this.ignorePlayers = this.ignorePlayers.filter(
        (value, index, self) =>
          self.findIndex((m) => m.id === value.id) === index
      );
    }

    // calculate team index
    this._calculateIndex();

    // Done
    this.loaded = true;
  }

  addPlayer(player: Player) {
    this.players.push(player);

    this.wherePlayer['id'] = {
      $notIn: this.players?.map((p) => p.id),
    };
  }

  selectedCaptain(player: Player) {
    this.formGroup.get('captain')?.setValue(player.id);
  }

  canDropPredicate = (item: CdkDrag, drop: CdkDropList<Player[]>) => {
    const length = drop?.data?.length ?? 0;

    if (drop?.id.includes('single')) {
      if (length >= 1) {
        return false;
      }
    }

    if (drop?.id.includes('double')) {
      if (length >= 2) {
        return false;
      }
    }

    if (drop?.data?.map((r) => r.id).includes(item.data.id)) {
      return false;
    }

    if (this.type == 'MX') {
      if (drop.id == 'double1List' && item.data.gender == 'F') {
        return false;
      } else if (drop.id == 'double2List' && item.data.gender == 'M') {
        return false;
      } else if (drop.id == 'double3List' || drop.id == 'double4List') {
        if (item.data.gender == 'M') {
          return drop.data.filter((r) => r.gender == 'M').length != 1;
        } else {
          return drop.data.filter((r) => r.gender == 'F').length != 1;
        }
      } else if (
        (drop.id == 'single1List' || drop.id == 'single2List') &&
        item.data.gender == 'F'
      ) {
        return false;
      } else if (
        (drop.id == 'single3List' || drop.id == 'single4List') &&
        item.data.gender == 'M'
      ) {
        return false;
      }
    }

    return true;
  };

  drop(event: CdkDragDrop<Player[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    } else {
      const movedPlayer = event.previousContainer.data[event.previousIndex];

      if (
        event.container.id == 'playerList' &&
        event.container.data?.map((r) => r.id).includes(movedPlayer.id)
      ) {
        event.previousContainer.data.splice(event.previousIndex, 1);
        this._doChecks();
        return;
      }

      if (event.previousContainer.id == 'playerList') {
        const singles = [
          ...this.single1,
          ...this.single2,
          ...this.single3,
          ...this.single4,
        ];
        const doubles = [
          ...this.double1,
          ...this.double2,
          ...this.double3,
          ...this.double4,
        ];

        const singlesCount = singles.filter(
          (p) => p.id === movedPlayer.id
        ).length;
        const doublesCount = doubles.filter(
          (p) => p.id === movedPlayer.id
        ).length;
        if (
          singlesCount > 0 &&
          event.container.id.includes('single') &&
          !event.previousContainer.id.includes('single')
        ) {
          return;
        }

        if (doublesCount > 1 && event.container.id.includes('double')) {
          return;
        }

        copyArrayItem(
          event.previousContainer.data,
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
      }

      if (event.container.id !== 'substitudeList') {
        this.substitude = this.substitude.filter(
          (r) => r.id !== movedPlayer.id
        );
      }
      this._doChecks();
    }
  }

  private _doChecks() {
    this._calculateIndex();
    this._checkOtherLists();
    this._sortLists();

    // Count all players
    this.totalPlayers =
      this.single1.length +
      this.single2.length +
      this.single3.length +
      this.single4.length +
      this.double1.length +
      this.double2.length +
      this.double3.length +
      this.double4.length +
      this.substitude.length;

    this.formGroup.get('single1')?.setValue(this.single1[0]);
    this.formGroup.get('single2')?.setValue(this.single2[0]);
    this.formGroup.get('single3')?.setValue(this.single3[0]);
    this.formGroup.get('single4')?.setValue(this.single4[0]);
    this.formGroup.get('double1')?.setValue(this.double1);
    this.formGroup.get('double2')?.setValue(this.double2);
    this.formGroup.get('double3')?.setValue(this.double3);
    this.formGroup.get('double4')?.setValue(this.double4);
    this.formGroup.get('substitude')?.setValue(this.substitude);
  }

  private _sortLists() {
    const sortList = (a: Player, b: Player) => {
      if (a.gender != b.gender) {
        return a.gender == 'F' ? -1 : 1;
      }

      const playerA =
        (a.lastRanking?.single ?? 12) +
        (a.lastRanking?.double ?? 12) +
        (this.type == 'MX' ? a.lastRanking?.mix ?? 12 : 12);

      const playerB =
        (b.lastRanking?.single ?? 12) +
        (b.lastRanking?.double ?? 12) +
        (this.type == 'MX' ? b.lastRanking?.mix ?? 12 : 12);

      // If the same return single
      if (playerA == playerB) {
        return a.lastRanking?.single ?? 12 - (b.lastRanking?.single ?? 12);
      }

      return playerA - playerB;
    };

    const sortDouble = (a: Player, b: Player) => {
      const playerA = a.lastRanking?.double ?? 12;
      const playerB = b.lastRanking?.double ?? 12;

      return playerA - playerB;
    };

    const sortMix = (a: Player, b: Player) => {
      if (a.gender == b.gender) {
        return sortDouble(a, b);
      } else {
        return a.gender == 'F' ? -1 : 1;
      }
    };

    this.players = this.players.sort(sortList);
    this.substitude = this.substitude.sort(sortList);

    this.double1 = this.double1.sort(sortDouble);
    this.double2 = this.double2.sort(sortDouble);

    if (this.type == 'MX') {
      this.double3 = this.double3.sort(sortMix);
      this.double4 = this.double4.sort(sortMix);
    } else {
      this.double3 = this.double3.sort(sortDouble);
      this.double4 = this.double4.sort(sortDouble);
    }
  }

  private _checkOtherLists() {
    const checkDoubles = (
      list1: Player[],
      list2: Player[],
      type: 'double' | 'mix'
    ) => {
      const double1 =
        (list1[0]?.lastRanking?.[type] ?? 12) +
        (list1[1]?.lastRanking?.[type] ?? 12);
      const double2 =
        (list2[0]?.lastRanking?.[type] ?? 12) +
        (list2[1]?.lastRanking?.[type] ?? 12);

      if (list1.length == 2 && list2.length == 2) {
        if (double1 > double2) {
          return 'competition.team-assembly.errors.players-above-lower';
        }

        if (double1 == double2) {
          const dl1 =
            (list1[0]?.lastRanking?.[type] ?? 12) <
            (list1[1]?.lastRanking?.[type] ?? 12)
              ? list1[0]?.lastRanking?.[type] ?? 12
              : list1[1]?.lastRanking?.[type] ?? 12;

          const dl2 =
            (list2[0]?.lastRanking?.[type] ?? 12) <
            (list2[1]?.lastRanking?.[type] ?? 12)
              ? list2[0]?.lastRanking?.[type] ?? 12
              : list2[1]?.lastRanking?.[type] ?? 12;
          if (dl1 > dl2) {
            return 'competition.team-assembly.errors.players-above-lower';
          }
        }
      }
      return;
    };

    this.errors = {};

    const single1 = this.single1[0]?.lastRanking?.single ?? 12;
    const single2 = this.single2[0]?.lastRanking?.single ?? 12;
    const single3 = this.single3[0]?.lastRanking?.single ?? 12;
    const single4 = this.single4[0]?.lastRanking?.single ?? 12;

    if (this.type == 'MX') {
      if (single1 > single2) {
        this.errors['single2'] =
          'competition.team-assembly.errors.player-above-lower';
      }

      if (single3 > single4) {
        this.errors['single4'] =
          'competition.team-assembly.errors.player-above-lower';
      }

      const doubles34 = checkDoubles(this.double3, this.double4, 'mix');
      if (doubles34) {
        this.errors['double4'] = doubles34;
      }
    } else {
      if (single1 > single2) {
        this.errors['single2'] =
          'competition.team-assembly.errors.player-above-lower';
      }

      if (single2 > single3) {
        this.errors['single3'] =
          'competition.team-assembly.errors.player-above-lower';
      }

      if (single3 > single4) {
        this.errors['single4'] =
          'competition.team-assembly.errors.player-above-lower';
      }

      const doubles12 = checkDoubles(this.double1, this.double2, 'double');
      if (doubles12) {
        this.errors['double2'] = doubles12;
      }

      const doubles23 = checkDoubles(this.double2, this.double3, 'double');
      if (doubles23) {
        this.errors['double3'] = doubles23;
      }

      const doubles34 = checkDoubles(this.double3, this.double4, 'double');
      if (doubles34) {
        this.errors['double4'] = doubles34;
      }
    }
  }

  private _calculateIndex() {
    const players = [
      ...this.single1,
      ...this.single2,
      ...this.single3,
      ...this.single4,
      ...this.double1,
      ...this.double2,
      ...this.double3,
      ...this.double4,
    ];

    const ids = players.map((o) => o.id);
    const filtered = players.filter(
      ({ id }, index) => !ids.includes(id, index + 1)
    );

    if (this.type !== 'MX') {
      const bestPlayers = filtered
        .map((r) => r.indexOfDate(this.type))
        .sort((a, b) => a - b)
        .slice(0, 4);

      let missingIndex = 0;
      if (bestPlayers.length < 4) {
        missingIndex = (4 - bestPlayers.length) * 24;
      }

      this.teamIndex = bestPlayers.reduce((a, b) => a + b, missingIndex);
    } else {
      const bestPlayers = [
        // 2 best male
        ...filtered
          .filter((p) => p.gender == 'M')
          .map((r) => r.indexOfDate(this.type))
          .sort((a, b) => a - b)
          .slice(0, 2),
        // 2 best female
        ...filtered
          .filter((p) => p.gender == 'F')
          .map((r) => r.indexOfDate(this.type))
          .sort((a, b) => a - b)
          .slice(0, 2),
      ];

      let missingIndex = 0;
      if (bestPlayers.length < 4) {
        missingIndex = (4 - bestPlayers.length) * 36;
      }

      this.teamIndex = bestPlayers.reduce((a, b) => a + b, missingIndex);
    }
  }
}
