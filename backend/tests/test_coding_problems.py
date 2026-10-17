import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_coding_problem_and_hidden_test_privacy(
    client: AsyncClient, teacher_tokens, student_tokens
):
    teacher_headers = {"Authorization": f"Bearer {teacher_tokens['access_token']}"}
    student_headers = {"Authorization": f"Bearer {student_tokens['access_token']}"}

    # 1. Teacher creates coding problem with public and hidden test cases
    create_resp = await client.post(
        "/api/coding-problems/",
        headers=teacher_headers,
        json={
            "title": "Sum of Two Numbers",
            "description": "Read two integers separated by space and print their sum.",
            "difficulty": "easy",
            "topic": "Algorithms",
            "starter_codes": [
                {"language": "python", "code": "import sys\n\ndef solve():\n    pass\n"},
                {"language": "cpp", "code": "#include <iostream>\nusing namespace std;\nint main() { return 0; }\n"},
            ],
            "test_cases": [
                {
                    "input_data": "3 5",
                    "expected_output": "8",
                    "is_hidden": False,
                    "weight": 1.0,
                    "order_index": 0,
                    "explanation": "Sample test: 3 + 5 = 8",
                },
                {
                    "input_data": "100 200",
                    "expected_output": "300",
                    "is_hidden": True,
                    "weight": 2.0,
                    "order_index": 1,
                    "explanation": "Hidden test: 100 + 200 = 300",
                },
            ],
        },
    )
    assert create_resp.status_code == 201
    prob = create_resp.json()
    prob_id = prob["id"]

    # Teacher sees input and expected_output for all tests
    assert len(prob["test_cases"]) == 2
    hidden_tc_teacher = next(tc for tc in prob["test_cases"] if tc["is_hidden"])
    assert hidden_tc_teacher["input_data"] == "100 200"
    assert hidden_tc_teacher["expected_output"] == "300"

    # 2. Student views problem: hidden test input and output MUST be None!
    student_view = await client.get(f"/api/coding-problems/{prob_id}", headers=student_headers)
    assert student_view.status_code == 200
    st_prob = student_view.json()
    assert len(st_prob["test_cases"]) == 2

    # Public case still has inputs
    public_tc = next(tc for tc in st_prob["test_cases"] if not tc["is_hidden"])
    assert public_tc["input_data"] == "3 5"
    assert public_tc["expected_output"] == "8"

    # Hidden case MUST NOT have input_data or expected_output
    hidden_tc_student = next(tc for tc in st_prob["test_cases"] if tc["is_hidden"])
    assert hidden_tc_student["input_data"] is None
    assert hidden_tc_student["expected_output"] is None
    assert hidden_tc_student["explanation"] is None
