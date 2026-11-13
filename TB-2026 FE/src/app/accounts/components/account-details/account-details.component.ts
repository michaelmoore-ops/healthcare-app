// src/app/accounts/components/account-details/account-details.component.ts

import { Component, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountFacadeService } from '../../services/account-facade.service';
import { AccountInfoFormComponent } from '../account-info-form/account-info-form.component';
import { AccountComplianceComponent } from '../account-compliance/account-compliance.component';
import { APP_ROUTES_PATH_CONST } from '../../../core/constants/app-routing-contants';
import { GTIPage, GTIPageEnterContext } from '../../../shared/base/gti-page';

@Component({
  selector: 'app-account-details',
  standalone: true,
  imports: [CommonModule, AccountInfoFormComponent, AccountComplianceComponent],
  providers: [AccountFacadeService],
  templateUrl: './account-details.component.html',
  styleUrl: './account-details.component.scss'
})
export class AccountDetailsComponent extends GTIPage {

  constructor(
    injector: Injector,
    public readonly facade: AccountFacadeService
  ) {
    super(injector);
  }

  /** First entry: wire the facade's long-lived streams (they load the account). */
  protected override onSetup(): void {
    this.facade.initialize();
  }

  /** Re-entry to the cached page: reload so the data isn't stale. */
  protected override loadData({ isFirstEnter }: GTIPageEnterContext): void {
    if (!isFirstEnter) {
      this.facade.refresh();
    }
  }

  backToAccountGrid(): void {
    void this.navigateTo(['/' + APP_ROUTES_PATH_CONST.ACCOUNT_GRID]);
  }
}
