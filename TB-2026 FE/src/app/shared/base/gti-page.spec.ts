import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, Subject } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { GTIPage, GTIPageEnterContext, trackByKey } from './gti-page';

class TestPage extends GTIPage {
  setupCalls = 0;
  loads: GTIPageEnterContext[] = [];
  teardownCalls = 0;
  events: string[] = [];

  constructor(injector: Injector) {
    super(injector);
  }

  protected override onSetup(): void { this.setupCalls++; this.events.push('setup'); }
  protected override onViewDidEnter(): void { this.events.push('didEnter'); }
  protected override onViewWillLeave(): void { this.events.push('willLeave'); }
  protected override onViewDidLeave(): void { this.events.push('didLeave'); }
  protected override loadData(ctx: GTIPageEnterContext): void { this.loads.push(ctx); this.events.push('load'); }
  protected override onTeardown(): void { this.teardownCalls++; }

  // Expose protected helpers for testing
  exposeUntilDestroyed<T>() { return this.untilDestroyed<T>(); }
  exposeUntilViewLeave<T>() { return this.untilViewLeave<T>(); }
  exposeOnce<T>() { return this.once<T>(); }
  exposeHandleError(err: unknown, msg?: string) { this.handleError(err, msg); }
}

describe('GTIPage', () => {
  let injector: Injector;
  let notification: jasmine.SpyObj<NotificationService>;

  beforeEach(() => {
    notification = jasmine.createSpyObj('NotificationService', ['error']);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: NotificationService, useValue: notification }]
    });
    injector = TestBed.inject(Injector);
  });

  describe('Ionic view lifecycle', () => {
    it('runs setup once, then loadData on every ionViewWillEnter', () => {
      const page = new TestPage(injector);
      page.ionViewWillEnter();
      page.ionViewWillLeave();
      page.ionViewWillEnter();

      expect(page.setupCalls).toBe(1);
      expect(page.loads).toEqual([{ isFirstEnter: true }, { isFirstEnter: false }]);
    });

    it('runs setup before the first loadData', () => {
      const page = new TestPage(injector);
      page.ionViewWillEnter();

      expect(page.events).toEqual(['setup', 'load']);
    });

    it('forwards each Ionic hook to its stub', () => {
      const page = new TestPage(injector);
      page.ionViewWillEnter();
      page.ionViewDidEnter();
      page.ionViewWillLeave();
      page.ionViewDidLeave();

      expect(page.events).toEqual(['setup', 'load', 'didEnter', 'willLeave', 'didLeave']);
    });

    it('does nothing until Ionic enters the view', () => {
      const page = new TestPage(injector);

      expect(page.setupCalls).toBe(0);
      expect(page.loads.length).toBe(0);
    });
  });

  describe('teardown helpers', () => {
    it('untilDestroyed completes on destroy', () => {
      const page = new TestPage(injector);
      let completed = false;
      new Subject<number>().pipe(page.exposeUntilDestroyed<number>())
        .subscribe({ complete: () => (completed = true) });

      page.ngOnDestroy();
      expect(completed).toBeTrue();
      expect(page.teardownCalls).toBe(1);
    });

    it('untilViewLeave completes on ionViewWillLeave', () => {
      const page = new TestPage(injector);
      let completed = false;
      new Subject<number>().pipe(page.exposeUntilViewLeave<number>())
        .subscribe({ complete: () => (completed = true) });

      page.ionViewWillLeave();
      expect(completed).toBeTrue();
    });

    it('once tears down on destroy even if the source never emits', () => {
      const page = new TestPage(injector);
      let completed = false;
      NEVER.pipe(page.exposeOnce()).subscribe({ complete: () => (completed = true) });

      page.ngOnDestroy();
      expect(completed).toBeTrue();
    });

    it('once takes a single emission', () => {
      const page = new TestPage(injector);
      const source = new Subject<number>();
      const values: number[] = [];
      source.pipe(page.exposeOnce<number>()).subscribe(v => values.push(v));

      source.next(1);
      source.next(2);
      expect(values).toEqual([1]);
    });
  });

  describe('handleError', () => {
    it('shows a toast only when a user message is supplied', () => {
      spyOn(console, 'error');
      const page = new TestPage(injector);

      page.exposeHandleError(new Error('boom'));
      expect(notification.error).not.toHaveBeenCalled();

      page.exposeHandleError(new Error('boom'), 'Something went wrong');
      expect(notification.error).toHaveBeenCalledWith('Something went wrong');
    });
  });

  describe('trackBy helpers', () => {
    it('trackByKey returns the keyed value', () => {
      const fn = trackByKey<{ accountId: string }>('accountId');
      expect(fn(0, { accountId: 'abc' })).toBe('abc');
    });

    it('trackById returns item.id', () => {
      const page = new TestPage(injector);
      expect(page.trackById(3, { id: 42 })).toBe(42);
      expect(page.trackByIndex(3)).toBe(3);
    });
  });
});
