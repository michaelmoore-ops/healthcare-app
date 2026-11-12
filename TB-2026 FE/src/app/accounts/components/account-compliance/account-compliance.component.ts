
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { SharepointConfigComponent } from '../sharepoint-config/sharepoint-config.component';
import { AccountFacadeService } from '../../services/account-facade.service';
import { AccountDetailViewModel, GroupedScrapedData, Lookup } from '../../model';

@Component({
  selector: 'app-account-compliance',
  standalone: true,
  imports: [CommonModule, TabsModule, SharepointConfigComponent],
  templateUrl: './account-compliance.component.html',
})
export class AccountComplianceComponent implements OnInit {

  @Input() account: AccountDetailViewModel | null = null;
  @Input() checks: Lookup[] = [];
  @Input() accessoryTools: Lookup[] = [];
  @Input() groupedLookupData: any[] = [];
  @Input() selectedChecks: number[] = [];
  @Input() selectedAccessoryTools: number[] = [];
  @Input() accountScrappedData: GroupedScrapedData[] = [];
  @Input() isSuperAdmin = false;
  @Input() isAdmin = false;

  selectedTab = '1';

  constructor(private readonly facade: AccountFacadeService) {}

  ngOnInit(): void {
    this.facade.loadScrappingConfig();
  }

  onSelect(tab: string): void {
    this.selectedTab = tab;
  }

  getChecked(key: number, type: 'check' | 'accessory' = 'check'): boolean {
    const list = type === 'check' ? this.selectedChecks : this.selectedAccessoryTools;
    return list.includes(key);
  }

  toggleAccordion(record: GroupedScrapedData): void {
    record.isExpanded = !record.isExpanded;
  }
}