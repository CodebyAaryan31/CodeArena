import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone, timedelta

from app.main import app
from app.db.models.user import UserRole


@pytest.mark.asyncio
async def test_full_assessment_e2e_lifecycle(client: AsyncClient, teacher_tokens: dict, student_tokens: dict):
    teacher_headers = {"Authorization": f"Bearer {teacher_tokens['access_token']}"}
    student_headers = {"Authorization": f"Bearer {student_tokens['access_token']}"}


    # STEP 1: Teacher creates coding problem
    problem_payload = {
        "title": "Sum of Two Numbers E2E",
        "description": "Read two integers and print their sum.",
        "input_format": "Two space-separated integers A and B.",
        "output_format": "Single integer A + B.",
        "constraints": "-1000 <= A, B <= 1000",
        "example_input": "3 5\n",
        "example_output": "8\n",
        "reference_solution": "import sys\nline = sys.stdin.read().split()\nif line:\n    print(int(line[0]) + int(line[1]))\n",
        "reference_solution_language": "python",
        "difficulty": "easy",
        "topic": "Math",
        "time_limit_ms": 2000,
        "memory_limit_mb": 256,
        "starter_codes": [
            {"language": "python", "code": "# Solve here\nimport sys\n"}
        ],
        "test_cases": [
            {
                "input_data": "3 5\n",
                "expected_output": "8\n",
                "is_hidden": False,
                "weight": 10.0,
                "order_index": 0,
            },
            {
                "input_data": "100 250\n",
                "expected_output": "350\n",
                "is_hidden": True,
                "weight": 20.0,
                "order_index": 1,
            },
        ],
    }

    prob_res = await client.post("/api/coding-problems/", json=problem_payload, headers=teacher_headers)
    assert prob_res.status_code == 201, prob_res.text
    problem = prob_res.json()
    problem_id = problem["id"]
    assert len(problem["test_cases"]) == 2
    assert problem["reference_solution"] is not None

    # STEP 2: Teacher validates reference solution
    val_res = await client.post(f"/api/coding-problems/{problem_id}/validate", headers=teacher_headers)
    assert val_res.status_code == 200, val_res.text
    val_data = val_res.json()
    assert val_data["all_passed"] is True
    assert val_data["passed_tests"] == 2

    # STEP 3: Teacher creates assessment with the coding problem
    now = datetime.now(timezone.utc)
    assessment_payload = {
        "title": "Final Algorithms Examination 2026",
        "description": "Comprehensive practical coding test.",
        "duration_minutes": 60,
        "pass_percentage": 50.0,
        "max_attempts": 1,
        "start_time": (now - timedelta(minutes=5)).isoformat(),
        "end_time": (now + timedelta(hours=2)).isoformat(),
        "questions": [
            {
                "problem_id": problem_id,
                "points": 30.0,
                "order_index": 0,
            }
        ],
    }

    assess_res = await client.post("/api/assessments/", json=assessment_payload, headers=teacher_headers)
    assert assess_res.status_code == 201, assess_res.text
    assessment = assess_res.json()
    assessment_id = assessment["id"]
    assert assessment["state"] == "draft"

    # STEP 4: Teacher publishes assessment
    pub_res = await client.post(f"/api/assessments/{assessment_id}/publish", headers=teacher_headers)
    assert pub_res.status_code == 200, pub_res.text
    published_assessment = pub_res.json()
    assert published_assessment["state"] == "published"
    assert published_assessment["is_open"] is True

    # STEP 5: Student discovers the published assessment
    stud_list_res = await client.get("/api/assessments/", headers=student_headers)
    assert stud_list_res.status_code == 200
    stud_assessments = stud_list_res.json()
    target_assessment = next((a for a in stud_assessments if a["id"] == assessment_id), None)
    assert target_assessment is not None
    assert target_assessment["title"] == "Final Algorithms Examination 2026"

    # STEP 6: Student starts an attempt
    attempt_res = await client.post("/api/attempts/", json={"assessment_id": assessment_id}, headers=student_headers)
    assert attempt_res.status_code == 201, attempt_res.text
    attempt = attempt_res.json()
    attempt_id = attempt["id"]
    assert attempt["status"] == "in_progress"
    assert len(attempt["answers"]) == 1

    # STEP 7: Verify hidden test case privacy for student
    prob_student_view = await client.get(f"/api/coding-problems/{problem_id}", headers=student_headers)
    assert prob_student_view.status_code == 200
    prob_data = prob_student_view.json()
    assert prob_data["reference_solution"] is None  # Never leaked
    hidden_tcs = [tc for tc in prob_data["test_cases"] if tc["is_hidden"]]
    assert len(hidden_tcs) == 1
    assert hidden_tcs[0]["input_data"] is None  # Stripped for student privacy
    assert hidden_tcs[0]["expected_output"] is None

    # STEP 8: Student records browser integrity signals
    sig1_res = await client.post(
        f"/api/attempts/{attempt_id}/integrity-events",
        json={"event_type": "fullscreen_exit", "details": "User exited fullscreen view"},
        headers=student_headers,
    )
    assert sig1_res.status_code == 201

    sig2_res = await client.post(
        f"/api/attempts/{attempt_id}/integrity-events",
        json={"event_type": "window_blur", "details": "Window blur event detected"},
        headers=student_headers,
    )
    assert sig2_res.status_code == 201

    # STEP 9: Student runs sample tests on public test case
    quick_res = await client.post(
        "/api/submissions/run",
        json={
            "problem_id": problem_id,
            "language": "python",
            "source_code": "import sys\nline = sys.stdin.read().split()\nif line:\n    print(int(line[0]) + int(line[1]))\n",
        },
        headers=student_headers,
    )
    assert quick_res.status_code == 200, quick_res.text
    assert quick_res.json()["overall_verdict"] == "accepted"

    # STEP 10: Student submits code for grading against all tests
    sub_res = await client.post(
        "/api/submissions/",
        json={
            "problem_id": problem_id,
            "language": "python",
            "source_code": "import sys\nline = sys.stdin.read().split()\nif line:\n    print(int(line[0]) + int(line[1]))\n",
            "attempt_id": attempt_id,
        },
        headers=student_headers,
    )
    assert sub_res.status_code == 201, sub_res.text
    sub_data = sub_res.json()
    assert sub_data["verdict"] == "accepted"
    assert sub_data["score"] == 100.0

    # Student submission history check
    hist_res = await client.get(f"/api/submissions/?attempt_id={attempt_id}", headers=student_headers)
    assert hist_res.status_code == 200
    assert len(hist_res.json()) >= 1

    # STEP 11: Student submits attempt
    submit_res = await client.post(f"/api/attempts/{attempt_id}/submit", headers=student_headers)
    assert submit_res.status_code == 200, submit_res.text
    submitted_att = submit_res.json()
    assert submitted_att["status"] == "submitted"
    # Before results release, total_score should be hidden from student
    assert submitted_att["total_score"] is None
    assert submitted_att["passed"] is None

    # Leaderboard before release should be empty for students
    lb_before = await client.get(f"/api/analytics/leaderboard/{assessment_id}", headers=student_headers)
    assert lb_before.status_code == 200
    assert lb_before.json() == []

    # STEP 12: Teacher reviews submissions & views recorded integrity signals
    teach_review_res = await client.get(
        f"/api/reviews/submissions?assessment_id={assessment_id}", headers=teacher_headers
    )
    assert teach_review_res.status_code == 200
    teach_subs = teach_review_res.json()
    assert len(teach_subs) == 1
    target_sub = teach_subs[0]
    assert target_sub["attempt_id"] == attempt_id
    assert target_sub["integrity_events_count"] == 2  # Both signals recorded!

    # Teacher inspects attempt details and verifies integrity event logs
    att_detail_res = await client.get(f"/api/attempts/{attempt_id}", headers=teacher_headers)
    assert att_detail_res.status_code == 200
    att_detail = att_detail_res.json()
    assert len(att_detail["integrity_events"]) == 2
    event_types = [ev["event_type"] for ev in att_detail["integrity_events"]]
    assert "fullscreen_exit" in event_types
    assert "window_blur" in event_types

    # STEP 13: Teacher overrides score with an audit reason
    override_res = await client.post(
        "/api/reviews/override-score",
        json={
            "attempt_id": attempt_id,
            "new_score": 28.0,
            "reason": "Deducted 2 marks due to recorded integrity signals during session",
        },
        headers=teacher_headers,
    )
    assert override_res.status_code == 200, override_res.text
    assert override_res.json()["new_score"] == 28.0

    # STEP 14: Teacher releases results
    rel_res = await client.post(
        "/api/reviews/release-results",
        json={"assessment_id": assessment_id, "release": True},
        headers=teacher_headers,
    )
    assert rel_res.status_code == 200
    assert rel_res.json()["results_released"] is True

    # STEP 15: Student now sees their released score and leaderboard
    stud_att_after = await client.get(f"/api/attempts/{attempt_id}", headers=student_headers)
    assert stud_att_after.status_code == 200
    released_data = stud_att_after.json()
    assert released_data["total_score"] == 28.0
    assert released_data["passed"] is True

    # Leaderboard after release now includes the entry
    lb_after = await client.get(f"/api/analytics/leaderboard/{assessment_id}", headers=student_headers)
    assert lb_after.status_code == 200
    entries = lb_after.json()
    assert len(entries) == 1
    assert entries[0]["score"] == 28.0
    assert entries[0]["rank"] == 1
