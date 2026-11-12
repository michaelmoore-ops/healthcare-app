import { Component, OnInit } from '@angular/core';
import { ACCOUNT_IMPORTS } from '../../account.config';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CustomValidators } from '../../../shared/validator/pattern-validator';
import { AccountDetailViewModel, GroupedScrapedData } from '../../model';
import { TForm } from '../../../shared/models/reactive-form.model';
import { AccountApiService } from '../../services/account-api.service';
import { ReactiveFormService } from '../../../shared/services/reactive-form.service';
import { StateAccountService } from '../../../shared/services/state-account.service';
import { USER_ROLES } from '../../../core/constants/constants';
import { NotificationService } from '../../../core/services/notification.service';
import { SharepointConfigComponent } from '../sharepoint-config/sharepoint-config.component';
import groupBy from 'lodash/groupBy';
import { APP_ROUTES_PATH_CONST } from '../../../core/constants/app-routing-contants';
import { ProfileImageComponent } from "../../../shared/components/profile-image/profile-image.component";
import { filter } from 'rxjs';
import { CommonService } from '../../../shared/services/common.service';
import { AccountFacadeService } from '../../services/account-facade.service';

@Component({
  selector: 'app-account-details',
  imports: [ACCOUNT_IMPORTS, ...[SharepointConfigComponent], ProfileImageComponent],
  providers: [AccountFacadeService], // A new instance is created when AccountDetailsComponent mounts, destroyed when it unmounts.  No manual purging of previous data required now.
  templateUrl: './account-details.component.html',
  styleUrl: './account-details.component.scss'
})
export class AccountDetailsComponent implements OnInit {

  public accountId: string | null = '';
  public checks: any = [];
  public accountForm: any = {};
  public selectedChecks: any = [];
  public accountImgUrl: any = '';
  public accountDetails: any = {}
  public editAccount: boolean = false;
  public errorMsg: any = {}
  public defaultMsg: any = {}
  public userRole: any = ''
  public isExpanded = false;
  public accountScrappedData: GroupedScrapedData[] = [];
  public imageFormData: FormData = new FormData();
  public removeImagePayload: { type: string; userId: string; accountId: string | null; } | undefined;

