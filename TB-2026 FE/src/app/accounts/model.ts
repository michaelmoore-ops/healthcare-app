export interface Lookup {
    id: number;
    type: string;
    key: string;
    value: string;
    description: string;
    sortOrder: number;
    url: string;
    isDeleted: boolean;
    createdOn: string;
    createdBy: string | null;
    updatedOn: string | null;
    updatedBy: string | null;
}

export interface CreateAccount {
    accountName: string;
    accountEmail: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    zipCode: string;
    theme: string | null;
    primaryColorCode: string | null;
    secondaryColorCode: string | null;
    tertiaryColorCode: string | null;
    userEmail: string;
    userFirstName: string;
    userLastName: string;
    userRole: string;
    checks: Lookup[] | null;
    checksId: number[] | null;
}

export interface AccountListViewModel {
    accountId: number;
    accountName: string;
    isActive: boolean;
}

export interface AccountDetailViewModel extends AccountListViewModel {
    theme: string | null;
    accountEmail: string;
    primaryColorCode: string | null;
    secondaryColorCode: string | null;
    tertiaryColorCode: string | null;
    accountLogoUrl: string | null;
    isOigEnable: boolean;
    isNursysEnable: boolean;
    isSamEnable: boolean;
    address1: string;
    address2: string;
    city: string;
    state: string;
    zipCode: string;
    isSharePointConnected?: boolean;
    sharePointConnectionError?: string | null;
}

export interface SharepointConfigurations {
    id: number;
    accountId: number;
    siteUrl: string;
    userName: string;
    password: string;
    appId: string;
    clientSecret: string;
    subfolderName: string | null;
    defaultFolderPath: string;
    isActive: boolean;
    createdBy: string | null;
    createdDate: string;
    modifiedDate: string | null;
    lastUpdatedBy: string | null;
    errorMessage: string | null;
}

export interface ScrappedRecord {
  atsName: string;
  scrapingMethod?: string;
  isExpanded?: boolean;
  fieldName?: string;
  displayName?: string;
  selector?: string;
}

export interface GroupedScrapedData {
  key: string;
  records: ScrappedRecord[];
  isExpanded: boolean;
}