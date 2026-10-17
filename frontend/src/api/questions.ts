import api from './client';

export type QuestionType =
  | 'single_mcq'
  | 'multi_mcq'
  | 'output_prediction'
  | 'debugging'
  | 'short_answer'
  | 'programming';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface QuestionOption {
  id?: string;
  text: string;
  is_correct?: boolean;
  order_index: number;
}

export interface Question {
  id: string;
  creator_id: string;
  title: string;
  prompt: string;
  type: QuestionType;
  difficulty: Difficulty;
  topic: string;
  tags?: string;
  code_snippet?: string;
  solution_explanation?: string;
  created_at: string;
  updated_at: string;
  options: QuestionOption[];
}

export const getQuestions = async (params?: {
  topic?: string;
  difficulty?: Difficulty;
  type?: QuestionType;
  search?: string;
}): Promise<Question[]> => {
  const { data } = await api.get('/questions/', { params });
  return data;
};

export const getQuestion = async (id: string): Promise<Question> => {
  const { data } = await api.get(`/questions/${id}`);
  return data;
};

export const createQuestion = async (payload: Partial<Question>): Promise<Question> => {
  const { data } = await api.post('/questions/', payload);
  return data;
};

export const updateQuestion = async (id: string, payload: Partial<Question>): Promise<Question> => {
  const { data } = await api.patch(`/questions/${id}`, payload);
  return data;
};

export const deleteQuestion = async (id: string): Promise<void> => {
  await api.delete(`/questions/${id}`);
};
