import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_code_execution_and_grading(client: AsyncClient, teacher_tokens, student_tokens):
    teacher_headers = {"Authorization": f"Bearer {teacher_tokens['access_token']}"}
    student_headers = {"Authorization": f"Bearer {student_tokens['access_token']}"}

    # 1. Create a coding problem
    create_resp = await client.post(
        "/api/coding-problems/",
        headers=teacher_headers,
        json={
            "title": "Add Two",
            "description": "Add two numbers from stdin",
            "difficulty": "easy",
            "topic": "Math",
            "test_cases": [
                {"input_data": "2 3\n", "expected_output": "5\n", "is_hidden": False, "weight": 1.0},
                {"input_data": "10 20\n", "expected_output": "30\n", "is_hidden": True, "weight": 1.0},
            ],
        },
    )
    assert create_resp.status_code == 201
    prob_id = create_resp.json()["id"]

    # 2. Quick run sample tests (correct solution)
    correct_code = "import sys\na, b = map(int, sys.stdin.read().split())\nprint(a + b)"
    quick_run_resp = await client.post(
        "/api/submissions/run",
        headers=student_headers,
        json={
            "problem_id": prob_id,
            "language": "python",
            "source_code": correct_code,
        },
    )
    assert quick_run_resp.status_code == 200
    qr_data = quick_run_resp.json()
    assert qr_data["overall_verdict"] == "accepted"
    assert len(qr_data["results"]) == 1
    assert qr_data["results"][0]["passed"] is True
    assert qr_data["results"][0]["actual_output"].strip() == "5"

    # 3. Quick run sample tests (wrong solution)
    wrong_code = "print(999)"
    quick_wrong = await client.post(
        "/api/submissions/run",
        headers=student_headers,
        json={
            "problem_id": prob_id,
            "language": "python",
            "source_code": wrong_code,
        },
    )
    assert quick_wrong.status_code == 200
    assert quick_wrong.json()["overall_verdict"] == "wrong_answer"

    # 4. Full submission grading
    sub_resp = await client.post(
        "/api/submissions/",
        headers=student_headers,
        json={
            "problem_id": prob_id,
            "language": "python",
            "source_code": correct_code,
        },
    )
    assert sub_resp.status_code == 201
    sub_data = sub_resp.json()
    assert sub_data["verdict"] == "accepted"
    assert sub_data["score"] == 100.0
    assert sub_data["status"] == "evaluated"
    assert len(sub_data["test_results"]) == 2

    # Verify student does NOT see hidden test actual output
    hidden_tr = next(tr for tr in sub_data["test_results"] if tr["is_hidden"])
    assert hidden_tr["passed"] is True
    assert hidden_tr["actual_output"] is None
