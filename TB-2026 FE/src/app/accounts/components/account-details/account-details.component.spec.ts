import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { AccountDetailsComponent } from './account-details.component';
import { AccountFacadeService } from '../../services/account-facade.service';
import { APP_ROUTES_PATH_CONST } from '../../../core/constants/app-routing-contants';

describe('AccountDetailsComponent', () => {
  let component: AccountDetailsComponent;
  let fixture: ComponentFixture<AccountDetailsComponent>;
  let facadeSpy: jasmine.SpyObj<AccountFacadeService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    facadeSpy = jasmine.createSpyObj<AccountFacadeService>('AccountFacadeService', ['initialize', 'refresh']);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [AccountDetailsComponent],
      providers: [{ provide: Router, useValue: routerSpy }]
    })
      // AccountFacadeService is provided at the component level, so it must be
      // replaced via overrideComponent rather than the TestBed module providers.
      // Child components and the template are stubbed out to isolate this component.
      .overrideComponent(AccountDetailsComponent, {
        set: {
          imports: [CommonModule],
          providers: [{ provide: AccountFacadeService, useValue: facadeSpy }],
          template: ''
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(AccountDetailsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should expose the component-scoped facade', () => {
    expect(component.facade).toBe(facadeSpy);
  });

  describe('Ionic view lifecycle', () => {
    it('should not touch the facade on creation (no Angular init hook)', () => {
      fixture.detectChanges();

      expect(facadeSpy.initialize).not.toHaveBeenCalled();
      expect(facadeSpy.refresh).not.toHaveBeenCalled();
    });

    it('should initialize the facade on first ionViewWillEnter without refreshing', () => {
      component.ionViewWillEnter();

      expect(facadeSpy.initialize).toHaveBeenCalledTimes(1);
      expect(facadeSpy.refresh).not.toHaveBeenCalled();
    });

    it('should refresh, not re-initialize, when a cached page is re-entered', () => {
      component.ionViewWillEnter();
      component.ionViewWillLeave();
      component.ionViewDidLeave();
      component.ionViewWillEnter();

      expect(facadeSpy.initialize).toHaveBeenCalledTimes(1);
      expect(facadeSpy.refresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('backToAccountGrid', () => {
    it('should navigate to the account grid route', () => {
      component.backToAccountGrid();

      expect(routerSpy.navigate).toHaveBeenCalledOnceWith(['/' + APP_ROUTES_PATH_CONST.ACCOUNT_GRID]);
    });

    it('should navigate to the absolute "/accountGrid" path', () => {
      component.backToAccountGrid();

      const [commands] = routerSpy.navigate.calls.mostRecent().args;
      expect(commands).toEqual(['/accountGrid']);
    });
  });
});
