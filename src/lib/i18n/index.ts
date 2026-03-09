export type Locale = 'he' | 'en';

export const LOCALES = ['he', 'en'] as const;
export const DEFAULT_LOCALE: Locale = 'he';
export const RTL_LOCALES: Locale[] = ['he'];

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

export function getDir(locale: Locale): 'rtl' | 'ltr' {
  return isRtl(locale) ? 'rtl' : 'ltr';
}

export type Dictionary = {
  sidebar: {
    appName: string;
    rfqDashboard: string;
    newRfq: string;
    clientManagement: string;
    supplierManagement: string;
    organizationSettings: string;
    systemSettings: string;
    logout: string;
    lightMode: string;
    darkMode: string;
    menu: string;
    close: string;
  };
  auth: {
    login: string;
    signup: string;
    email: string;
    password: string;
    fullName: string;
    companyName: string;
    loggingIn: string;
    signingUp: string;
    noAccount: string;
    hasAccount: string;
    createAccount: string;
    loginTitle: string;
    signupTitle: string;
    loginSubtitle: string;
    signupSubtitle: string;
    signupSuccess: string;
    signupSuccessDetail: string;
    verificationSent: string;
    confirmEmail: string;
    backToLogin: string;
    invalidCredentials: string;
    loginError: string;
    rateLimitError: string;
    signupError: string;
    unexpectedError: string;
  };
  common: {
    save: string;
    saving: string;
    cancel: string;
    delete: string;
    deleting: string;
    add: string;
    edit: string;
    search: string;
    actions: string;
    name: string;
    email: string;
    phone: string;
    domain: string;
    status: string;
    loading: string;
    noResults: string;
    confirm: string;
    all: string;
    error: string;
    success: string;
    required: string;
    pageNotFound: string;
    pageNotFoundDesc: string;
    backHome: string;
    errorTitle: string;
    errorDesc: string;
    tryAgain: string;
  };
  clients: {
    title: string;
    addClient: string;
    editClient: string;
    deleteClient: string;
    clientName: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    emptyTitle: string;
    emptyDescription: string;
    deleteConfirm: string;
    deleteSuccess: string;
    approvedSuppliers: string;
    noApprovedSuppliers: string;
    addApprovedSupplier: string;
    selectSupplier: string;
  };
  suppliers: {
    title: string;
    addSupplier: string;
    editSupplier: string;
    deleteSupplier: string;
    supplierName: string;
    supplierEmail: string;
    supplierPhone: string;
    supplierDomain: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyDomainDescription: string;
    deleteConfirm: string;
    deleteSuccess: string;
    allDomains: string;
  };
  organization: {
    title: string;
    details: string;
    companyName: string;
    senderEmail: string;
    saveChanges: string;
    updateSuccess: string;
    members: string;
    inviteMember: string;
    inviteEmail: string;
    sendInvite: string;
    sending: string;
    role: string;
    admin: string;
    member: string;
    pending: string;
    cancelInvite: string;
    resendInvite: string;
    noMembers: string;
    noPendingInvites: string;
    pendingInvites: string;
    joinedAt: string;
    sentDate: string;
    expiresAt: string;
  };
  rfqDashboard: {
    title: string;
    newRfq: string;
    searchPlaceholder: string;
    client: string;
    allClients: string;
    allStatuses: string;
    partSn: string;
    revision: string;
    quantity: string;
    date: string;
    sending: string;
    sent: string;
    createdAt: string;
    emptyTitle: string;
    emptyDescription: string;
    statusDraft: string;
    statusInProgress: string;
    statusCompleted: string;
    loadError: string;
  };
  systemSettings: {
    title: string;
    language: string;
    languageDesc: string;
    appearance: string;
    appearanceDesc: string;
    light: string;
    dark: string;
    system: string;
    hebrew: string;
    english: string;
  };
  domains: {
    raw_material: string;
    coating: string;
    passivation: string;
    quenching: string;
    subcontractor: string;
  };
  metadata: {
    appName: string;
    appDescription: string;
  };
};
