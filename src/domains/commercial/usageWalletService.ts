import {
  MIN_SALDO_PILIN_TOPUP,
  WA_MESSAGE_UNIT_PRICE,
  LOW_BALANCE_ALERT_THRESHOLD,
  CommunicationClass,
  CommercialDomainService
} from './commercialService';

export interface UsageLedgerRecord {
  id: string;
  customerId: string;
  source: string; // e.g., 'Reminder', 'POS', 'BLAS', 'Sapaan'
  communicationType: CommunicationClass;
  recipientRef: string;
  quantity: number;
  unitPrice: number; // 350
  totalCharge: number;
  previousBalance: number;
  newBalance: number;
  status: 'SUCCESS' | 'REJECTED_INSUFFICIENT_FUNDS' | 'REJECTED_FEATURE_INACTIVE' | 'TOPUP_SUCCESS';
  timestamp: string;
}

export interface LowBalanceAlertRecord {
  id: string;
  customerId: string;
  customerName: string;
  currentBalance: number;
  threshold: number;
  detectedAt: string;
  status: 'ACTIVE_UNREAD' | 'ACKNOWLEDGED';
}

export interface WalletState {
  saldoPilin: number;
  isDemoMode: boolean;
  lowBalanceAlertTriggered: boolean;
  activeAlert?: LowBalanceAlertRecord | null;
  activeSubscribedFeatures: Set<string>;
  ledger: UsageLedgerRecord[];
}

export class UsageWalletService {
  private static state: WalletState = {
    saldoPilin: 0, // Authoritative V1.1 default: Rp 0
    isDemoMode: false,
    lowBalanceAlertTriggered: false,
    activeAlert: null,
    activeSubscribedFeatures: new Set<string>([
      'SAPAAN',
      'REMINDER',
      'SMART_LOYALTY',
      'BLAS',
      'HYPNOSELLING'
    ]),
    ledger: []
  };

  static resetToDefault(): void {
    this.state = {
      saldoPilin: 0,
      isDemoMode: false,
      lowBalanceAlertTriggered: false,
      activeAlert: null,
      activeSubscribedFeatures: new Set<string>([
        'SAPAAN',
        'REMINDER',
        'SMART_LOYALTY',
        'BLAS',
        'HYPNOSELLING'
      ]),
      ledger: []
    };
  }

  static getBalance(): number {
    return this.state.saldoPilin;
  }

  static isDemoMode(): boolean {
    return this.state.isDemoMode;
  }

  static setDemoMode(enable: boolean): void {
    this.state.isDemoMode = enable;
    if (enable) {
      this.state.saldoPilin = 500000; // DEMO / TEST DATA ONLY
      if (this.state.saldoPilin >= LOW_BALANCE_ALERT_THRESHOLD) {
        this.state.lowBalanceAlertTriggered = false;
        this.state.activeAlert = null;
      }
    } else {
      this.state.saldoPilin = 0;
    }
  }

  static setSubscribedFeatures(features: string[]): void {
    this.state.activeSubscribedFeatures = new Set<string>(features.map(f => f.toUpperCase()));
  }

  static isFeatureSubscribed(featureCode: string): boolean {
    return this.state.activeSubscribedFeatures.has(featureCode.toUpperCase());
  }

  static toggleFeatureSubscription(featureCode: string): boolean {
    const code = featureCode.toUpperCase();
    if (this.state.activeSubscribedFeatures.has(code)) {
      this.state.activeSubscribedFeatures.delete(code);
      return false;
    } else {
      this.state.activeSubscribedFeatures.add(code);
      return true;
    }
  }

  static getSubscribedFeatures(): string[] {
    return Array.from(this.state.activeSubscribedFeatures);
  }

  static getActiveAlert(): LowBalanceAlertRecord | null {
    return this.state.activeAlert || null;
  }

  static acknowledgeAlert(): void {
    if (this.state.activeAlert) {
      this.state.activeAlert.status = 'ACKNOWLEDGED';
    }
  }

