import { AuditLog } from '@/lib/types';

/**
 * Audit Logger Service — PILIN Control Domain (Section 42 & Artifact 5)
 * Enforces PII sanitization and business-significant event logging.
 * NEVER audits SELECT/query operations.
 */
export class AuditLogger {
  
  /**
   * Sanitizes audit payload to prevent PII/Credentials leakage
   */
  static sanitizePayload(payload: Record<string, any>): Record<string, any> {
    if (!payload) return {};

    const sanitized = { ...payload };

    // Sensitive field keys to redact or mask
    const sensitiveKeys = ['password', 'token', 'auth_token', 'secret', 'credit_card', 'pin'];
    
    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(k => lowerKey.includes(k))) {
        sanitized[key] = '[REDACTED]';
      } else if (lowerKey === 'no_hp' || lowerKey === 'phone') {
        // Mask phone number for PII compliance (e.g. 62812****789)
        const val = String(sanitized[key]);
        if (val.length > 7) {
          sanitized[key] = val.slice(0, 5) + '****' + val.slice(-3);
        }
      }
    }

    return sanitized;
  }

  /**
   * Constructs a sanitized audit log entry
   */
  static buildLogEntry(
    business_id: string,
    operation: string,
    entity: string,
    actor_user_id?: string,
    branch_id?: string,
    entity_id?: string,
    rawPayload: Record<string, any> = {},
    ip_address?: string
  ): Omit<AuditLog, 'id' | 'created_at'> {
    return {
      business_id,
      branch_id,
      actor_user_id,
      operation,
      entity,
      entity_id,
      payload_sanitized: this.sanitizePayload(rawPayload),
      ip_address
    };
  }
}
