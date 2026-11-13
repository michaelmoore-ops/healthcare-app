import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountComplianceComponent } from './account-compliance.component';

describe('AccountComplianceComponent', () => {
  let component: AccountComplianceComponent;
  let fixture: ComponentFixture<AccountComplianceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountComplianceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountComplianceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
