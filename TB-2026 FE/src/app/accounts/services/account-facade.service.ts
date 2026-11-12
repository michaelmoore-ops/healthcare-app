// src/app/accounts/services/account-facade.service.ts

import { Injectable, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  switchMap,
  takeUntil,
  tap
} from 'rxjs/operators';
import { AccountApiService } from './account-api.service';
import { StateAccountService } from '../../shared/services/state-account.service';
import { CommonService } from '../../shared/services/common.service';
import { NotificationService } from '../../core/services/notification.service';
import { USER_ROLES } from '../../core/constants/constants';
import { APP_ROUTES_PATH_CONST } from '../../core/constants/app-routing-contants';
import { AccountDetailViewModel, GroupedScrapedData, Lookup } from '../model';
import groupBy from 'lodash/groupBy';

@Injectable() // NO providedIn — scoped via providers[] on AccountDetailsComponent
export class AccountFacadeService implements OnDestroy {

  // ── Teardown ──────────────────────────────────────────────────────────────
  private readonly destroy$ = new Subject<void>();

  // ── Single account-id channel (fixes the dual-channel async bug) ──────────
  private readonly accountId$ = new BehaviorSubject<string | null>(null);

  // ── State subjects ────────────────────────────────────────────────────────
  private readonly _account$             = new BehaviorSubject<AccountDetailViewModel | null>(null);
  private readonly _loading$             = new BehaviorSubject<boolean>(false);
  private readonly _userRole$            = new BehaviorSubject<string>('');
  private readonly _accountImgUrl$       = new BehaviorSubject<string>('');
  private readonly _checks$              = new BehaviorSubject<Lookup[]>([]);
  private readonly _accessoryTools$      = new BehaviorSubject<Lookup[]>([]);
  private readonly _groupedLookupData$   = new BehaviorSubject<any[]>([]);
  private readonly _selectedChecks$      = new BehaviorSubject<number[]>([]);
  private readonly _selectedAccessoryTools$ = new BehaviorSubject<number[]>([]);
  private readonly _accountScrappedData$ = new BehaviorSubject<GroupedScrapedData[]>([]);

  // ── Public observables ────────────────────────────────────────────────────
  readonly account$              = this._account$.asObservable();
  readonly loading$              = this._loading$.asObservable();
  readonly userRole$             = this._userRole$.asObservable();
  readonly accountImgUrl$        = this._accountImgUrl$.asObservable();
  readonly checks$               = this._checks$.asObservable();
  readonly accessoryTools$       = this._accessoryTools$.asObservable();
  readonly groupedLookupData$    = this._groupedLookupData$.asObservable();
  readonly selectedChecks$       = this._selectedChecks$.asObservable();
  readonly selectedAccessoryTools$ = this._selectedAccessoryTools$.asObservable();
  readonly accountScrappedData$  = this._accountScrappedData$.asObservable();

  // ── Synchronous helpers (role checks don't need async) ────────────────────
  get isSuperAdmin(): boolean { return this._userRole$.value === USER_ROLES.SUPER_ADMIN; }
  get isAdmin(): boolean      { return this._userRole$.value === USER_ROLES.ADMIN; }
  get currentAccountId(): string | null { return this.accountId$.value; }

  get imageFormData(): FormData {
    const fd = new FormData();
    fd.set('AccountId', this.accountId$.value ?? '');
    fd.set('Type', 'account-logos');
    return fd;
  }

  get removeImagePayload() {
    return { type: 'account-logos', userId: '', accountId: this.accountId$.value };
  }

  constructor(
    private readonly route:               ActivatedRoute,
    private readonly router:              Router,
    private readonly accountApiService:   AccountApiService,
    private readonly stateService:        StateAccountService,
    private readonly commonService:       CommonService,
    private readonly notificationService: NotificationService,
  ) {}

  // ── Bootstrap (called once from AccountDetailsComponent.ngOnInit) ─────────
  initialize(): void {
    this._wireRouteParams();
    this._wireStateService();
    this._wireAccountLoad();
  }

  // ── Channel 1: URL route params ───────────────────────────────────────────
  private _wireRouteParams(): void {
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const id = params.get('accountId');
        if (id) this.accountId$.next(id);
      });
  }

  // ── Channel 2: State service (sidebar account selection) ─────────────────
  private _wireStateService(): void {
    this.stateService.selectedAccount$
      .pipe(
        filter(res => !!res),
        takeUntil(this.destroy$)
      )
      .subscribe(res => {
        const role = (res as any).role;
        this._userRole$.next(role);

        if (role === USER_ROLES.USER) {
          this.router.navigate([APP_ROUTES_PATH_CONST.DASHBOARD]);
          return;
        }

        const id = (res as any).accountId;
        if (id) this.accountId$.next(id);  // feeds the single channel below
      });
  }

  // ── Unified load: fires once per DISTINCT accountId ──────────────────────
  private _wireAccountLoad(): void {
    this.accountId$.pipe(
      filter((id): id is string => !!id),
      distinctUntilChanged(),             // ← prevents duplicate loads from both channels
      tap(() => this._loading$.next(true)),
      switchMap(id => this.accountApiService.getAccountById(id)), // ← cancels in-flight on new id
      takeUntil(this.destroy$)
    ).subscribe({
      next: (res: any) => {
        this._account$.next(res as AccountDetailViewModel);
        this._accountImgUrl$.next(res.accountLogoUrl ?? '');
        this._processAccountChecks(res);
        this._loading$.next(false);
        if (this.isSuperAdmin || this.isAdmin) this.loadLookup();
      },
      error: () => this._loading$.next(false)
    });
  }

  // ── API actions (called by child components) ──────────────────────────────
  updateAccountInfo(payload: any): Observable<any> {
    return this.accountApiService.updateAccountInfo(payload, this.currentAccountId);
  }

  updateAccountChecks(payload: any): Observable<any> {
    return this.accountApiService.updateAccountChecks(payload, this.currentAccountId);
  }

  loadLookup(): void {
    this.accountApiService.getLookup()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const allData: Lookup[] = res.data;
          const account = this._account$.value as any;

          const dataToGroup = this.isAdmin && account?.accountChecks?.length
            ? account.accountChecks
            : allData;

          this._groupedLookupData$.next(this.commonService.groupDataByMasterKey(dataToGroup));
          this._checks$.next(allData.filter((item: any) => item.type === 'Checks'));
          const accessory = allData.filter((item: any) => item.type === 'AccessoryTools');
          if (accessory.length) this._accessoryTools$.next(accessory);
        }
      });
  }

  loadScrappingConfig(): void {
    const accountId = this.currentAccountId;
    if (!accountId) return;
    this.accountApiService.getScrappingConfig({ accountId })
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        const grouped = groupBy(res.data, 'atsName');
        this._accountScrappedData$.next(
          Object.entries(grouped).map(([key, records]) => ({ key, records: records as any[], isExpanded: false }))
        );
      });
  }

  // ── Internal helpers ──────────────────────────────────────────────────────
  private _processAccountChecks(res: any): void {
    const all: any[] = res.accountChecks || [];

    const checksItems = all.filter(e => e.type === 'Checks');
    this._selectedChecks$.next(checksItems.filter(e => !e.isDeleted).map(e => e.id));
    if (!this.isSuperAdmin) this._checks$.next(checksItems);

    const accessoryItems = all.filter(e => e.type === 'AccessoryTools');
    this._selectedAccessoryTools$.next(accessoryItems.filter(e => !e.isDeleted).map(e => e.id));
    if (accessoryItems.length && this.isAdmin) this.loadLookup();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}