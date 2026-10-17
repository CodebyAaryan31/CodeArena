import api from './client';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  role: 'student' | 'teacher' | 'admin';
  user_id: string;
  full_name: string;
  email: string;
}

export interface RegisterPayload {
  email: string;
  full_name: string;
  password: string;
  role: 'student' | 'teacher';
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    api.post<AuthTokens>('/auth/register', payload).then((r) => r.data),

  login: (payload: LoginPayload) =>
    api.post<AuthTokens>('/auth/login', payload).then((r) => r.data),

  logout: (refresh_token: string) =>
    api.post('/auth/logout', { refresh_token }),

  me: () =>
    api.get<AuthTokens>('/auth/me').then((r) => r.data),
};

export const userApi = {
  getProfile: () => api.get('/users/me').then((r) => r.data),
  updateProfile: (data: { full_name?: string; bio?: string; avatar_url?: string }) =>
    api.patch('/users/me', data).then((r) => r.data),
};
