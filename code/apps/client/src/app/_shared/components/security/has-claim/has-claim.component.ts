import { Component, Input, OnInit } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ClaimService } from '../../../services';

@Component({
  selector: 'badman-has-claim',
  templateUrl: './has-claim.component.html',
  styleUrls: ['./has-claim.component.scss'],
})
export class HasClaimComponent implements OnInit {
  @Input()
  any!: string | string[];

  @Input()
  all!: string | string[];

  // @Input()
  // some: string|string[]

  show$!: Observable<boolean>;

  constructor(private auth: ClaimService) {}

  ngOnInit(): void {
    const permissions: Observable<boolean>[] = [];

    if (this.any) {
      permissions.push(
        Array.isArray(this.any)
          ? this.auth.hasAnyClaims$(this.any)
          : this.auth.hasClaim$(this.any)
      );
    }

    if (this.all) {
      permissions.push(
        Array.isArray(this.all)
          ? this.auth.hasAllClaims$(this.all)
          : this.auth.hasClaim$(this.all)
      );
    }

    this.show$ = combineLatest(permissions).pipe(
      map((claims) => claims.reduce((acc, claim) => acc || claim, false))
    );
  }
}
