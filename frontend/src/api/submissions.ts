import api from './client';

export type Verdict =
  | 'accepted'
  | 'wrong_answer'
  | 'compilation_error'
  | 'runtime_error'
  | 'time_limit_exceeded'
  | 'memory_limit_exceeded'
  | 'output_limit_exceeded'
  | 'system_error'
  | 'runner_unavailable';

export interface QuickRunTestCaseResult {
  test_case_id?: string;
  input_data: string;
  expected_output?: string;
  actual_output?: string;
  passed: boolean;
  verdict: Verdict;
  execution_time_ms: number;
  stderr?: string;
}

export interface QuickRunResponse {
  status: string;
  overall_verdict: Verdict;
  results: QuickRunTestCaseResult[];
}

export interface SubmissionTestResult {
  id: string;
  test_case_id: string;
  verdict: Verdict;
  execution_time_ms?: number;
  actual_output?: string | null;
  error_message?: string | null;
  passed: boolean;
  is_hidden: boolean;
}

export interface SubmissionDetail {
  id: string;
  attempt_id?: string;
  problem_id: string;
  student_id: string;
  language: string;
  status: string;
  verdict?: Verdict;
  score?: number;
  execution_time_ms?: number;
  created_at: string;
  source_code: string;
  student_name?: string;
  problem_title?: string;
  test_results: SubmissionTestResult[];
}

export const runSampleTests = async (payload: {
  problem_id: string;
  language: string;
  source_code: string;
  stdin?: string;
}): Promise<QuickRunResponse> => {
  const { data } = await api.post('/submissions/run', payload);
  return data;
};

export const submitCode = async (payload: {
  problem_id: string;
  language: string;
  source_code: string;
  attempt_id?: string;
}): Promise<SubmissionDetail> => {
  const { data } = await api.post('/submissions/', payload);
  return data;
};

export const getSubmission = async (id: string): Promise<SubmissionDetail> => {
  const { data } = await api.get(`/submissions/${id}`);
  return data;
};

export const listSubmissions = async (params?: {
  attempt_id?: string;
  problem_id?: string;
}): Promise<SubmissionDetail[]> => {
  const { data } = await api.get('/submissions/', { params });
  return data;
};

