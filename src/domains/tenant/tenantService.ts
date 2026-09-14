export interface TenantOnboardingData {
  businessId: string;
  businessName: string;
  contactNumber: string;
  email: string;
  employeeCount: string;
  trialStartDate: string;
  trialEndDate: string;
  isOnboarded: boolean;
}

export class TenantService {
  private static STORAGE_KEY = 'pilin_tenant_onboarding';

  static getOnboardingData(): TenantOnboardingData | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  static isOnboarded(): boolean {
    const data = this.getOnboardingData();
    return !!(data && data.isOnboarded);
  }

  static completeOnboarding(data: {
    businessName: string;
    contactNumber: string;
    email: string;
    employeeCount: string;
  }): TenantOnboardingData {
    const now = new Date();
    const endDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const businessId = `tenant-${Date.now()}`;
    const onboardingRecord: TenantOnboardingData = {
      businessId,
      businessName: data.businessName.trim(),
      contactNumber: data.contactNumber.trim(),
      email: data.email.trim(),
      employeeCount: data.employeeCount,
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
    if (!data || !data.trialEndDate) {
      const now = new Date();
      const defaultEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      return {
        isActive: true,
        daysRemaining: 14,
        endDateFormatted: defaultEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        businessName: 'Usaha Baru',
      };
    }

    const end = new Date(data.trialEndDate);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    const formattedDate = end.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return {
      isActive: days > 0,
      daysRemaining: days,
      endDateFormatted: formattedDate,
      businessName: data.businessName,
    };
  }
}