  public accessoryTools: any[] = [];
  public selectedAccessoryTools: any[] = [];
  public accessoryToolsData: any[] = [];
  public accessoryToolsContent: any[] = [];
  public groupedLookupData: any[] = [];
  public selectedTab: string = '1';
  

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly accountApiService: AccountApiService,
    private readonly FB: FormBuilder,
    private readonly reactiveFormValidation: ReactiveFormService,
    private readonly stateService: StateAccountService,
    private readonly notificationService: NotificationService,
    private readonly commonService: CommonService
  ) {
    this.accountForm = this.generateForm();
  }

  ngOnInit() {
    // Initialise errorMsg + defaultMsg maps and the live-validation subscription.
    // MUST be called once before any form submission attempt to avoid crashes
    // inside validateForm() when defaultMsg[key] would otherwise be undefined.
    this.errorMsgFunction();

    this.route.paramMap.subscribe(params => {
      const routeAccountId = params.get('accountId');
      if (routeAccountId) {
        this.accountId = routeAccountId;
        // Always load account from route params regardless of role,
        // because userRole may not yet be set when navigating directly via URL.
        this.loadAccount(this.accountId);
      }
    });

    // Also subscribe to the state service so that when a non-superadmin selects
    // an account from the sidebar the role/accountId are synced correctly.
    this.stateService.selectedAccount$
      .pipe(filter((res: any) => !!res))
      .subscribe(res => this.handleAccountStateChange(res));
  }

  private handleAccountStateChange(res: any): void {
    this.userRole = res.role;
    this.accountId = res.accountId;

    if (this.userRole === USER_ROLES.USER) {
      this.router.navigate([APP_ROUTES_PATH_CONST.DASHBOARD]);
      return;
    }

    if (this.getBaseUrl() === '/accountDetails' && !!res.accountId) {
      this.router.navigate(['/accountDetails', res.accountId]);
    }

    if (this.accountId) {
      this.loadAccount(this.accountId);
    }
  }
  
  
  private loadAccount(accountId: string) {
    this.imageFormData.set('AccountId', accountId);
    this.imageFormData.set('Type', 'account-logos'); // use set() not append() to avoid duplicates on re-navigation
    this.removeImagePayload = {
      type: 'account-logos',
      userId: '',
      accountId
    };
    this.getAccountDetails();
    if (this.isSuperAdmin) {
      this.getLookUp();
    }
  }

  public copyEmail() {
    navigator.clipboard.writeText(this.accountDetails.accountEmail).then(() => {
      this.notificationService.success('Email copied to clipboard');
    }).catch(err => {
      console.error('Could not copy email: ', err);
    });
  }

  public getChecked(key: any, type: 'check' | 'accessory' = 'check') {
    const selected = type === 'check' ? this.selectedChecks : this.selectedAccessoryTools;
    return selected.includes(key);
  }

  private markFormArrayDirty(formArray: FormArray) {
    formArray.markAsDirty();

    formArray.controls.forEach(control => {
      control.markAsDirty();

      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormArrayDirty(control as FormArray);
      }
    });
  }

  public updateAccountInfo() {
    if (!this.accountForm.valid) {
      this.reactiveFormValidation.markDirty(this.accountForm);
      this.reactiveFormValidation.validateForm(this.accountForm, this.errorMsg, this.defaultMsg, true);
      return;
    }
    const payload = this.accountForm.value;

    this.accountApiService.updateAccountInfo(payload, this.accountId)
      .subscribe((res: any) => {
        if (res?.success) {
          this.editAccount = false;
          this.getAccountDetails(); // re-fetch fresh data; res.data is bool not an account object
        }
      });
  }

  public onSelect(tab: any) {
    this.selectedTab = tab;
  }

  private generateForm() {
    const namePattern = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,4}$/;

    return this.FB.group({
      accountName: ['', [Validators.required, CustomValidators.patternValidator(namePattern, 'invalidName')]],
      accountEmail: ['', [Validators.required, CustomValidators.patternValidator(emailPattern, 'invalidEmail')]],
      address1: [''],
      address2: [''],
      city: ['', [CustomValidators.patternValidator(namePattern, 'invalidName')]],
      state: ['', [CustomValidators.patternValidator(namePattern, 'invalidName')]],
      zipCode: ['', CustomValidators.patternValidator(/^\d*$/, 'invalidName')],
      accountId: [''],
      isActive: [''],
      lookUpIds: this.FB.array([]),
      accessoryToolsId: this.FB.array([])
    }) as TForm<AccountDetailViewModel>;
  }

  private patchFormValue(value: any) {
    this.accountForm.patchValue({
      accountName: value.accountName,
      accountEmail: value.accountEmail,
      address1: value.address1,
      address2: value.address2,
      city: value.city,
      state: value.state,
      zipCode: value.zipCode,
      accountId: value.accountId,
      isActive: value.isActive
    });
  }

  private getAccountDetails() {
    // Clear stale data immediately so the view never shows details from a previous account
    this.accountDetails = {};
    this.accountImgUrl = '';

    this.accountApiService.getAccountById(this.accountId)
      .subscribe((res: any) => {
        this.patchFormValue(res);
        this.accountDetails = res;
        this.accountImgUrl = res.accountLogoUrl;

        const allAccountItems = res.accountChecks || [];

        const accountChecksItems = allAccountItems.filter((e: any) => e.type === 'Checks');
        this.selectedChecks = accountChecksItems
          .filter((e: any) => !e.isDeleted)
          .map((e: any) => e.id);

        if (!this.isSuperAdmin)
          this.checks = accountChecksItems;

        const accessoryToolsItems = allAccountItems.filter((e: any) => e.type === 'AccessoryTools');
        this.selectedAccessoryTools = accessoryToolsItems
          .filter((e: any) => !e.isDeleted)
          .map((e: any) => e.id);

        const accessoryToolsIds = this.accountForm.get('accessoryToolsId') as FormArray;
        accessoryToolsIds.clear();
        this.selectedAccessoryTools.forEach((id: number) => accessoryToolsIds.push(this.FB.control(id)));
        accessoryToolsIds.updateValueAndValidity();

        if (accessoryToolsItems.length) {
          this.accessoryToolsContent = accessoryToolsItems;
          this.isAdmin && this.getLookUp();
        }
    });
  }

  private getLookUp() {
    this.accountApiService.getLookup()
    .subscribe({
      next: (res: any) => {
        let allData = res.data;
        
        const dataToGroup = this.isAdmin && this.accountDetails?.accountChecks?.length
          ? this.accountDetails.accountChecks 
          : allData;
        
        this.groupedLookupData = this.commonService.groupDataByMasterKey(dataToGroup);
        
        this.checks = allData.filter((item: any) => item.type === 'Checks');
        const accessory = allData.filter((item: any) => item.type === 'AccessoryTools');
        if (accessory.length) {
          this.accessoryTools = accessory;
        }
      }
    });
  }

  private errorMsgFunction() {
    this.errorMsg = {
      accountName: '',
      accountEmail: '',
      city: '',
      state: '',
      userEmail: '',
      userFirstName: '',
      userLastName: '',
      checksId: '',
      zipCode: '',
      accessoryToolsId: '',
      lookUpIds: ''
    };

    this.defaultMsg = {
      accountName: { required: 'Account name is required.', invalidName: 'Only letters are allowed. Numbers, and special characters are not permitted.' },
      accountEmail: { required: 'Account email is required.', invalidEmail: 'Please enter a valid email address.' },
      city: {  invalidName: 'Only letters are allowed. Numbers, and special characters are not permitted.' },
      state: {  invalidName: 'Only letters are allowed. Numbers, and special characters are not permitted.' },
      userEmail: { required: 'User email is required.', invalidEmail: 'Please enter a valid email address' },
      userFirstName: { required: 'User first name is required.', invalidName: 'Only letters are allowed. Numbers, and special characters are not permitted.' },
      userLastName: { required: 'User last name is required.', invalidName: 'Only letters are allowed. Numbers, and special characters are not permitted.' },
      checksId: { required: 'Select at least one check' },
      accessoryToolsId: { },
      lookUpIds: { required: 'Select at least one check' },
      zipCode: { invalidName: 'Only numeric values are allowed' }
    };

    this.accountForm.valueChanges.subscribe(() => this.reactiveFormValidation.validateForm(this.accountForm, this.errorMsg, this.defaultMsg));
  }

  get getFormattedAddress(): string[] {
    const { address1, address2, city, state } = this.accountDetails || {};
    const lines: string[] = [];

    if (address1) lines.push(address1);
    if (address2) lines.push(address2);

    const cityState = [city, state].filter(Boolean).join(', ');
    if (cityState) lines.push(cityState);

    return lines;
  }

  public getScrapperConfig() {
    this.accountApiService.getScrappingConfig({ accountId: this.accountId }).subscribe((res: any) => {
      const groupedData = groupBy(res.data, 'atsName');
      this.accountScrappedData = Object.entries(groupedData).map(([key, records]) => ({
        key,
        records,
        isExpanded: false
      }));
    });
  }

  public toggleAccordion(record: any): void {
    record.isExpanded = !record.isExpanded;
  }

  private getBaseUrl() {
    const fullPath = this.router.url.split('?')[0].split('#')[0];
    const segments = fullPath.split('/').filter(Boolean);
    const baseSegments = segments.filter(seg => isNaN(+seg));
    return '/' + baseSegments.join('/');
  }

  get isSuperAdmin() {
    return this.userRole == USER_ROLES.SUPER_ADMIN;
  }

  get isAdmin(): boolean {
    return this.userRole === USER_ROLES.ADMIN;
  }

  public backToAccountGrid() {
    this.router.navigate(['/' + APP_ROUTES_PATH_CONST.ACCOUNT_GRID]);
  }

  public  onAccessoryToolChange(event: any, toolId: any) {
      const accessoryTools = this.accountForm.get('accessoryToolsId') as FormArray;
      if (event.target.checked) {
        accessoryTools.push(this.FB.control(toolId));
        this.selectedAccessoryTools.push(toolId);
      } else {
        const index = accessoryTools.controls.findIndex(x => x.value === toolId);
        if (index >= 0) {
          accessoryTools.removeAt(index);
        }
        this.selectedAccessoryTools = this.selectedAccessoryTools.filter(id => id !== toolId);
      }
    }
  
}