  static getLedger(): UsageLedgerRecord[] {
    return [...this.state.ledger];
  }

  /**
   * Top up Saldo PILIN
   * Must validate topUpAmount >= 100,000 (Rule V1.1 #2)
   */
  static topUpWallet(amount: number, customerId: string = 'CUST-001'): {
    success: boolean;
    message: string;
    newBalance: number;
  } {
    if (amount < MIN_SALDO_PILIN_TOPUP) {
      return {
        success: false,
        message: `Top-up Saldo PILIN ditolak: Jumlah minimal top-up adalah Rp ${MIN_SALDO_PILIN_TOPUP.toLocaleString('id-ID')}. (Input: Rp ${amount.toLocaleString('id-ID')})`,
        newBalance: this.state.saldoPilin
      };
    }

    const prevBalance = this.state.saldoPilin;
    this.state.saldoPilin += amount;

    // Reset low-balance alert trigger if balance rises back >= 15,000
    if (this.state.saldoPilin >= LOW_BALANCE_ALERT_THRESHOLD) {
      this.state.lowBalanceAlertTriggered = false;
      this.state.activeAlert = null;
    }

    const ledgerRecord: UsageLedgerRecord = {
      id: `ledg-topup-${Date.now()}`,
      customerId,
      source: 'TOPUP_WALLET',
      communicationType: 'TRANSACTIONAL',
      recipientRef: 'SALDO_PILIN_WALLET',
      quantity: 1,
      unitPrice: amount,
      totalCharge: -amount, // Credit
      previousBalance: prevBalance,
      newBalance: this.state.saldoPilin,
      status: 'TOPUP_SUCCESS',
      timestamp: new Date().toISOString()
    };

    this.state.ledger.unshift(ledgerRecord);

    return {
      success: true,
      message: `Top-up Saldo PILIN berhasil sebesar Rp ${amount.toLocaleString('id-ID')}! Saldo baru: Rp ${this.state.saldoPilin.toLocaleString('id-ID')}.`,
      newBalance: this.state.saldoPilin
    };
  }

  /**
   * Validate and reserve bulk dispatch (e.g., BLAS broadcast) before sending
   */
  static validateBulkReservation(quantity: number): {
    canProceed: boolean;
    requiredAmount: number;
    message: string;
  } {
    const requiredAmount = quantity * WA_MESSAGE_UNIT_PRICE;
    if (this.state.saldoPilin < requiredAmount) {
      return {
        canProceed: false,
        requiredAmount,
        message: `Penyiaran kampanye BLAS diblokir total! Saldo PILIN tidak mencukupi untuk ${quantity} pesan (Dibutuhkan: Rp ${requiredAmount.toLocaleString('id-ID')}, Saldo PILIN: Rp ${this.state.saldoPilin.toLocaleString('id-ID')}). Silakan lakukan top-up minimal Rp 100.000.`
      };
    }

    return {
      canProceed: true,
      requiredAmount,
      message: `Sanggup memproses ${quantity} pesan (Total biaya: Rp ${requiredAmount.toLocaleString('id-ID')}).`
    };
  }

