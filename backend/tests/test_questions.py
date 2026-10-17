import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_question_bank_and_privacy(client: AsyncClient, teacher_tokens, student_tokens):
    teacher_headers = {"Authorization": f"Bearer {teacher_tokens['access_token']}"}
    student_headers = {"Authorization": f"Bearer {student_tokens['access_token']}"}

    # 1. Student cannot create question (403)
    create_fail = await client.post(
        "/api/questions/",
        headers=student_headers,
        json={
            "title": "Student question",
            "prompt": "Test",
            "type": "single_mcq",
            "difficulty": "easy",
            "options": [{"text": "A", "is_correct": True}],
        },
    )
    assert create_fail.status_code == 403

    # 2. Teacher creates question
    create_resp = await client.post(
        "/api/questions/",
        headers=teacher_headers,
        json={
            "title": "Python List Append Complexity",
            "prompt": "What is the amortized time complexity of list.append in Python?",
            "type": "single_mcq",
            "difficulty": "easy",
            "topic": "Python",
            "tags": "python,data-structures",
            "solution_explanation": "List append is O(1) amortized due to dynamic array resizing.",
            "options": [
                {"text": "O(1)", "is_correct": True, "order_index": 0},
                {"text": "O(n)", "is_correct": False, "order_index": 1},
                {"text": "O(log n)", "is_correct": False, "order_index": 2},
            ],
        },
    )
    assert create_resp.status_code == 201
    q_data = create_resp.json()
    q_id = q_data["id"]

    # Teacher sees is_correct
    assert any(opt["is_correct"] is True for opt in q_data["options"])
    assert q_data["solution_explanation"] is not None

    # 3. Student views question: is_correct and solution_explanation MUST be None!
    student_view = await client.get(f"/api/questions/{q_id}", headers=student_headers)
    assert student_view.status_code == 200
    st_data = student_view.json()
    assert all(opt["is_correct"] is None for opt in st_data["options"])
    assert st_data["solution_explanation"] is None
