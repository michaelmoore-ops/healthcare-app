// src/app/accounts/components/account-details/account-details.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AccountFacadeService } from '../../services/account-facade.service';
import { AccountInfoFormComponent } from '../account-info-form/account-info-form.component';
import { AccountComplianceComponent } from '../account-compliance/account-compliance.component';
import { APP_ROUTES_PATH_CONST } from '../../../core/constants/app-routing-contants';

@Component({
  selector: 'app-account-details',
  standalone: true,
  imports: [CommonModule, AccountInfoFormComponent, AccountComplianceComponent],
  providers: [AccountFacadeService],
  templateUrl: './account-details.component.html',
  styleUrl: './account-details.component.scss'
})
export class AccountDetailsComponent implements OnInit {

  constructor(
    public readonly facade: AccountFacadeService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.facade.initialize();
  }

  backToAccountGrid(): void {
    this.router.navigate(['/' + APP_ROUTES_PATH_CONST.ACCOUNT_GRID]);
  }
}