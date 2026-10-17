import api from './client';

export interface ScoreBucket {
  range_label: string;
  count: number;
}

export interface QuestionAccuracy {
  question_id: string;
  title: string;
  type: string;
  accuracy_percentage: number;
  total_responses: number;
}

export interface AssessmentAnalytics {
  assessment_id: string;
  title: string;
  total_assigned: number;
  total_submissions: number;
  completion_rate: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  pass_rate: number;
  score_distribution: ScoreBucket[];
  question_performance: QuestionAccuracy[];
}

export interface LeaderboardEntry {
  rank: number;
  student_id: string;
  student_name: string;
  score: number;
  max_score: number;
  percentage: number;
  completion_time_minutes: number;
}

export const getAssessmentAnalytics = async (assessment_id: string): Promise<AssessmentAnalytics> => {
  const { data } = await api.get(`/analytics/assessments/${assessment_id}`);
  return data;
};

export const getLeaderboard = async (assessment_id: string): Promise<LeaderboardEntry[]> => {
  const { data } = await api.get(`/analytics/leaderboard/${assessment_id}`);
  return data;
};
