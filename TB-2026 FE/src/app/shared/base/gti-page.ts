// src/app/shared/base/gti-page.ts

import { Directive, Injector, OnDestroy, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, NavigationExtras, Router } from '@angular/router';
import { MonoTypeOperatorFunction, Observable, Subject, merge } from 'rxjs';
import { distinctUntilChanged, map, take, takeUntil } from 'rxjs/operators';
import { NotificationService } from '../../core/services/notification.service';

/**
 * How the page receives "view enter" events.
 *  - 'angular': plain Angular routing. Every navigation to the page creates a
 *               new instance, so data loads from ngOnInit.
 *  - 'ionic':   an Ionic <ion-router-outlet> caches pages. ngOnInit runs only
 *               once, so data loads from ionViewWillEnter on every visit.
 */
export type GTIPageLifecycleMode = 'angular' | 'ionic';

/** Context passed to {@link GTIPage.loadData} on each view entry. */
export interface GTIPageEnterContext {
  /** True only on the first entry for this page instance. */
  readonly isFirstEnter: boolean;
}

/**
 * Builds a trackBy function that identifies items by one property.
 * Coding standard: every *ngFor needs a trackBy, and every @for needs a `track` expression.
 *
 * @example
 *   readonly trackByAccountId = trackByKey<Account>('accountId');
 *   <tr *ngFor="let a of accounts; trackBy: trackByAccountId">
 */
export function trackByKey<T, K extends keyof T = keyof T>(key: K): (index: number, item: T) => T[K] {
  return (_index: number, item: T): T[K] => item[key];
}

/** Last-resort trackBy for lists whose items have no stable identity. */
export function trackByIndex(index: number): number {
  return index;
}

/**
 * Shared base class for routed pages. It standardizes these coding standards:
 *
 *  1. Lifecycle: one-time setup goes in {@link onSetup}. Data fetching goes in
 *     {@link loadData}, which runs on every view entry (ionViewWillEnter for
 *     Ionic, ngOnInit for plain Angular).
 *  2. Teardown: {@link untilDestroyed}, {@link untilViewLeave} and {@link once}
 *     replace manual subscription management (takeUntil pattern, Angular 13 safe).
 *  3. trackBy: {@link trackById} and {@link trackByIndex} are available in every template.
 *  4. Navigation and error helpers keep routing and toast boilerplate out of pages.
 *
 * Keep pages thin. API calls, business rules and native integrations belong in
 * injectable services or facades. The base class deliberately has no data access.
 *
 * Angular 13 compatibility: dependencies come from an Injector passed to super()
 * instead of `inject()`, because field-level `inject()` requires Angular 14+.
 *
 * @example
 *   @Component({ ... })
 *   export class MyPage extends GTIPage {
 *     constructor(injector: Injector, private readonly facade: MyFacade) {
 *       super(injector);
 *     }
 *
 *     protected override loadData(): void {
 *       this.facade.load(this.routeParam('id'))
 *         .pipe(this.untilViewLeave())
 *         .subscribe({ error: err => this.handleError(err, 'Could not load record.') });
 *     }
 *   }
 */
@Directive()
export abstract class GTIPage implements OnInit, OnDestroy {

  // ── Configuration (subclasses may override) ───────────────────────────────
  /** Set to 'ionic' in pages rendered inside <ion-router-outlet>. */
  protected readonly lifecycleMode: GTIPageLifecycleMode = 'angular';

  // ── Teardown signals ──────────────────────────────────────────────────────
  /** Emits once and completes when the component is destroyed. */
  protected readonly destroy$ = new Subject<void>();
  /** Emits whenever the user leaves the view (Ionic leave, or destroy). */
  protected readonly viewLeave$ = new Subject<void>();

  // ── Shared trackBy helpers (usable directly in templates) ─────────────────
  readonly trackById = trackByKey<{ id: unknown }>('id');
  readonly trackByIndex = trackByIndex;

  private hasEntered = false;

  protected constructor(protected readonly injector: Injector) {}

  // ── Lazily resolved dependencies (nothing is resolved unless used) ────────
  protected get router(): Router { return this.injector.get(Router); }
  protected get route(): ActivatedRoute { return this.injector.get(ActivatedRoute); }
  protected get location(): Location { return this.injector.get(Location); }
  protected get notification(): NotificationService { return this.injector.get(NotificationService); }

  // ══════════════════════════════════════════════════════════════════════════
  //  Framework lifecycle hooks. To add behavior, implement the stubs below.
  //  If you must override one of these, use `override` and call super.
  // ══════════════════════════════════════════════════════════════════════════

