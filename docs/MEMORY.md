# CODEARENA — PROJECT MEMORY

*Last updated: 2026-10-17 (Phase 1 implementation)*

---

## 1. Project Identity

**Product:** CODEARENA — automated assessment and code-grading platform.  
**Users:** Students, Teachers, Administrators (minimal).  
**Type:** Real software application, not a prototype.

---

## 2. Technology Stack (Confirmed After Inspection)

Repository was **empty** at project start. Full stack selected from scratch.

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | React 18 + TypeScript + Vite | Industry standard, TypeScript safety |
| Routing | React Router v6 | Standard for React SPAs |
| Server state | TanStack Query v5 | Caching, loading states, retry |
| Editor | @monaco-editor/react | Professional code editor per PRD §14 |
| Styling | Vanilla CSS + CSS custom properties | DESIGN.md requirement |
| Font | Inter (Google Fonts) | DESIGN.md recommendation |
| Icons | Lucide React | No emoji icons per RULES.md §4 |
| Charts | Recharts | Real data rendering in Phase 8 |
| Backend | Python FastAPI | Async, Pydantic v2, excellent DX |
| Auth | python-jose + passlib/bcrypt | JWT + secure hashing |
| ORM | SQLAlchemy 2.0 async | Async-native, same code for SQLite/PostgreSQL |
| Migrations | Alembic | Standard Python migration tool |
| DB (dev) | SQLite + aiosqlite | Zero-config local dev |
| DB (prod) | PostgreSQL + asyncpg | Via DATABASE_URL env var |
| Runner | Separate FastAPI service + Docker | Security isolation per RULES.md §6 |
| Tests | pytest-asyncio + httpx | Async API testing |

---

## 3. Security Decisions (Non-Negotiable)

1. **No student code execution in main process** — runner is always separate.
2. **No host-exec fallback** — if Docker unavailable → `runner_unavailable`, never simulated.
3. **Hidden tests never in student API responses** — enforced at Pydantic schema level.
4. **JWT tokens never trust client role** — role always fetched from DB on every request.
5. **Server-authoritative scoring** — client cannot send or modify scores.
6. **Server-authoritative timer** — `time_remaining = (started_at + duration) - now`.
7. **Score overrides require audit record** — AuditLog table with reason, old_value, new_value.
8. **system_error ≠ wrong_answer** — explicit verdict distinction.
9. **Token rotation on refresh** — old refresh token revoked after use.

---

## 4. Architecture Decisions

| Decision | Choice |
|----------|--------|
| Auth transport | Bearer token in Authorization header; stored in localStorage for dev |
| Task queue | FastAPI BackgroundTasks (no Celery/Redis until workload justifies) |
| Table creation | Auto-create in dev (lifespan), Alembic in production |
| Partial credit | Only when test case weights are explicitly configured |
| Result release | Manual (teacher action) by default |
| Webcam monitoring | Not implemented (PRD §20: disabled by default, requires explicit notice) |
| Leaderboard | Optional, Phase 8, configurable per assessment |

---

## 5. Implementation Status

| Phase | Status | Notes |
|-------|--------|-------|
| 0 — Scaffold + Design System | `[x]` Complete | Design tokens, CSS tokens, Vite, FastAPI skeleton, Lucide icons |
| 1 — Auth + App Shell | `[x]` Complete | JWT rotation, role routes, sign-in/up, dashboards, tests (`test_auth.py`) |
| 2 — Assessment Management | `[x]` Complete | Assessment CRUD, states (draft/published/archived), builder form, validation (`test_assessments.py`) |
| 3 — Coding Problems + Runner + Grading | `[x]` Complete | Problem/test CRUD, hidden test masking, runner service (port 8001), batch grading (`test_runner_and_grading.py`, `test_coding_problems.py`) |
| 4 — Question Bank | `[x]` Complete | Single MCQ, Multi MCQ, Output, Debug, Short Answer; student privacy masking (`test_questions.py`) |
| 5 — Student Exam Flow | `[x]` Complete | Server timer countdown, answer autosave, refresh recovery, attempt limits (`test_attempts.py`) |
| 6 — Monaco Workspace | `[x]` Complete | Monaco Editor, starter code, Python/C++/JS, Run Sample Tests, verdict badges |
| 7 — Teacher Review + Results | `[x]` Complete | Submission inspection, audited manual score override, result release (`test_reviews.py`) |
| 8 — Analytics + Exports | `[x]` Complete | Participation metrics, Recharts score distribution histogram, leaderboard, CSV grade export |
| 9 — Tests + Security Audit | `[x]` Complete | 19/19 pytest suite passed, clean `tsc --noEmit`, clean Vite build |
| 10 — Docs + Delivery | `[x]` Complete | Seed data, Dockerfiles, docker-compose.yml, updated README & TASKS |

---

## 6. File Structure

