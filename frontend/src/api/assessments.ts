import api from './client';

export type AssessmentState = 'draft' | 'scheduled' | 'published' | 'archived';

export interface AssessmentQuestion {
  id: string;
  assessment_id: string;
  question_id?: string;
  problem_id?: string;
  order_index: number;
  points: number;
  question?: any;
  problem?: any;
}

export interface Assessment {
  id: string;
  title: string;
  description?: string;
  teacher_id: string;
  state: AssessmentState;
  duration_minutes: number;
  pass_percentage: number;
  start_time?: string;
  end_time?: string;
  max_attempts: number;
  shuffle_questions: boolean;
  results_released: boolean;
  created_at: string;
  updated_at: string;
  question_count: number;
  total_points: number;
  is_open: boolean;
  is_closed?: boolean;
  is_upcoming?: boolean;
  questions?: AssessmentQuestion[];
}

export const getAssessments = async (): Promise<Assessment[]> => {
  const { data } = await api.get('/assessments/');
  return data;
};

export const getAssessment = async (id: string): Promise<Assessment> => {
  const { data } = await api.get(`/assessments/${id}`);
  return data;
};

export const createAssessment = async (payload: Partial<Assessment>): Promise<Assessment> => {
  const { data } = await api.post('/assessments/', payload);
  return data;
};

export const updateAssessment = async (id: string, payload: Partial<Assessment>): Promise<Assessment> => {
  const { data } = await api.patch(`/assessments/${id}`, payload);
  return data;
};

export const deleteAssessment = async (id: string): Promise<void> => {
  await api.delete(`/assessments/${id}`);
};

export const publishAssessment = async (id: string): Promise<Assessment> => {
  const { data } = await api.post(`/assessments/${id}/publish`);
  return data;
};

export const archiveAssessment = async (id: string): Promise<Assessment> => {
  const { data } = await api.post(`/assessments/${id}/archive`);
  return data;
};

export const duplicateAssessment = async (id: string): Promise<Assessment> => {
  const { data } = await api.post(`/assessments/${id}/duplicate`);
  return data;
};
