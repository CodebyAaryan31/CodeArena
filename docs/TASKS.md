# CODEARENA — TASKS

Status markers: `[ ]` Not started · `[/]` In progress · `[x]` Complete · `[!]` Blocked

---

## Phase 0 — Scaffold and Design System `[x]`

- [x] Monorepo structure: `frontend/`, `backend/`, `runner/`, `docs/`
- [x] FastAPI skeleton with `/api/health`
- [x] Vite + React + TypeScript scaffold
- [x] CSS design token system (`tokens.css`)
- [x] Inter font + JetBrains Mono
- [x] Lucide React (no emoji icons)
- [x] Global CSS (`index.css`) and component CSS (`components.css`)
- [x] `.env.example` with all variables
- [x] `.gitignore`
- [x] `README.md` with setup commands

**Acceptance:** `npm run dev` and `uvicorn` both start. Design tokens render correctly.

---

## Phase 1 — Authentication and Application Shell `[x]`

- [x] DB: `users`, `refresh_tokens` tables
- [x] Seed: teacher + student accounts with documented credentials
- [x] `POST /api/auth/register`
- [x] `POST /api/auth/login`
- [x] `POST /api/auth/refresh` (token rotation)
- [x] `POST /api/auth/logout` (token revocation)
- [x] `GET /api/auth/me` (protected)
- [x] `GET /users/me` + `PATCH /users/me`
- [x] JWT middleware with server-side role check
- [x] `require_role()` dependency factory
- [x] Frontend: `AuthContext` with login/register/logout
- [x] Frontend: `ProtectedRoute` + `GuestRoute` wrappers
- [x] Frontend: Sign-in page (with dev credential shortcuts)
- [x] Frontend: Sign-up page (with role toggle)
- [x] Frontend: Student application shell + navigation
- [x] Frontend: Teacher application shell + navigation
- [x] Frontend: Unauthorized (403) page
- [x] Frontend: Student dashboard (with real empty state)
- [x] Frontend: Teacher dashboard (with real empty state)
- [x] Frontend: Vite proxy `/api` → `localhost:8000`
- [x] Tests: `test_auth.py` (registration, login, wrong password, token rotation, logout, role enforcement, health)

**Acceptance:** Teacher and student can sign in, see role-specific shells, sign out. Token expiry handled. Role checks server-side.

---

## Phase 2 — Teacher Assessment Management `[x]`

- [x] DB: `assessments`, `assessment_questions`, `classes`, `enrollments`
- [x] Assessment states: draft → scheduled → published → open (derived) → closed (derived) → archived
- [x] `POST /api/assessments/`
- [x] `GET /api/assessments/` (teacher: own; student: available)
- [x] `GET /api/assessments/{id}`
- [x] `PATCH /api/assessments/{id}`
- [x] `DELETE /api/assessments/{id}` (draft only)
- [x] `POST /api/assessments/{id}/publish`
- [x] `POST /api/assessments/{id}/archive`
- [x] `POST /api/assessments/{id}/duplicate`
- [x] Publish validation (title, at least one question slot, valid dates)
- [x] Teacher assessment list (table, state badges, actions)
- [x] Assessment builder form (duration, pass percentage, attempts, question selector)
- [x] Assessment preview mode
- [x] Draft autosave & updates
- [x] Tests: `test_assessments.py`

---

## Phase 3 — Coding Problems + Secure Runner + Grading `[x]`

### 3a — Coding Problem + Test Cases `[x]`
- [x] DB: `coding_problems`, `test_cases`, `starter_codes`
- [x] Problem CRUD API (`/api/coding-problems/`)
- [x] Test case CRUD API (hidden cases masked in student responses)
- [x] Teacher: problem editor, test case table (public/hidden distinct)
- [x] Sample problems seeded (Two Sum, Valid Palindrome)

### 3b — Isolated Runner (`runner/` service) `[x]`
- [x] Runner service (`runner/runner_app.py`) on port 8001
- [x] Python 3 support
- [x] C++17 (g++) support
- [x] `runner_unavailable` status when Docker absent and local subprocess disabled
- [x] CPU, memory, time, output limits
- [x] Verdicts: accepted, wrong_answer, compilation_error, runtime_error, time_limit_exceeded, memory_limit_exceeded, output_limit_exceeded, system_error

### 3c — Grading Engine `[x]`
- [x] DB: `submissions`, `submission_test_results`, `audit_logs`
- [x] Submission states: queued → running → evaluated | system_error
- [x] Score calculation from test weights
- [x] system_error ≠ wrong_answer distinction
- [x] Live runner & batch grading pipeline
- [x] `GET /api/submissions/{id}` for polling and status inspection

### 3d — Test Validation `[x]`
- [x] Public sample test execution via runner
- [x] Tests: `test_runner_and_grading.py`, `test_coding_problems.py`

---

## Phase 4 — Question Bank `[x]`

