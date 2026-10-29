export interface TenantOnboardingData {
  businessId: string;
  ownerName?: string;
  businessName: string;
  contactNumber: string;
  email: string;
  employeeCount: string;
  businessType?: 'JASA' | 'RETAIL' | 'HYBRID';
  defaultServiceDurationHours?: number;
  trialStartDate: string;
  trialEndDate: string;
  isOnboarded: boolean;
}

export class TenantService {
  private static STORAGE_KEY = 'pilin_tenant_onboarding';

  private static defaultLiveTenant: TenantOnboardingData = {
    businessId: '8ec99d6e-3f6f-47d4-910f-265cfe26c609',
    businessName: 'Bengkel Tas Sepatu',
    ownerName: 'Marlina',
    contactNumber: '081280320505',
    email: 'bengkeltassepatu@gmail.com',
    employeeCount: '1 Cabang',
    businessType: 'HYBRID',
    defaultServiceDurationHours: 24,
    trialStartDate: new Date().toISOString(),
    trialEndDate: new Date(Date.now() + 14 * 86400000).toISOString(),
    isOnboarded: true,
  };

  static getOnboardingData(): TenantOnboardingData {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.businessId === 'tenant-001' || !parsed.businessId)) {
            parsed.businessId = this.defaultLiveTenant.businessId;
            parsed.businessName = parsed.businessName || this.defaultLiveTenant.businessName;
            this.setOnboardingData(parsed);
          }
          return parsed;
        }
      } catch {
        // Fallback
      }
    }
    return { ...this.defaultLiveTenant };
  }

  static setOnboardingData(record: TenantOnboardingData): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(record));
    } catch (e) {
      console.error('Failed to store onboarding data', e);
    }
  }

  static isOnboarded(): boolean {
    return true;
  }

  static completeOnboarding(data: {
    ownerName?: string;
    businessName: string;
    contactNumber: string;
    email: string;
    employeeCount: string;
    businessType?: 'JASA' | 'RETAIL' | 'HYBRID';
    defaultServiceDurationHours?: number;
    businessId?: string;
  }): TenantOnboardingData {
    const now = new Date();
    const endDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const businessId = data.businessId || '8ec99d6e-3f6f-47d4-910f-265cfe26c609';
    const onboardingRecord: TenantOnboardingData = {
      businessId,
      ownerName: data.ownerName ? data.ownerName.trim() : 'Marlina',
      businessName: data.businessName ? data.businessName.trim() : 'Bengkel Tas Sepatu',
      contactNumber: data.contactNumber ? data.contactNumber.trim() : '081280320505',
      email: data.email ? data.email.trim() : 'bengkeltassepatu@gmail.com',
      employeeCount: data.employeeCount || '1 Cabang',
      businessType: data.businessType || 'HYBRID',
      defaultServiceDurationHours: data.defaultServiceDurationHours || 24,
      trialStartDate: now.toISOString(),
      trialEndDate: endDate.toISOString(),
      isOnboarded: true,
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(onboardingRecord));
      } catch (e) {
        console.error('Failed to store onboarding data', e);
      }
    }

    return onboardingRecord;
  }

  static getTrialInfo(): { isActive: boolean; daysRemaining: number; endDateFormatted: string; businessName: string } {
    const data = this.getOnboardingData();
    const end = new Date(data.trialEndDate || Date.now() + 14 * 86400000);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    const formattedDate = end.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return {
      isActive: true,
      daysRemaining: days || 14,
      endDateFormatted: formattedDate,
      businessName: data.businessName || 'Bengkel Tas Sepatu',
    };
  }
}
