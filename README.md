# CODEARENA — Automated Code Testing & Grading Engine

An enterprise-grade, standalone automated coding assessment and real-time grading engine designed for computer science instructors, teaching assistants, and programming students.

---

## 🎯 Official Problem Statement & Objective

Teachers and teaching assistants spend significant time opening student code, compiling programs, running them against sample inputs, checking outputs, and calculating scores manually. This slows feedback, creates repetitive work, and can result in inconsistent grading.

**CODEARENA** solves this with an end-to-end, automated evaluation platform:
1. **Assignment & Problem Authoring:** Instructors configure problems with visible debugging test cases and hidden test cases with configurable points/weights, execution time limits, and reference solutions.
2. **Student Submission Workspace:** Students write, paste, or upload source code (`.py`, `.cpp`, `.c`, `.java`, `.js`, `.ts`), run public sample tests, and submit for automated grading.
3. **Isolated Code Runner:** Untrusted student code executes in a dedicated, sandboxed execution microservice with strict timeouts, process isolation, and memory constraints.
4. **Instant Objective Grading:** Supports clear statuses: `Accepted`, `Wrong Answer`, `Compilation Error`, `Runtime Error`, `Time Limit Exceeded`, and `System Error`.
5. **Layered Exam Integrity:** Server-authoritative timers, attempt limits, autosave, and client-side signals (fullscreen tracking, visibility/tab changes, window blur) with full instructor audit trails.
6. **Analytics & Review:** Comprehensive score distribution, exportable grade reports (CSV), and audited score overrides.

---

## 🚀 Architecture & Live Service Ports

