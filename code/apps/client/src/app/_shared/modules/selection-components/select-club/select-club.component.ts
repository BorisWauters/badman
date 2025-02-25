import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, Observable, of } from 'rxjs';
import { filter, map, startWith, switchMap, take } from 'rxjs/operators';
import { Club } from '../../../models';
import { ClaimService, ClubService, UserService } from '../../../services';

@Component({
  selector: 'badman-select-club',
  templateUrl: './select-club.component.html',
  styleUrls: ['./select-club.component.scss'],
})
export class SelectClubComponent implements OnInit, OnDestroy {
  @Input()
  controlName = 'club';

  @Input()
  formGroup!: FormGroup;

  @Input()
  singleClubPermission!: string;

  @Input()
  allClubPermission!: string;

  @Input()
  needsPermission = false;

  @Input()
  updateUrl = false;

  formControl = new FormControl<string | undefined>(undefined, [Validators.required]);
  clubs!: Club[];

  filteredClubs?: Observable<Club[]>;

  @Input()
  useAutocomplete: true | false | 'auto' = 'auto';

  @Input()
  autoCompleteTreshold = 5;

  constructor(
    private clubService: ClubService,
    private claimSerice: ClaimService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private user: UserService
  ) {}

  async ngOnInit() {
    if (this.formGroup.get(this.controlName) == null) {
      this.formGroup.addControl(this.controlName, this.formControl);
    }

    this.filteredClubs = this.formGroup
      .get(this.controlName)
      ?.valueChanges.pipe(
        startWith(''),
        map((value) => this._filter(value))
      );

    combineLatest([
      this.claimSerice.hasAllClaims$([`*_${this.singleClubPermission}`]),
      this.claimSerice.hasAllClaims$([`${this.allClubPermission}`]),
      this.user.profile$,
    ])
      .pipe(
        switchMap(([single, all]) => {
          if (all) {
            return this.clubService.getClubs({ take: 999 });
          } else if (single) {
            return this.claimSerice.claims$.pipe(
              map((r) =>
                r.filter(
                  (x) => x?.name?.indexOf(this.singleClubPermission) != -1
                )
              ),
              map((r) =>
                r.map((c) =>
                  c?.name?.replace(`_${this.singleClubPermission}`, '')
                )
              ),
              switchMap((ids) =>
                this.clubService.getClubs({ ids, take: ids.length })
              )
            );
          } else if (this.needsPermission) {
            return of({ rows: [], count: 0 });
          } else {
            return this.clubService.getClubs({ take: 999 });
          }
        }),
        take(1),
        map((data) => {
          const count = data?.count || 0;
          if (count) {
            if (this.useAutocomplete == 'auto') {
              this.useAutocomplete = count > this.autoCompleteTreshold;
            }
            return data?.rows?.sort((a, b) => {
              if (!a?.name || !b?.name) {
                return 0;
              }
              return a.name.localeCompare(b.name);
            });
          } else {
            return [];
          }
        })
      )
      .subscribe((data) => {
        this.clubs = data;

        if (this.updateUrl) {
          this.formControl.valueChanges
            .pipe(filter((r) => !!r))
            .subscribe((r) => {
              this.router.navigate([], {
                relativeTo: this.activatedRoute,
                queryParams: {
                  club: this.clubs.find((x) => x.id === r)?.slug,
                },
                queryParamsHandling: 'merge',
              });
            });

          const params = this.activatedRoute.snapshot.queryParams;
          let foundClub: Club | null = null;

          if (params && params['club'] && this.clubs.length > 0) {
            foundClub =
              this.clubs.find(
                (r) => r.slug === params['club'] || r.id === params['club']
              ) ?? null;
          }

          if (foundClub == null) {
            const clubIds = this.user?.profile?.clubs?.map((r) => r.id);
            if (clubIds) {
              foundClub =
                this.clubs.find((r) => clubIds.includes(r.id)) ?? null;
            }
          }

          if (foundClub == null && this.clubs.length == 1) {
            foundClub = this.clubs[0];
            this.formControl.disable();
          }

          if (foundClub) {
            this.formControl.setValue(foundClub.id, { onlySelf: true });
            // this.autoCompleteFormControl.setValue(foundClub, { onlySelf: true });
          } else {
            this.router.navigate([], {
              relativeTo: this.activatedRoute,
              queryParams: {
                club: undefined,
                team: undefined,
                encounter: undefined,
              },
              queryParamsHandling: 'merge',
            });
          }
        }
      });
  }

  private _filter(value?: string | Club): Club[] {
    if (value == null) {
      return this.clubs ?? [];
    }
    let filterValue = '';

    if (value instanceof Club) {
      filterValue = value.id ?? '';
    } else {
      filterValue = value?.toLowerCase();
    }

    return (this.clubs ?? []).filter(
      (option) =>
        option.name?.toLowerCase().includes(filterValue) ||
        option.id?.toLowerCase().includes(filterValue)
    );
  }

  displayFn(value?: string | Club): string {
    if (value instanceof Club) {
      return value?.name ?? '';
    } else {
      return this.clubs?.find((r) => r.id === value)?.name ?? '';
    }
  }

  ngOnDestroy() {
    this.formGroup.removeControl(this.controlName);
  }
}
