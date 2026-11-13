// src/app/shared/base/gti-page.ts

import { Directive, Injector, OnDestroy } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, NavigationExtras, Router } from '@angular/router';
import { MonoTypeOperatorFunction, Observable, Subject, merge } from 'rxjs';
import { distinctUntilChanged, map, take, takeUntil } from 'rxjs/operators';
import type { ViewDidEnter, ViewDidLeave, ViewWillEnter, ViewWillLeave } from '@ionic/angular/standalone';
import { NotificationService } from '../../core/services/notification.service';

/** Context passed to {@link GTIPage.loadData} on each ionViewWillEnter. */
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
 * Shared base class for pages rendered inside <ion-router-outlet>. It
 * standardizes these coding standards:
 *
 *  1. Lifecycle: pages are driven by Ionic's view hooks, not ngOnInit.
 *     {@link onSetup} runs once, on the first ionViewWillEnter.
 *     {@link loadData} runs on every ionViewWillEnter, including re-entry
 *     to a page Ionic has cached.
 *  2. Teardown: {@link untilDestroyed}, {@link untilViewLeave} and {@link once}
 *     replace manual subscription management (takeUntil pattern, Angular 13 safe).
 *  3. trackBy: {@link trackById} and {@link trackByIndex} are available in every template.
 *  4. Navigation and error helpers keep routing and toast boilerplate out of pages.
 *
 * Keep pages thin. API calls, business rules and native integrations belong in
 * injectable services or facades. The base class deliberately has no data access.
 *
 * Ionic hooks fire only for components routed through <ion-router-outlet>.
 * Ionic has no destroy hook, so final teardown still uses Angular's ngOnDestroy.
 *
 * Angular 13 compatibility: dependencies come from an Injector passed to super()
 * instead of `inject()`, because field-level `inject()` requires Angular 14+.
 * On Ionic 6 / Angular 13, import the hook interfaces from '@ionic/angular'.
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
export abstract class GTIPage
  implements ViewWillEnter, ViewDidEnter, ViewWillLeave, ViewDidLeave, OnDestroy {

  // ── Teardown signals ──────────────────────────────────────────────────────
  /** Emits once and completes when the component is destroyed. */
  protected readonly destroy$ = new Subject<void>();
  /** Emits whenever the user leaves the view (ionViewWillLeave, or destroy). */
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
  //  Ionic view lifecycle. To add behavior, implement the stubs below.
  //  If you must override one of these, use `override` and call super.
  // ══════════════════════════════════════════════════════════════════════════

  /** Before the view animates in. Fires on first entry and on every re-entry. */
  ionViewWillEnter(): void {
    const isFirstEnter = !this.hasEntered;
    this.hasEntered = true;
    if (isFirstEnter) {
      this.onSetup();
    }
    this.loadData({ isFirstEnter });
  }

  /** After the view has finished animating in. */
  ionViewDidEnter(): void {
    this.onViewDidEnter();
  }

  /** Before the view animates out. The page may stay cached afterwards. */
  ionViewWillLeave(): void {
    this.viewLeave$.next();
    this.onViewWillLeave();
  }

  /** After the view has finished animating out. */
  ionViewDidLeave(): void {
    this.onViewDidLeave();
  }

  /** Ionic has no destroy hook, so final teardown stays on Angular's. */
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

  /**
   * One-time setup that does NOT need to refresh on re-entry (forms, static
   * config, long-lived stream wiring). Runs on the first ionViewWillEnter,
   * just before the first {@link loadData}.
   */
  protected onSetup(): void {}

  /**
   * Fetch or refresh the page's data. Runs on every ionViewWillEnter.
   * Bind subscriptions with {@link untilViewLeave} so re-entry doesn't stack them.
   */
  protected loadData(_context: GTIPageEnterContext): void {}

  /** After the view is visible (focus fields, start animations, analytics). */
  protected onViewDidEnter(): void {}

  /** Before the view is hidden (pause media, save drafts). */
  protected onViewWillLeave(): void {}

  /** After the view is hidden (release heavy resources while cached). */
  protected onViewDidLeave(): void {}

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
    return extras ? this.router.navigate(commands, extras) : this.router.navigate(commands);
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
}
