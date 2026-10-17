import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_teacher_review_and_audit(client: AsyncClient, teacher_tokens, student_tokens):
    teacher_headers = {"Authorization": f"Bearer {teacher_tokens['access_token']}"}
    student_headers = {"Authorization": f"Bearer {student_tokens['access_token']}"}

    # 1. Create question & assessment & attempt & submit
    q_resp = await client.post(
        "/api/questions/",
        headers=teacher_headers,
        json={
            "title": "Review Test Question",
            "prompt": "Test",
            "type": "single_mcq",
            "difficulty": "easy",
            "options": [{"text": "A", "is_correct": True}],
        },
    )
    q_id = q_resp.json()["id"]

    ass_resp = await client.post(
        "/api/assessments/",
        headers=teacher_headers,
        json={
            "title": "Review Assessment",
            "duration_minutes": 30,
            "questions": [{"question_id": q_id, "points": 100.0, "order_index": 0}],
        },
    )
    ass_id = ass_resp.json()["id"]
    await client.post(f"/api/assessments/{ass_id}/publish", headers=teacher_headers)

    start_resp = await client.post("/api/attempts/", headers=student_headers, json={"assessment_id": ass_id})
    att_id = start_resp.json()["id"]

    await client.post(f"/api/attempts/{att_id}/submit", headers=student_headers)

    # 2. Teacher views submissions list
    subs_resp = await client.get(f"/api/reviews/submissions?assessment_id={ass_id}", headers=teacher_headers)
    assert subs_resp.status_code == 200
    assert len(subs_resp.json()) >= 1

    # 3. Teacher overrides score with reason
    override_resp = await client.post(
        "/api/reviews/override-score",
        headers=teacher_headers,
        json={
            "attempt_id": att_id,
            "new_score": 95.0,
            "reason": "Bonus points for clear approach explanation",
        },
    )
    assert override_resp.status_code == 200
    assert override_resp.json()["new_score"] == 95.0
    audit_id = override_resp.json()["audit_id"]

    # 4. Check AuditLog entry was recorded
    audit_resp = await client.get(f"/api/reviews/audit-logs?target_id={att_id}", headers=teacher_headers)
    assert audit_resp.status_code == 200
    logs = audit_resp.json()
    assert any(log["id"] == audit_id and log["action"] == "score_override" for log in logs)

    # 5. Teacher releases results
    rel_resp = await client.post(
        "/api/reviews/release-results",
        headers=teacher_headers,
        json={"assessment_id": ass_id, "release": True},
    )
    assert rel_resp.status_code == 200
    assert rel_resp.json()["results_released"] is True

    # 6. Student views attempt: score is now visible because results are released!
    st_attempt = await client.get(f"/api/attempts/{att_id}", headers=student_headers)
    assert st_attempt.status_code == 200
    assert st_attempt.json()["total_score"] == 95.0
