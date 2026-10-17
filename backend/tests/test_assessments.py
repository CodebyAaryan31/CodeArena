import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_teacher_assessment_crud(client: AsyncClient, teacher_tokens, student_tokens):
    teacher_headers = {"Authorization": f"Bearer {teacher_tokens['access_token']}"}
    student_headers = {"Authorization": f"Bearer {student_tokens['access_token']}"}

    # 1. Teacher creates draft assessment
    create_resp = await client.post(
        "/api/assessments/",
        headers=teacher_headers,
        json={
            "title": "Data Structures Midterm",
            "description": "Comprehensive midterm exam",
            "duration_minutes": 60,
            "pass_percentage": 50.0,
            "max_attempts": 1,
            "questions": [],
        },
    )
    assert create_resp.status_code == 201
    assessment = create_resp.json()
    assert assessment["title"] == "Data Structures Midterm"
    assert assessment["state"] == "draft"
    assessment_id = assessment["id"]

    # 2. Student cannot see draft assessment
    student_list = await client.get("/api/assessments/", headers=student_headers)
    assert student_list.status_code == 200
    assert not any(a["id"] == assessment_id for a in student_list.json())

    # 3. Publish validation failure: 0 questions
    pub_fail = await client.post(
        f"/api/assessments/{assessment_id}/publish",
        headers=teacher_headers,
    )
    assert pub_fail.status_code == 400

    # 4. Create a question and add it to assessment
    q_resp = await client.post(
        "/api/questions/",
        headers=teacher_headers,
        json={
            "title": "What is the time complexity of binary search?",
            "prompt": "Choose the best answer",
            "type": "single_mcq",
            "difficulty": "easy",
            "topic": "Algorithms",
            "options": [
                {"text": "O(1)", "is_correct": False, "order_index": 0},
                {"text": "O(log n)", "is_correct": True, "order_index": 1},
                {"text": "O(n)", "is_correct": False, "order_index": 2},
            ],
        },
    )
    assert q_resp.status_code == 201
    question_id = q_resp.json()["id"]

    # Update assessment with the question
    update_resp = await client.patch(
        f"/api/assessments/{assessment_id}",
        headers=teacher_headers,
        json={
            "questions": [
                {"question_id": question_id, "points": 10.0, "order_index": 0}
            ]
        },
    )
    assert update_resp.status_code == 200
    assert len(update_resp.json()["questions"]) == 1

    # 5. Publish succeeds
    pub_ok = await client.post(
        f"/api/assessments/{assessment_id}/publish",
        headers=teacher_headers,
    )
    assert pub_ok.status_code == 200
    assert pub_ok.json()["state"] == "published"

    # 6. Student can now see the published assessment
    student_list2 = await client.get("/api/assessments/", headers=student_headers)
    assert student_list2.status_code == 200
    assert any(a["id"] == assessment_id for a in student_list2.json())

    # 7. Duplicate assessment
    dup_resp = await client.post(
        f"/api/assessments/{assessment_id}/duplicate",
        headers=teacher_headers,
    )
    assert dup_resp.status_code == 200
    dup_data = dup_resp.json()
    assert "Copy" in dup_data["title"]
    assert dup_data["state"] == "draft"

    # 8. Archive assessment
    arch_resp = await client.post(
        f"/api/assessments/{assessment_id}/archive",
        headers=teacher_headers,
    )
    assert arch_resp.status_code == 200
    assert arch_resp.json()["state"] == "archived"