  ngOnInit(): void {
    this.onSetup();
    if (this.lifecycleMode === 'angular') {
      this.enterView();
    }
  }

  /** Ionic calls this on every visit, including re-entry to a cached page. */
  ionViewWillEnter(): void {
    if (this.lifecycleMode === 'ionic') {
      this.enterView();
    }
  }

  /** Ionic calls this after the enter transition finishes. */
  ionViewDidEnter(): void {
    this.onViewDidEnter();
  }

  /** Ionic calls this before the page is hidden. The page stays cached. */
  ionViewWillLeave(): void {
    this.viewLeave$.next();
    this.onViewWillLeave();
  }

  ngOnDestroy(): void {
    this.viewLeave$.next();
    this.viewLeave$.complete();
    this.destroy$.next();
    this.destroy$.complete();
    this.onTeardown();
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Stubs for subclasses to override (all optional, all no-op by default)
  // ══════════════════════════════════════════════════════════════════════════

  /** One-time setup that does NOT need to refresh on re-entry (forms, static config). */
  protected onSetup(): void {}

  /**
   * Fetch or refresh the page's data. Runs on every view entry.
   * Bind subscriptions with {@link untilViewLeave} so re-entry doesn't stack them.
   */
  protected loadData(_context: GTIPageEnterContext): void {}

  /** After the view is visible (focus fields, start animations, analytics). */
  protected onViewDidEnter(): void {}

  /** Before the view is hidden (pause media, save drafts). */
  protected onViewWillLeave(): void {}

  /** Final cleanup of resources not handled by destroy$ (timers, 3rd-party widgets). */
  protected onTeardown(): void {}

  // ══════════════════════════════════════════════════════════════════════════
  //  RxJS teardown helpers
  // ══════════════════════════════════════════════════════════════════════════

  /** Keeps a subscription alive for the life of the component. */
  protected untilDestroyed<T>(): MonoTypeOperatorFunction<T> {
    return takeUntil<T>(this.destroy$);
  }

  /**
   * Keeps a subscription alive only while the view is shown. Use this for
   * subscriptions created in {@link loadData} so cached Ionic pages don't
   * add another subscription on every re-entry.
   */
  protected untilViewLeave<T>(): MonoTypeOperatorFunction<T> {
    return takeUntil<T>(merge(this.viewLeave$, this.destroy$));
  }

  /**
   * Takes one emission, and also tears down on destroy if the source never emits.
   * take(1) alone leaves the subscription open in that case.
   */
  protected once<T>(): MonoTypeOperatorFunction<T> {
    return (source: Observable<T>) => source.pipe(take(1), takeUntil(this.destroy$));
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Route & navigation helpers
  // ══════════════════════════════════════════════════════════════════════════

  /** Snapshot value of a route param, or null if it is absent. */
  protected routeParam(name: string): string | null {
    return this.route.snapshot.paramMap.get(name);
  }

  /** Stream of a route param that only emits when the value changes. Pair with switchMap. */
  protected routeParam$(name: string): Observable<string | null> {
    return this.route.paramMap.pipe(
      map(params => params.get(name)),
      distinctUntilChanged()
    );
  }

  /** Snapshot value of a query param, or null if it is absent. */
  protected queryParam(name: string): string | null {
    return this.route.snapshot.queryParamMap.get(name);
  }

  protected navigateTo(commands: unknown[], extras?: NavigationExtras): Promise<boolean> {
    return this.router.navigate(commands, extras);
  }

  /**
   * Goes back in browser history when there is in-app history. Otherwise
   * (deep link or refresh) it navigates to the fallback route.
   */
  protected goBack(fallbackCommands: unknown[]): Promise<boolean> {
    const navigationId = (this.location.getState() as { navigationId?: number } | null)?.navigationId ?? 1;
    if (navigationId > 1) {
      this.location.back();
      return Promise.resolve(true);
    }
    return this.router.navigate(fallbackCommands);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Error handling
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Default page-level error handler. It logs the error and, when a message is
   * provided, shows it in a toast. Override to customize per page.
   */
  protected handleError(error: unknown, userMessage?: string): void {
    console.error(`[${this.constructor.name}]`, error);
    if (userMessage) {
      this.notification.error(userMessage);
    }
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private enterView(): void {
    const isFirstEnter = !this.hasEntered;
    this.hasEntered = true;
    this.loadData({ isFirstEnter });
  }
}
