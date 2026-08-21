/**
 * MINARA BOS — REACT HOOKS FOR MANAGEMENT CONTROL LAYER (PHASE 6-VI.3E.2)
 * 
 * Provides client-side hooks for fetching Class B derived management conditions and Class C technical observations,
 * as well as triggering backend-authorized canonical management commands.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ManagementQueryService,
  UnassignedActionPlanQueryItem,
  OverdueActionPlanQueryItem,
  PendingEvidenceQueryItem,
  PendingResultQueryItem,
  MissedTargetEvaluationQueryItem,
  TechnicalOutboxFailureQueryItem,
  ManagementSummaryCounts,
} from './managementQueryService';
import { AssignmentService } from './assignmentService';
import { ExecutionService } from './executionService';
import { EvidenceService } from './evidenceService';
import { ResultService } from './resultService';
import { CorrectiveActionService } from './correctiveActionService';
import { ManagementRole } from './managementAuthorization';

export function useManagementSummary(businessId: string, branchId?: string, currentDate?: string) {
  const [summary, setSummary] = useState<ManagementSummaryCounts>({
    unassigned_plans_count: 0,
    overdue_plans_count: 0,
    pending_evidences_count: 0,
    pending_results_count: 0,
    missed_target_evaluations_count: 0,
    technical_outbox_failures_count: 0,
    total_canonical_exceptions_count: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(() => {
    setLoading(true);
    try {
      const data = ManagementQueryService.getManagementSummary({
        business_id: businessId,
        branch_id: branchId,
        currentDate: currentDate,
      });
      setSummary(data);
    } finally {
      setLoading(false);
    }
  }, [businessId, branchId, currentDate]);

  useEffect(() => {
    if (businessId) {
      refresh();
    }
  }, [businessId, refresh]);

  return { summary, loading, refresh };
}

export function useUnassignedActionPlans(businessId: string, branchId?: string) {
  const [items, setItems] = useState<UnassignedActionPlanQueryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchItems = useCallback(() => {
    setLoading(true);
    try {
      const res = ManagementQueryService.getUnassignedActionPlans({ business_id: businessId, branch_id: branchId });
      setItems(res);
    } finally {
      setLoading(false);
    }
  }, [businessId, branchId]);

  useEffect(() => {
    if (businessId) fetchItems();
  }, [businessId, fetchItems]);

  const assignAction = async (params: {
    command_id: string;
    action_plan_id: string;
    assigned_executor_user_id: string;
    actor_user_id: string;
    actor_role: ManagementRole;
    branch_id: string;
  }) => {
    const result = await AssignmentService.assignAction({
      ...params,
      business_id: businessId,
    });
    fetchItems();
    return result;
  };

  return { items, loading, refresh: fetchItems, assignAction };
}

export function useOverdueActionPlans(businessId: string, branchId?: string, currentDate?: string) {
  const [items, setItems] = useState<OverdueActionPlanQueryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchItems = useCallback(() => {
    setLoading(true);
    try {
      const res = ManagementQueryService.getOverdueActionPlans({ business_id: businessId, branch_id: branchId, currentDate });
      setItems(res);
    } finally {
      setLoading(false);
    }
  }, [businessId, branchId, currentDate]);

  useEffect(() => {
    if (businessId) fetchItems();
  }, [businessId, fetchItems]);

  const reassignAction = async (params: {
    command_id: string;
    assignment_id: string;
    new_executor_user_id: string;
    actor_user_id: string;
    actor_role: ManagementRole;
  }) => {
    const result = await AssignmentService.reassignAction({
      ...params,
      business_id: businessId,
    });
    fetchItems();
    return result;
  };

  const logProgress = async (params: {
    command_id: string;
    action_plan_id: string;
    progress_percent: number;
    notes?: string;
    blocker_reason?: string;
    actor_user_id: string;
    actor_role: ManagementRole;
  }) => {
    const result = await ExecutionService.logProgress({
      ...params,
      business_id: businessId,
    });
    fetchItems();
    return result;
  };

  return { items, loading, refresh: fetchItems, reassignAction, logProgress };
}

export function usePendingEvidences(businessId: string, branchId?: string) {
  const [items, setItems] = useState<PendingEvidenceQueryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchItems = useCallback(() => {
    setLoading(true);
    try {
      const res = ManagementQueryService.getPendingEvidences({ business_id: businessId, branch_id: branchId });
      setItems(res);
    } finally {
      setLoading(false);
    }
  }, [businessId, branchId]);

  useEffect(() => {
    if (businessId) fetchItems();
  }, [businessId, fetchItems]);

  const verifyEvidence = async (params: {
    command_id: string;
    evidence_id: string;
    actor_user_id: string;
    actor_role: ManagementRole;
  }) => {
    const result = await EvidenceService.verifyEvidence({
      ...params,
      business_id: businessId,
    });
    fetchItems();
    return result;
  };

  const rejectEvidence = async (params: {
    command_id: string;
    evidence_id: string;
    rejection_reason: string;
    actor_user_id: string;
    actor_role: ManagementRole;
  }) => {
    const result = await EvidenceService.rejectEvidence({
      ...params,
      business_id: businessId,
    });
    fetchItems();
    return result;
  };

  return { items, loading, refresh: fetchItems, verifyEvidence, rejectEvidence };
}

export function usePendingResults(businessId: string, branchId?: string) {
  const [items, setItems] = useState<PendingResultQueryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchItems = useCallback(() => {
    setLoading(true);
    try {
      const res = ManagementQueryService.getPendingResults({ business_id: businessId, branch_id: branchId });
      setItems(res);
    } finally {
      setLoading(false);
    }
  }, [businessId, branchId]);

  useEffect(() => {
    if (businessId) fetchItems();
  }, [businessId, fetchItems]);

  const verifyResult = async (params: {
    command_id: string;
    result_id: string;
    actor_user_id: string;
    actor_role: ManagementRole;
  }) => {
    const result = await ResultService.verifyResult({
      ...params,
      business_id: businessId,
    });
    fetchItems();
    return result;
  };

  return { items, loading, refresh: fetchItems, verifyResult };
}

export function useMissedTargetEvaluations(businessId: string, branchId?: string) {
  const [items, setItems] = useState<MissedTargetEvaluationQueryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchItems = useCallback(() => {
    setLoading(true);
    try {
      const res = ManagementQueryService.getMissedTargetEvaluations({ business_id: businessId, branch_id: branchId });
      setItems(res);
    } finally {
      setLoading(false);
    }
  }, [businessId, branchId]);

  useEffect(() => {
    if (businessId) fetchItems();
  }, [businessId, fetchItems]);

  const createCorrectiveAction = async (params: {
    command_id: string;
    source_evaluation_id: string;
    branch_id: string;
    actor_user_id: string;
    actor_role: ManagementRole;
    business_problem: string;
    business_reason: string;
    proposed_action: string;
    accountable_owner_user_id: string;
    target_description: string;
    expected_result_description: string;
    expected_metric_name: string;
    baseline_value: number;
    target_value: number;
    metric_unit: string;
    start_date: string;
    due_date: string;
  }) => {
    const result = await CorrectiveActionService.createCorrectiveAction({
      ...params,
      business_id: businessId,
    });
    fetchItems();
    return result;
  };

  return { items, loading, refresh: fetchItems, createCorrectiveAction };
}

export function useTechnicalOutboxFailures(businessId: string) {
  const [items, setItems] = useState<TechnicalOutboxFailureQueryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchItems = useCallback(() => {
    setLoading(true);
    try {
      const res = ManagementQueryService.getTechnicalOutboxFailures({ business_id: businessId });
      setItems(res);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (businessId) fetchItems();
  }, [businessId, fetchItems]);

  return { items, loading, refresh: fetchItems };
}