@pytest.mark.asyncio
async def test_assessment_publication_regression(client: AsyncClient, teacher_tokens, student_tokens):
    from datetime import datetime, timedelta, timezone

    teacher_headers = {"Authorization": f"Bearer {teacher_tokens['access_token']}"}
    student_headers = {"Authorization": f"Bearer {student_tokens['access_token']}"}

    # 1. Create a coding problem with 0 test cases
    prob_resp = await client.post(
        "/api/coding-problems/",
        headers=teacher_headers,
        json={
            "title": "Unfinished Problem Without Tests",
            "description": "Problem with zero test cases",
            "difficulty": "medium",
            "topic": "Algorithms",
            "starter_codes": [{"language": "python", "code": "def solve(): pass"}],
            "test_cases": [],
        },
    )
    assert prob_resp.status_code == 201
    prob_id = prob_resp.json()["id"]

    # 2. Create draft assessment referencing problem with 0 test cases
    draft_resp = await client.post(
        "/api/assessments/",
        headers=teacher_headers,
        json={
            "title": "Invalid Coding Contest",
            "description": "Testing publish rejection",
            "duration_minutes": 60,
            "questions": [{"problem_id": prob_id, "points": 20.0, "order_index": 0}],
        },
    )
    assert draft_resp.status_code == 201
    aid = draft_resp.json()["id"]

    # Publication should be rejected because problem has 0 test cases
    pub_err1 = await client.post(f"/api/assessments/{aid}/publish", headers=teacher_headers)
    assert pub_err1.status_code == 400
    assert "zero test cases" in pub_err1.json()["detail"].lower()

    # 3. Test negative points rejection
    await client.patch(
        f"/api/assessments/{aid}",
        headers=teacher_headers,
        json={"questions": [{"problem_id": prob_id, "points": -5.0, "order_index": 0}]},
    )
    pub_err2 = await client.post(f"/api/assessments/{aid}/publish", headers=teacher_headers)
    assert pub_err2.status_code == 400
    assert "positive point value" in pub_err2.json()["detail"].lower()

    # 4. Test inverted date range rejection
    now = datetime.now(timezone.utc)
    st = (now + timedelta(days=2)).isoformat()
    et = (now + timedelta(days=1)).isoformat()  # end before start
    await client.patch(
        f"/api/assessments/{aid}",
        headers=teacher_headers,
        json={"start_time": st, "end_time": et, "questions": [{"problem_id": prob_id, "points": 10.0, "order_index": 0}]},
    )
    pub_err3 = await client.post(f"/api/assessments/{aid}/publish", headers=teacher_headers)
    assert pub_err3.status_code == 400
    assert "strictly after" in pub_err3.json()["detail"].lower()

    # 5. Add a test case to the problem so it becomes valid
    await client.post(
        f"/api/coding-problems/{prob_id}/test-cases",
        headers=teacher_headers,
        json={"input_data": "5\n", "expected_output": "10\n", "is_hidden": False, "weight": 1.0},
    )

    # 6. Schedule assessment for the future (start_time 2 days from now)
    future_st = (now + timedelta(days=2)).isoformat()
    future_et = (now + timedelta(days=3)).isoformat()
    await client.patch(
        f"/api/assessments/{aid}",
        headers=teacher_headers,
        json={"start_time": future_st, "end_time": future_et},
    )
    sched_pub = await client.post(f"/api/assessments/{aid}/publish", headers=teacher_headers)
    assert sched_pub.status_code == 200, f"Failed publish: {sched_pub.text}"
    sched_data = sched_pub.json()
    assert sched_data["state"] == "scheduled"
    assert sched_data["is_upcoming"] is True
    assert sched_data["is_open"] is False

    # 7. Student can see scheduled assessment in listing
    s_list = await client.get("/api/assessments/", headers=student_headers)
    assert s_list.status_code == 200
    item = next((a for a in s_list.json() if a["id"] == aid), None)
    assert item is not None
    assert item["state"] == "scheduled"
    assert item["is_upcoming"] is True

    # 8. Student CANNOT start the scheduled assessment before start time
    start_err = await client.post(
        "/api/attempts/",
        headers=student_headers,
        json={"assessment_id": aid},
    )
    assert start_err.status_code == 400
    assert "not started yet" in start_err.json()["detail"].lower()

    # 9. Archive the assessment and verify it cannot be published directly
    await client.post(f"/api/assessments/{aid}/archive", headers=teacher_headers)
    arch_pub = await client.post(f"/api/assessments/{aid}/publish", headers=teacher_headers)
    assert arch_pub.status_code == 400
    assert "archived assessments cannot be published" in arch_pub.json()["detail"].lower()

