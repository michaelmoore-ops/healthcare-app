import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ProfileImageComponent } from '../../../shared/components/profile-image/profile-image.component';
import { ReactiveFormService } from '../../../shared/services/reactive-form.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CustomValidators } from '../../../shared/validator/pattern-validator';
import { AccountFacadeService } from '../../services/account-facade.service';
import { AccountDetailViewModel } from '../../model';
import { TForm } from '../../../shared/models/reactive-form.model';

@Component({
  selector: 'app-account-info-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ProfileImageComponent],
  templateUrl: './account-info-form.component.html',
})
export class AccountInfoFormComponent implements OnChanges {

  @Input() account: AccountDetailViewModel | null = null;
  @Input() accountImgUrl: string = '';
  @Output() back = new EventEmitter<void>();

  editAccount = false;
  accountForm: TForm<AccountDetailViewModel>;
  errorMsg: any = {};
  defaultMsg: any = {};

  constructor(
    private readonly FB: FormBuilder,
    private readonly reactiveFormValidation: ReactiveFormService,
    private readonly notificationService: NotificationService,
    readonly facade: AccountFacadeService
  ) {
    this.accountForm = this.buildForm();
    this.initValidationMessages();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['account'] && this.account) {
      this.patchForm(this.account);
    }
  }

  get getFormattedAddress(): string[] {
    const { address1, address2, city, state } = this.account || {};
    const lines: string[] = [];
    if (address1) lines.push(address1);
    if (address2) lines.push(address2);
    const cityState = [city, state].filter(Boolean).join(', ');
    if (cityState) lines.push(cityState);
    return lines;
  }

  copyEmail(): void {
    navigator.clipboard
      .writeText(this.account?.accountEmail ?? '')
      .then(() => this.notificationService.success('Email copied to clipboard'))
      .catch(err => console.error('Could not copy email:', err));
  }

  updateAccountInfo(): void {
    if (!this.accountForm.valid) {
      this.reactiveFormValidation.markDirty(this.accountForm);
      this.reactiveFormValidation.validateForm(this.accountForm, this.errorMsg, this.defaultMsg, true);
      return;
    }
    this.facade.updateAccountInfo(this.accountForm.value).subscribe({
      next: () => {
        this.editAccount = false;
        this.notificationService.success('Account updated successfully');
      }
    });
  }

  private buildForm(): TForm<AccountDetailViewModel> {
    const namePattern  = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,4}$/;

    return this.FB.group({
      accountName:  ['', [Validators.required, CustomValidators.patternValidator(namePattern, 'invalidName')]],
      accountEmail: ['', [Validators.required, CustomValidators.patternValidator(emailPattern, 'invalidEmail')]],
      address1:     [''],
      address2:     [''],
      city:         ['', [CustomValidators.patternValidator(namePattern, 'invalidName')]],
      state:        ['', [CustomValidators.patternValidator(namePattern, 'invalidName')]],
      zipCode:      ['', CustomValidators.patternValidator(/^\d*$/, 'invalidName')],
    }) as TForm<AccountDetailViewModel>;
  }

  private patchForm(value: AccountDetailViewModel): void {
    this.accountForm.patchValue({
      accountName:  value.accountName,
      accountEmail: value.accountEmail,
      address1:     value.address1,
      address2:     value.address2,
      city:         value.city,
      state:        value.state,
      zipCode:      value.zipCode,
    });
  }

  private initValidationMessages(): void {
    this.errorMsg = {
      accountName: '', accountEmail: '', city: '', state: '', zipCode: ''
    };
    this.defaultMsg = {
      accountName:  { required: 'Account name is required.', invalidName: 'Only letters are allowed. Numbers and special characters are not permitted.' },
      accountEmail: { required: 'Account email is required.', invalidEmail: 'Please enter a valid email address.' },
      city:         { invalidName: 'Only letters are allowed. Numbers and special characters are not permitted.' },
      state:        { invalidName: 'Only letters are allowed. Numbers and special characters are not permitted.' },
      zipCode:      { invalidName: 'Only numeric values are allowed' },
    };
    this.accountForm.valueChanges.subscribe(() =>
      this.reactiveFormValidation.validateForm(this.accountForm, this.errorMsg, this.defaultMsg)
    );
  }
}