  /**
   * Atomic Usage Deduction for WhatsApp Communication
   */
  static deductUsageFee(params: {
    communicationType: CommunicationClass;
    featureCode: string;
    quantity: number;
    recipientRef: string;
    customerId?: string;
    customerName?: string;
  }): {
    success: boolean;
    message: string;
    previousBalance: number;
    newBalance: number;
    totalCharge: number;
    ledgerRecord: UsageLedgerRecord;
  } {
    const customerId = params.customerId || 'CUST-001';
    const customerName = params.customerName || 'ABC Store';
    const code = params.featureCode.toUpperCase();
    const qty = Math.max(1, params.quantity);
    const totalCharge = qty * WA_MESSAGE_UNIT_PRICE;
    const prevBalance = this.state.saldoPilin;

    // Rule 6: Transactional WA does NOT require Feature Subscription
    if (params.communicationType !== 'TRANSACTIONAL') {
      if (!this.isFeatureSubscribed(code)) {
        const feat = CommercialDomainService.getFeatureByCode(code);
        const featName = feat ? feat.name : code;
        const failedRecord: UsageLedgerRecord = {
          id: `ledg-fail-feat-${Date.now()}`,
          customerId,
          source: featName,
          communicationType: params.communicationType,
          recipientRef: params.recipientRef,
          quantity: qty,
          unitPrice: WA_MESSAGE_UNIT_PRICE,
          totalCharge: 0,
          previousBalance: prevBalance,
          newBalance: prevBalance,
          status: 'REJECTED_FEATURE_INACTIVE',
          timestamp: new Date().toISOString()
        };
        this.state.ledger.unshift(failedRecord);

        return {
          success: false,
          message: `Pengiriman pesan WA ${featName} diblokir! Fitur belum teraktivasi dalam langganan bulanan.`,
          previousBalance: prevBalance,
          newBalance: prevBalance,
          totalCharge: 0,
          ledgerRecord: failedRecord
        };
      }
    }

    // Pre-sending balance check
    if (this.state.saldoPilin < totalCharge) {
      const failedRecord: UsageLedgerRecord = {
        id: `ledg-fail-fund-${Date.now()}`,
        customerId,
        source: code,
        communicationType: params.communicationType,
        recipientRef: params.recipientRef,
        quantity: qty,
        unitPrice: WA_MESSAGE_UNIT_PRICE,
        totalCharge: 0,
        previousBalance: prevBalance,
        newBalance: prevBalance,
        status: 'REJECTED_INSUFFICIENT_FUNDS',
        timestamp: new Date().toISOString()
      };
      this.state.ledger.unshift(failedRecord);

      return {
        success: false,
        message: `Pengiriman pesan WA diblokir! Saldo PILIN tidak mencukupi (Sisa Rp ${prevBalance.toLocaleString('id-ID')}, Dibutuhkan Rp ${totalCharge.toLocaleString('id-ID')}). Silakan top up Saldo PILIN.`,
        previousBalance: prevBalance,
        newBalance: prevBalance,
        totalCharge: 0,
        ledgerRecord: failedRecord
      };
    }

    // Atomic deduction
    this.state.saldoPilin -= totalCharge;
    const newBalance = this.state.saldoPilin;

    // Low balance alert evaluation (< Rp 15,000)
    if (newBalance < LOW_BALANCE_ALERT_THRESHOLD && !this.state.lowBalanceAlertTriggered) {
      this.state.lowBalanceAlertTriggered = true;
      this.state.activeAlert = {
        id: `alt-lowbal-${Date.now()}`,
        customerId,
        customerName,
        currentBalance: newBalance,
        threshold: LOW_BALANCE_ALERT_THRESHOLD,
        detectedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        status: 'ACTIVE_UNREAD'
      };
    }

    const featObj = CommercialDomainService.getFeatureByCode(code);
    const successRecord: UsageLedgerRecord = {
      id: `ledg-deduct-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      customerId,
      source: featObj ? featObj.name : (code === 'POS' ? 'POS Nota' : code),
      communicationType: params.communicationType,
      recipientRef: params.recipientRef,
      quantity: qty,
      unitPrice: WA_MESSAGE_UNIT_PRICE,
      totalCharge,
      previousBalance: prevBalance,
      newBalance,
      status: 'SUCCESS',
      timestamp: new Date().toISOString()
    };

    this.state.ledger.unshift(successRecord);

    return {
      success: true,
      message: `Potongan Saldo PILIN Rp ${totalCharge.toLocaleString('id-ID')} (${qty} pesan WA @ Rp 350) berhasil. Saldo sisa: Rp ${newBalance.toLocaleString('id-ID')}.`,
      previousBalance: prevBalance,
      newBalance,
      totalCharge,
      ledgerRecord: successRecord
    };
  }
}
