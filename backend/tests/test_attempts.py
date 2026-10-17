import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_student_attempt_flow(client: AsyncClient, teacher_tokens, student_tokens):
    teacher_headers = {"Authorization": f"Bearer {teacher_tokens['access_token']}"}
    student_headers = {"Authorization": f"Bearer {student_tokens['access_token']}"}

    # 1. Teacher creates assessment with 1 MCQ and 1 Coding question
    q_resp = await client.post(
        "/api/questions/",
        headers=teacher_headers,
        json={
            "title": "Which keyword defines a function in Python?",
            "prompt": "Select one",
            "type": "single_mcq",
            "difficulty": "easy",
            "options": [
                {"text": "func", "is_correct": False, "order_index": 0},
                {"text": "def", "is_correct": True, "order_index": 1},
                {"text": "fn", "is_correct": False, "order_index": 2},
            ],
        },
    )
    assert q_resp.status_code == 201
    q_data = q_resp.json()
    q_id = q_data["id"]
    correct_opt_id = next(o["id"] for o in q_data["options"] if o["is_correct"])

    # Create assessment
    ass_resp = await client.post(
        "/api/assessments/",
        headers=teacher_headers,
        json={
            "title": "Python Quiz 1",
            "duration_minutes": 45,
            "pass_percentage": 50.0,
            "max_attempts": 1,
            "questions": [
                {"question_id": q_id, "points": 10.0, "order_index": 0}
            ],
        },
    )
    assert ass_resp.status_code == 201
    ass_id = ass_resp.json()["id"]

    # Publish assessment
    pub_resp = await client.post(f"/api/assessments/{ass_id}/publish", headers=teacher_headers)
    assert pub_resp.status_code == 200

    # 2. Student starts attempt
    start_resp = await client.post(
        "/api/attempts/",
        headers=student_headers,
        json={"assessment_id": ass_id},
    )
    assert start_resp.status_code == 201
    att_data = start_resp.json()
    assert att_data["status"] == "in_progress"
    assert att_data["time_remaining_seconds"] > 0
    att_id = att_data["id"]
    aq_id = att_data["assessment"]["questions"][0]["id"]

    # 3. Student autosaves answer
    save_resp = await client.patch(
        f"/api/attempts/{att_id}/answers",
        headers=student_headers,
        json={
            "assessment_question_id": aq_id,
            "selected_option_ids": correct_opt_id,
            "is_flagged": False,
        },
    )
    assert save_resp.status_code == 200
    assert save_resp.json()["selected_option_ids"] == correct_opt_id

    # 4. Final submit
    sub_resp = await client.post(
        f"/api/attempts/{att_id}/submit",
        headers=student_headers,
    )
    assert sub_resp.status_code == 200
    sub_data = sub_resp.json()
    assert sub_data["status"] == "submitted"

    # 5. Starting another attempt after reaching max_attempts (1) must fail
    second_start = await client.post(
        "/api/attempts/",
        headers=student_headers,
        json={"assessment_id": ass_id},
    )
    assert second_start.status_code == 400
