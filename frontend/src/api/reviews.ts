import api from './client';

export interface SubmissionReviewItem {
  attempt_id: string;
  assessment_id: string;
  assessment_title: string;
  student_id: string;
  student_name: string;
  student_email: string;
  attempt_number: number;
  status: string;
  started_at: string;
  submitted_at?: string;
  total_score?: number | null;
  max_possible_score?: number | null;
  passed?: boolean | null;
  feedback?: string | null;
  results_released: boolean;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  target_type: string;
  target_id: string;
  old_value?: string;
  new_value?: string;
  reason?: string;
  created_at: string;
}

export const getSubmissionsReview = async (params?: {
  assessment_id?: string;
  student_id?: string;
}): Promise<SubmissionReviewItem[]> => {
  const { data } = await api.get('/reviews/submissions', { params });
  return data;
};

export const overrideScore = async (payload: {
  attempt_id: string;
  new_score: number;
  reason: string;
}): Promise<any> => {
  const { data } = await api.post('/reviews/override-score', payload);
  return data;
};

export const submitFeedback = async (payload: {
  attempt_id: string;
  feedback: string;
}): Promise<any> => {
  const { data } = await api.post('/reviews/feedback', payload);
  return data;
};

export const releaseResults = async (payload: {
  assessment_id: string;
  release: boolean;
}): Promise<any> => {
  const { data } = await api.post('/reviews/release-results', payload);
  return data;
};

export const getAuditLogs = async (target_id?: string): Promise<AuditLog[]> => {
  const { data } = await api.get('/reviews/audit-logs', { params: { target_id } });
  return data;
};