| Service | Port / URL | Tech Stack | Status / Health |
|---|---|---|---|
| **Frontend Web App** | `http://127.0.0.1:5173` | React 18, Vite, TypeScript, Monaco Editor | [App Login](http://127.0.0.1:5173/signin) |
| **Backend REST API** | `http://127.0.0.1:8000` | FastAPI, SQLAlchemy 2.0 Async, SQLite/PostgreSQL | [Swagger Docs](http://127.0.0.1:8000/api/docs) |
| **Isolated Code Runner** | `http://127.0.0.1:8001` | FastAPI, Isolated Subprocess Sandbox / Docker | [Runner Health](http://127.0.0.1:8001/health) |

---

## 🔑 Preseeded Demonstration Accounts

The Sign-In screen features **1-click dev credential buttons** for instant access:

| Role | Name | Email | Password |
|---|---|---|---|
| **Teacher (Primary)** | Prof. Priya Sharma | `priya.sharma@codearena.dev` | `Teacher1234` |
| **Teacher (Alternate)** | Dr. Rahul Verma | `rahul.verma@codearena.dev` | `Teacher1234` |
| **Teacher (Legacy)** | Instructor Demo | `teacher@codearena.test` | `Teacher1234` |
| **Student (Primary)** | Aaryan Patidar | `aaryan.patidar@codearena.dev` | `Student1234` |
| **Student (Alternate)** | Riya Mehta | `riya.mehta@codearena.dev` | `Student1234` |
| **Student (Legacy)** | Student Demo | `student@codearena.test` | `Student1234` |

---

## 📦 Local Setup Instructions

### 1. Prerequisites
- **Python:** 3.11+
- **Node.js:** 18+
- (Optional) Docker for containerized deployment

### 2. Isolated Execution Runner Microservice
```powershell
cd runner
# Use Python virtual environment
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt

# Start runner on port 8001
uvicorn runner_app:app --host 127.0.0.1 --port 8001
```

### 3. Backend REST API
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt

# Seed realistic Indian identities and college assessment problems
python -m app.seed

# Start backend API on port 8000
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 4. Frontend Web Application
```powershell
cd frontend
npm install
npm run dev
# Open in browser: http://127.0.0.1:5173
```

---

## 🧪 Verification & Automated Testing

### Backend Test Suite (21/21 Passing)
```powershell
cd backend
.\.venv\Scripts\pytest -v
```
**Tests Covered:**
- Assessment publication lifecycle, state transitions, and persistence
- Hidden-test privacy guarantees (hidden inputs/outputs never exposed to students)
- Student assessment attempt workflows, timers, and autosave
- Isolated runner microservice execution, timeouts, compilation errors, and wrong answers
- Multi-test weighted scoring and partial grading
- Full End-to-End assessment lifecycle (`test_full_assessment_e2e_lifecycle`)
- Teacher review, audit logging, and score override reasons
- Token rotation and role-based access control

### Frontend Typecheck & Production Build
```powershell
cd frontend
# TypeScript verification
node ./node_modules/typescript/bin/tsc --noEmit

# Production bundle build
node ./node_modules/vite/bin/vite.js build
```

---

## 🎓 College Hackathon Demonstration Script

Follow this sequence for a flawless 5-minute live hackathon presentation:

### Step 1: Teacher Assessment Authoring & Validation
1. Open `http://127.0.0.1:5173/signin` and click **"Teacher (Priya Sharma)"**.
2. Navigate to **Problem Authoring** (`/teacher/problems`).
3. View **"Sum of Two Numbers"** or author a new problem:
   - Configure Input/Output format, Constraints, Example Input/Output.
   - Configure Public Test Cases (`5 7` -> `12`) and Hidden Test Cases (`-15 -25` -> `-40`).
   - Switch to **Reference Solution** tab and click **Validate Solution** to verify all test cases pass live.
4. Navigate to **Assessments** (`/teacher/assessments`) and inspect **"CS 102: Programming Fundamentals"** (already published with positive slot points, non-past deadlines, and active availability).

### Step 2: Student Examination & Live Code Execution
1. Open a new private window or sign out and log in as **"Student (Aaryan Patidar)"**.
2. Go to **Assessments** (`/student/assessments`).
3. Click **Start Assessment** on "CS 102: Programming Fundamentals".
4. Observe exam integrity features:
   - Notice the fullscreen prompt and browser monitoring disclosure.
   - Switch tabs or exit fullscreen: notice the instant warning banner and logged event.
5. In the **Monaco Code Workspace**:
   - Write or paste code, or click **Upload Source Code** (select a `.py` file).
   - Click **Run Sample Tests**: executes public tests in the isolated runner microservice, displaying instant stdout and runtime comparison.
   - Introduce a bug (e.g. `print(a - b)`) and click **Submit Code**: observe the real `Wrong Answer` outcome with partial credit.
   - Fix the solution to `print(a + b)` and click **Submit Code**: observe the real `Accepted` verdict with 100% score calculation.
6. Click **Finish & Submit Assessment**.

### Step 3: Teacher Review & Audited Grade Overrides
1. Switch back to **Prof. Priya Sharma**.
2. Navigate to **Submissions & Review** (`/teacher/submissions`).
3. Inspect Aaryan Patidar's submission:
   - Review the code, compiler output, and individual test cases.
   - Expand the **Browser Integrity Audit Trail** to inspect timestamped tab switches and fullscreen events.
   - Enter a score adjustment with an explicit **Override Reason** (e.g., `"Manual verification of edge case"`).
   - Submit override: observe the database-persisted audit record.
4. Navigate to **Results & Analytics** (`/teacher/results`):
   - Inspect the real score distribution chart.
   - View the live leaderboard with tie-breaking rules.
   - Click **Export Grades (CSV)** to download the grade sheet.

---

## 🛡️ Security & Privacy Design Principles

1. **Strict Secrecy of Hidden Tests:** Hidden test inputs and expected outputs are never returned in student-facing API responses.
2. **Untrusted Code Isolation:** Student submissions run exclusively inside the isolated runner microservice with hard CPU and memory resource limits. No host process execution.
3. **Server-Authoritative Lifecycle:** Assessment state, deadlines, question points, and attempt validation are enforced by backend database constraints.
4. **Honest Integrity Signals:** Client-side signals (tab switches, focus loss) are recorded as audit telemetry for instructor review, never triggering automated disqualification.