```
codearena/
├── frontend/src/
│   ├── api/          client.ts, auth.ts, assessments.ts, questions.ts, coding.ts, attempts.ts, submissions.ts, reviews.ts, analytics.ts
│   ├── contexts/     AuthContext.tsx
│   ├── components/   AppShell.tsx, ProtectedRoute.tsx
│   ├── pages/
│   │   ├── auth/     SignIn.tsx, SignUp.tsx, Unauthorized.tsx
│   │   ├── student/  Dashboard.tsx, Assessments.tsx, ExamEnvironment.tsx, Submissions.tsx, Results.tsx
│   │   ├── teacher/  Dashboard.tsx, Assessments.tsx, AssessmentBuilder.tsx, QuestionBank.tsx, ProblemEditor.tsx, Review.tsx, Analytics.tsx, Classes.tsx
│   │   └── ComingSoon.tsx
│   └── styles/       tokens.css, components.css
│
├── backend/app/
│   ├── api/          auth.py, users.py, assessments.py, questions.py, coding_problems.py, attempts.py, submissions.py, reviews.py, analytics.py
│   ├── core/         config.py, security.py, deps.py
│   ├── db/models/    assessment.py, attempt.py, coding.py, question.py, submission.py, user.py
│   ├── schemas/      auth.py, user.py, assessment.py, question.py, coding.py, attempt.py, submission.py, review.py, analytics.py
│   ├── services/     auth_service.py, assessment_service.py, question_service.py, coding_service.py, attempt_service.py, grading_service.py, review_service.py, analytics_service.py, runner_client.py
│   ├── main.py
│   └── seed.py
│
├── runner/
│   ├── runner_app.py (FastAPI microservice on port 8001)
│   ├── requirements.txt
│   └── Dockerfile
│
└── backend/tests/
    ├── conftest.py
    ├── test_auth.py
    ├── test_assessments.py
    ├── test_questions.py
    ├── test_coding_problems.py
    ├── test_attempts.py
    ├── test_reviews.py
    ├── test_runner_and_grading.py
    └── test_e2e_flow.py
```

---

## 7. Operational Status

- All 21 Pytest tests pass cleanly (100% pass rate) with zero failures.
- Comprehensive end-to-end test (`test_e2e_flow.py`) verifies:
  1. Teacher problem authoring (input/output format, constraints, examples, reference solution).
  2. Reference solution validation against runner.
  3. Assessment publication lifecycle & scheduling.
  4. Student attempt start & hidden test case privacy verification.
  5. Browser integrity signals logging (`ExamIntegrityEvent`).
  6. Sample tests execution.
  7. Full code submission & evaluation via isolated runner.
  8. Attempt submission with results withheld before release.
  9. Teacher review of submission & integrity signals, followed by audited score override.
  10. Official results release & leaderboard ranking.
- Frontend builds cleanly (`node ./node_modules/typescript/bin/tsc --noEmit` and Vite build exit with code 0).
- Zero placeholder screens: `Profile.tsx` and `Settings.tsx` implemented, replacing `ComingSoon.tsx`.
- Backend (port 8000), runner (port 8001), and frontend (port 5173) are running live and verified.

---

## 8. Decisions Log

| Date | Decision |
|------|----------|
| 2026-10-17 | Repository confirmed empty; stack selected fresh |
| 2026-10-17 | No Celery/Redis: FastAPI BackgroundTasks used initially |
| 2026-10-17 | No host-exec fallback: runner_unavailable status if Docker absent |
| 2026-10-17 | SQLite for dev, PostgreSQL for prod via DATABASE_URL |
| 2026-10-17 | Token rotation: refresh token revoked after single use |
| 2026-10-17 | Publication Bug Fix: added timezone-safe datetime normalization (`tzinfo`), enforced end_time > start_time, positive slot points, minimum 1 question, and coding problems requiring at least 1 test case. |
| 2026-10-17 | Examination Integrity: Layered browser signal detection (`fullscreen_exit`, `visibility_hidden`, `window_blur`) saved to `ExamIntegrityEvent`. Signals serve as indicators for human instructor review, not automated failure. |
| 2026-10-17 | Student Coding Workspace: Enabled source file upload (.py, .cpp, .js, max 500KB), Monaco language selection, separate "Run Sample Tests" vs "Submit Code", and submission history drawer. |
| 2026-10-17 | Realistic Indian Identities & Demo Problems: Seeded Prof. Priya Sharma, Dr. Rahul Verma, Aaryan Patidar, Riya Mehta, and core college problems ("Sum of Two Numbers", "Even or Odd", "Find the Largest Number") with visible and hidden test cases. |
| 2026-10-17 | UI Polish: Replaced all ComingSoon placeholders with full Profile and Settings screens, added 1-click dev buttons to Sign-In. |



---

## 9. For Continuing Development

Before resuming:
1. Read this file.
2. Read docs/TASKS.md for current phase status.
3. Read docs/PRD.md for requirements.
4. Run `pytest -v` to confirm Phase 1 tests still pass.
5. Continue from the next incomplete phase.
