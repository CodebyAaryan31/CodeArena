import api from './client';
import type { Difficulty } from './questions';

export interface TestCase {
  id?: string;
  input_data?: string | null;
  expected_output?: string | null;
  is_hidden: boolean;
  weight: number;
  order_index: number;
  explanation?: string | null;
}

export interface StarterCode {
  language: string;
  code: string;
}

export interface CodingProblem {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  input_format?: string;
  output_format?: string;
  constraints?: string;
  example_input?: string;
  example_output?: string;
  reference_solution?: string;
  reference_solution_language?: string;
  difficulty: Difficulty;
  topic: string;
  tags?: string;
  time_limit_ms: number;
  memory_limit_mb: number;
  created_at: string;
  updated_at: string;
  starter_codes: StarterCode[];
  test_cases: TestCase[];
}

export interface ProblemValidationItem {
  test_case_id: string;
  order_index: number;
  is_hidden: boolean;
  status: string;
  runtime_ms: number;
  verdict: string;
  message?: string | null;
}

export interface ProblemValidationResponse {
  problem_id: string;
  all_passed: boolean;
  total_tests: number;
  passed_tests: number;
  results: ProblemValidationItem[];
}

export const getCodingProblems = async (params?: {
  topic?: string;
  difficulty?: Difficulty;
  search?: string;
}): Promise<CodingProblem[]> => {
  const { data } = await api.get('/coding-problems/', { params });
  return data;
};

export const getCodingProblem = async (id: string): Promise<CodingProblem> => {
  const { data } = await api.get(`/coding-problems/${id}`);
  return data;
};

export const createCodingProblem = async (payload: Partial<CodingProblem>): Promise<CodingProblem> => {
  const { data } = await api.post('/coding-problems/', payload);
  return data;
};

export const updateCodingProblem = async (id: string, payload: Partial<CodingProblem>): Promise<CodingProblem> => {
  const { data } = await api.patch(`/coding-problems/${id}`, payload);
  return data;
};

export const deleteCodingProblem = async (id: string): Promise<void> => {
  await api.delete(`/coding-problems/${id}`);
};

export const validateProblem = async (id: string): Promise<ProblemValidationResponse> => {
  const { data } = await api.post(`/coding-problems/${id}/validate`);
  return data;
};

