import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute, GuestRoute } from './components/layout/ProtectedRoute';

// Auth pages
import SignInPage from './pages/auth/SignIn';
import SignUpPage from './pages/auth/SignUp';
import UnauthorizedPage from './pages/auth/Unauthorized';

// Student pages
import StudentDashboard from './pages/student/Dashboard';
import StudentAssessments from './pages/student/Assessments';
import ExamEnvironment from './pages/student/ExamEnvironment';
import StudentSubmissions from './pages/student/Submissions';
import StudentResults from './pages/student/Results';

// Teacher pages
import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherAssessments from './pages/teacher/Assessments';
import AssessmentBuilder from './pages/teacher/AssessmentBuilder';
import QuestionBank from './pages/teacher/QuestionBank';
import ProblemEditor from './pages/teacher/ProblemEditor';
import TeacherReview from './pages/teacher/Review';
import TeacherAnalytics from './pages/teacher/Analytics';
import TeacherClasses from './pages/teacher/Classes';

// Pages
import Profile from './pages/Profile';
import Settings from './pages/Settings';

import './index.css';
import './styles/components.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/sign-in" replace />} />

            {/* Guest-only routes */}
            <Route element={<GuestRoute />}>
              <Route path="/sign-in" element={<SignInPage />} />
              <Route path="/sign-up" element={<SignUpPage />} />
            </Route>

            {/* Unauthorized */}
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Student routes */}
            <Route element={<ProtectedRoute allowedRoles={['student']} />}>
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/student/assessments" element={<StudentAssessments />} />
              <Route path="/student/exam/:attemptId" element={<ExamEnvironment />} />
              <Route path="/student/submissions" element={<StudentSubmissions />} />
              <Route path="/student/results" element={<StudentResults />} />
              <Route path="/student/profile" element={<Profile />} />
            </Route>

            {/* Teacher routes */}
            <Route element={<ProtectedRoute allowedRoles={['teacher', 'admin']} />}>
              <Route path="/teacher" element={<TeacherDashboard />} />
              <Route path="/teacher/assessments" element={<TeacherAssessments />} />
              <Route path="/teacher/assessments/new" element={<AssessmentBuilder />} />
              <Route path="/teacher/assessments/:id/edit" element={<AssessmentBuilder />} />
              <Route path="/teacher/question-bank" element={<QuestionBank />} />
              <Route path="/teacher/problems" element={<ProblemEditor />} />
              <Route path="/teacher/submissions" element={<TeacherReview />} />
              <Route path="/teacher/results" element={<TeacherAnalytics />} />
              <Route path="/teacher/classes" element={<TeacherClasses />} />
              <Route path="/teacher/settings" element={<Settings />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<Navigate to="/sign-in" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
