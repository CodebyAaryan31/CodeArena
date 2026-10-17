import api from './client';
import type { Assessment } from './assessments';

export type AttemptStatus = 'in_progress' | 'submitted' | 'expired' | 'evaluated';

export interface AttemptAnswer {
  id: string;
  assessment_question_id: string;
  selected_option_ids?: string;
  text_answer?: string;
  code_answer?: string;
  language?: string;
  is_flagged: boolean;
  score?: number | null;
  auto_graded: boolean;
}

export interface AttemptDetail {
  id: string;
  assessment_id: string;
  student_id: string;
  attempt_number: number;
  status: AttemptStatus;
  started_at: string;
  submitted_at?: string;
  total_score?: number | null;
  max_possible_score?: number | null;
  passed?: boolean | null;
  feedback?: string | null;
  time_remaining_seconds: number;
  assessment: Assessment;
  answers: AttemptAnswer[];
}

export const startAttempt = async (assessment_id: string): Promise<AttemptDetail> => {
  const { data } = await api.post('/attempts/', { assessment_id });
  return data;
};

export const getAttempt = async (attempt_id: string): Promise<AttemptDetail> => {
  const { data } = await api.get(`/attempts/${attempt_id}`);
  return data;
};

export const listAttempts = async (params?: { assessment_id?: string }): Promise<AttemptDetail[]> => {
  const { data } = await api.get('/attempts/', { params });
  return data;
};


export const saveAnswer = async (
  attempt_id: string,
  payload: {
    assessment_question_id: string;
    selected_option_ids?: string;
    text_answer?: string;
    code_answer?: string;
    language?: string;
    is_flagged?: boolean;
  }
): Promise<AttemptAnswer> => {
  const { data } = await api.patch(`/attempts/${attempt_id}/answers`, payload);
  return data;
};

export interface IntegrityEvent {
  id: string;
  attempt_id: string;
  event_type: string;
  details?: string | null;
  timestamp: string;
}

export const submitAttempt = async (attempt_id: string): Promise<AttemptDetail> => {
  const { data } = await api.post(`/attempts/${attempt_id}/submit`);
  return data;
};

export const recordIntegrityEvent = async (
  attempt_id: string,
  event: { event_type: string; details?: string }
): Promise<IntegrityEvent> => {
  const { data } = await api.post(`/attempts/${attempt_id}/integrity-events`, event);
  return data;
};

export const listIntegrityEvents = async (attempt_id: string): Promise<IntegrityEvent[]> => {
  const { data } = await api.get(`/attempts/${attempt_id}/integrity-events`);
  return data;
};