- [x] DB: `questions`, `question_options`
- [x] Types: single_mcq, multi_mcq, output_prediction, debugging, short_answer
- [x] Full CRUD API (`/api/questions/`)
- [x] Search + filter (topic, difficulty, type)
- [x] Student privacy masking (options `is_correct` and explanations withheld until release)
- [x] Question bank UI (list + filters + creation modal)
- [x] Add-to-assessment workflow in assessment builder
- [x] Tests: `test_questions.py`

---

## Phase 5 — Student Exam Flow `[x]`

- [x] DB: `assessment_attempts`, `attempt_answers`
- [x] `POST /api/attempts/` (server validates availability, attempt count)
- [x] `GET /api/attempts/{id}` (returns `time_remaining_seconds`)
- [x] Timer: server-authoritative (`started_at + duration - now`)
- [x] Refresh recovery (re-fetching restores time + answers)
- [x] Duplicate submission protection & attempt limits
- [x] Expired-attempt handling
- [x] Objective & code answer autosave (`PATCH /api/attempts/{id}/answers`)
- [x] Exam environment (distraction-free layout, timer countdown)
- [x] Question navigation (answered/unanswered/flagged indicators)
- [x] Final submission confirmation with unanswered warning
- [x] Tests: `test_attempts.py`

---

## Phase 6 — Monaco Coding Workspace `[x]`

- [x] Monaco Editor integration (@monaco-editor/react)
- [x] Language selector (Python 3, C++ 17, JavaScript)
- [x] Starter code loading
- [x] Split layout (problem description & constraints | Monaco editor | test output)
- [x] **Run Sample Tests** → real runner output (public cases only)
- [x] Output panel: Sample Tests results, pass/fail badges, stdout, stderr, runtimes
- [x] Tests: integrated in `test_runner_and_grading.py` and `ExamEnvironment.tsx`

---

## Phase 7 — Teacher Review + Result Release + Student Results `[x]`

- [x] Submissions table (filter by student, assessment, status, score)
- [x] Submission detail: source code, per-test summary, feedback
- [x] Hidden test inputs shown to authorized teachers only
- [x] Score override (requires reason, creates AuditLog entry)
- [x] Result release action (updates `results_released` flag and creates AuditLog)
- [x] Student results view (`/student/results`) — score visible after release
- [x] Tests: `test_reviews.py`

---

## Phase 8 — Analytics + Additional Features `[x]`

- [x] Real analytics: participation, completion rate, average score, score distribution buckets
- [x] Question accuracy analysis
- [x] Student leaderboard with rankings and time taken
- [x] CSV grade export download
- [x] Tests: `test_reviews.py` & API endpoints

---

## Phase 9 — Testing, Security, Accessibility & Integrity `[x]`

- [x] Assessment publication bug resolved: validated title, dates, positive points, required test cases, timezone-naive SQLite comparisons
- [x] Publication regression tests (`test_assessments.py::test_assessment_publication_regression`)
- [x] Teacher coding problem authoring (input/output formats, constraints, example pairs, reference solution validation on runner)
- [x] Hidden-test privacy test (`test_coding_problems.py`)
- [x] Student coding workspace: file upload (.py, .cpp, .js), sample test runner, complete grading runner, previous submissions history
- [x] Layered examination integrity: `ExamIntegrityEvent` model, browser signals tracking (visibility, blur, fullscreen exit), student warnings banner, instructor review trail
- [x] Score overrides with mandatory audit logging and reason
- [x] Configurable leaderboard with duration tie-breaking and privacy masking prior to results release
- [x] Comprehensive End-to-End Test (`test_e2e_flow.py`):
  Teacher authors problem → validates reference solution → creates & publishes assessment → student starts attempt → privacy verified → integrity signals logged → sample tests executed → code graded on isolated runner → scores withheld before release → teacher reviews attempt, inspects integrity events, and audits score override → teacher releases results → student views scores & leaderboard
- [x] Full Pytest suite passing: 21 / 21 passed
- [x] TypeScript check: `node ./node_modules/typescript/bin/tsc --noEmit` clean (0 errors)
- [x] Vite production bundle build: `vite build` clean (dist built successfully)

---

## Phase 10 — Final Delivery & Hackathon Readiness `[x]`

- [x] README complete, accurate, with live demo walkthrough script and architecture
- [x] Seed data populated with realistic Indian identities (Prof. Priya Sharma, Dr. Rahul Verma, Aaryan Patidar, Riya Mehta, etc.)
- [x] Core college programming problems added: "Sum of Two Numbers", "Even or Odd", "Find the Largest Number" with visible and hidden test cases, constraints, and reference solutions
- [x] Published assessment: "CS 102: Programming Fundamentals" with 100 total points and 3 allowed attempts
- [x] Profile & Settings pages implemented (replacing all "Coming in Phase X" placeholders)
- [x] 1-click dev credentials on Sign-In page for instant testing
- [x] Real-time isolated code execution via runner microservice (port 8001)
- [x] Verified end-to-end workflow from teacher authoring to student Monaco execution, integrity monitoring, and grade release
- [x] All 21 backend tests passing (`pytest -v`), TypeScript typecheck clean (0 errors), and Vite production build passing

