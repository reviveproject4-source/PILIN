import { 
  CommunicationClass, 
  CommunicationPreference, 
  CustomerBehaviorProfile, 
  CustomerLifecycleState, 
  CustomerSignalCode, 
  RFMMetrics 
} from '@/lib/types';

export interface EligibilityResult {
  isEligible: boolean;
  rejectionReason?: 'COMMERCIAL_OPT_OUT' | 'RELATIONSHIP_OPT_OUT' | 'COOLDOWN_ACTIVE' | 'REMINDER_NOT_SENT' | 'NO_RELEVANT_ACTION';
  explanation: string;
}

export interface HypnosellingMessagePayload {
  customerId: string;
  customerName: string;
  communicationClass: CommunicationClass;
  category: 'SAPAAN' | 'QUOTE' | 'HYPPOSELLING';
  templateBody: string;
  closingGreeting: string;
  fullMessageBody: string;
  scheduledNextSendAt: Date;
  eligibility: EligibilityResult;
  behaviorProfile: CustomerBehaviorProfile;
}

export class HypnosellingEngine {

  /**
   * Derives Customer RFM & Lifecycle State dynamically from historical transactions (Section 3 & 5)
   */
  static deriveBehaviorProfile(
    customerId: string,
    completedTransactions: { total_amount: number; created_at: string }[],
    now: Date = new Date()
  ): CustomerBehaviorProfile {
    const count = completedTransactions.length;
    let totalMonetary = 0;
    let lastTxDate = new Date(0);

    completedTransactions.forEach(tx => {
      totalMonetary += tx.total_amount;
      const d = new Date(tx.created_at);
      if (d > lastTxDate) {
        lastTxDate = d;
      }
    });

    const recencyDays = count > 0 
      ? Math.floor((now.getTime() - lastTxDate.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    const rfm: RFMMetrics = {
      recencyDays,
      frequencyCount: count,
      monetaryTotal: totalMonetary
    };

    // Signals Derivation
    const detectedSignals: CustomerSignalCode[] = [];
    if (count === 1) detectedSignals.push('FIRST_PURCHASE');
    if (count > 1) detectedSignals.push('REPEAT_PURCHASE');
    if (totalMonetary >= 5000000) detectedSignals.push('HIGH_VALUE');
    if (recencyDays > 30 && recencyDays <= 60) detectedSignals.push('AT_RISK');
    if (recencyDays > 60) detectedSignals.push('DORMANCY_THRESHOLD_REACHED');

    // Lifecycle State Derivation Rules
    let lifecycleState: CustomerLifecycleState = 'NEW';
    if (count === 0) {
      lifecycleState = 'NEW';
    } else if (recencyDays > 90) {
      lifecycleState = 'DORMANT';
    } else if (recencyDays > 30) {
      lifecycleState = 'AT_RISK';
    } else if (count >= 5 || totalMonetary >= 5000000) {
      lifecycleState = 'LOYAL';
    } else if (count > 1) {
      lifecycleState = 'REPEAT';
    } else {
      lifecycleState = 'ACTIVE';
    }

    return {
      customerId,
      lifecycleState,
      rfm,
      detectedSignals
    };
  }

  /**
   * Evaluates Communication Eligibility (Section 9 & 10)
   */
  static checkEligibility(
    commClass: CommunicationClass,
    preference: CommunicationPreference,
    lastCommunicationAt?: Date | null,
    reminderStatus?: string,
    cooldownDays: number = 7,
    now: Date = new Date()
  ): EligibilityResult {
    // 1. Reminder Anchor Check (Section 6): Reminder must be SENT
    if (reminderStatus && reminderStatus !== 'SENT') {
      return {
        isEligible: false,
        rejectionReason: 'REMINDER_NOT_SENT',
        explanation: 'Relationship communication requires a successfully SENT reminder as anchor.'
      };
    }

    // 2. Preference Check (Section 9): Opt-out enforcement
    if (commClass === 'COMMERCIAL' && preference === 'TRANSACTIONAL_ONLY') {
      return {
        isEligible: false,
        rejectionReason: 'COMMERCIAL_OPT_OUT',
        explanation: 'Customer opted out from COMMERCIAL communication.'
      };
    }

    if (commClass === 'RELATIONSHIP' && preference === 'TRANSACTIONAL_ONLY') {
      return {
        isEligible: false,
        rejectionReason: 'RELATIONSHIP_OPT_OUT',
        explanation: 'Customer opted out from RELATIONSHIP communication.'
      };
    }

    // 3. Frequency Control / Cooldown Check (Section 10)
    if (lastCommunicationAt) {
      const daysSinceLastComm = (now.getTime() - lastCommunicationAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastComm < cooldownDays) {
        return {
          isEligible: false,
          rejectionReason: 'COOLDOWN_ACTIVE',
          explanation: `Customer is within the ${cooldownDays}-day cooldown period (${Math.round(daysSinceLastComm)} days since last message).`
        };
      }
    }

    return {
      isEligible: true,
      explanation: 'Customer passed all eligibility, preference, and frequency checks.'
    };
  }

  /**
   * Schedules relationship communication after first successful reminder (Section 38 & 11)
   */
  static evaluateNextRelationshipAction(
    customerId: string,
    customerName: string,
    category: 'SAPAAN' | 'QUOTE' | 'HYPPOSELLING',
    templateBody: string,
    closingGreeting: string = 'Salam hangat dari tim kami',
    preference: CommunicationPreference = 'ALL',
    lastReminderStatus: string = 'SENT',
    lastReminderSentAt: Date = new Date(),
    lastCommunicationAt?: Date | null,
    completedTransactions: { total_amount: number; created_at: string }[] = [],
    intervalDays: number = 15
  ): HypnosellingMessagePayload {
    // Map category to explicit Communication Class
    const commClass: CommunicationClass = category === 'HYPPOSELLING' ? 'COMMERCIAL' : 'RELATIONSHIP';

    // Derive Behavior Profile
    const behaviorProfile = this.deriveBehaviorProfile(customerId, completedTransactions);

    // Evaluate Eligibility
    const eligibility = this.checkEligibility(
      commClass,
      preference,
      lastCommunicationAt,
      lastReminderStatus
    );

    // Calculate next send date: +15 days after last successful reminder
    const nextSendAt = new Date(lastReminderSentAt);
    nextSendAt.setDate(nextSendAt.getDate() + intervalDays);

    // Personalize template
    const personalizedBody = templateBody.replace(/\{\{nama\}\}/g, customerName);
    const fullMessageBody = `${personalizedBody}\n\n${closingGreeting}`;

    return {
      customerId,
      customerName,
      communicationClass: commClass,
      category,
      templateBody: personalizedBody,
      closingGreeting,
      fullMessageBody,
      scheduledNextSendAt: nextSendAt,
      eligibility,
      behaviorProfile
    };
  }

  static scheduleNextSapaan(
    customerId: string,
    customerName: string,
    category: 'SAPAAN' | 'QUOTE' | 'HYPPOSELLING',
    templateBody: string,
    closingGreeting: string = 'Salam hangat dari tim kami',
    lastReminderSentAt: Date = new Date(),
    intervalDays: number = 15
  ): HypnosellingMessagePayload {
    return this.evaluateNextRelationshipAction(
      customerId,
      customerName,
      category,
      templateBody,
      closingGreeting,
      'ALL',
      'SENT',
      lastReminderSentAt,
      null,
      [],
      intervalDays
    );
  }
}
