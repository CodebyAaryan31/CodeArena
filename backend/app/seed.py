"""
Database seeder — creates default accounts with realistic Indian names,
question bank, coding problems, and sample assessments for local development
and live college hackathon demonstrations.
Run: python -m app.seed
"""

import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from app.db.session import AsyncSessionLocal, engine, Base
import app.db.models as models
from app.core.security import hash_password


SEED_USERS = [
    # Teachers
    {
        "email": "priya.sharma@codearena.dev",
        "full_name": "Prof. Priya Sharma",
        "password": "Teacher1234",
        "role": models.UserRole.teacher,
    },
    {
        "email": "rahul.verma@codearena.dev",
        "full_name": "Dr. Rahul Verma",
        "password": "Teacher1234",
        "role": models.UserRole.teacher,
    },
    {
        "email": "neha.gupta@codearena.dev",
        "full_name": "Prof. Neha Gupta",
        "password": "Teacher1234",
        "role": models.UserRole.teacher,
    },
    {
        "email": "teacher@codearena.test",
        "full_name": "Prof. Priya Sharma",
        "password": "Teacher1234",
        "role": models.UserRole.teacher,
    },
    # Students
    {
        "email": "aaryan.patidar@codearena.dev",
        "full_name": "Aaryan Patidar",
        "password": "Student1234",
        "role": models.UserRole.student,
    },
    {
        "email": "riya.mehta@codearena.dev",
        "full_name": "Riya Mehta",
        "password": "Student1234",
        "role": models.UserRole.student,
    },
    {
        "email": "arjun.singh@codearena.dev",
        "full_name": "Arjun Singh",
        "password": "Student1234",
        "role": models.UserRole.student,
    },
    {
        "email": "ananya.patel@codearena.dev",
        "full_name": "Ananya Patel",
        "password": "Student1234",
        "role": models.UserRole.student,
    },
    {
        "email": "kavya.joshi@codearena.dev",
        "full_name": "Kavya Joshi",
        "password": "Student1234",
        "role": models.UserRole.student,
    },
    {
        "email": "aditya.sharma@codearena.dev",
        "full_name": "Aditya Sharma",
        "password": "Student1234",
        "role": models.UserRole.student,
    },
    {
        "email": "ishita.verma@codearena.dev",
        "full_name": "Ishita Verma",
        "password": "Student1234",
        "role": models.UserRole.student,
    },
    {
        "email": "rohit.kumar@codearena.dev",
        "full_name": "Rohit Kumar",
        "password": "Student1234",
        "role": models.UserRole.student,
    },
    {
        "email": "sneha.agarwal@codearena.dev",
        "full_name": "Sneha Agarwal",
        "password": "Student1234",
        "role": models.UserRole.student,
    },
    {
        "email": "vikram.yadav@codearena.dev",
        "full_name": "Vikram Yadav",
        "password": "Student1234",
        "role": models.UserRole.student,
    },
    {
        "email": "student@codearena.test",
        "full_name": "Aaryan Patidar",
        "password": "Student1234",
        "role": models.UserRole.student,
    },
]

QUESTIONS_DATA = [
    {
        "title": "Time Complexity of Binary Search",
        "prompt": "What is the worst-case time complexity of searching in a sorted array of size $n$ using Binary Search?",
        "type": models.QuestionType.single_mcq,
        "difficulty": models.Difficulty.easy,
        "topic": "Algorithms",
        "tags": "searching,complexity,arrays",
        "solution_explanation": "Binary search divides the search space in half at each step, yielding O(log n) time.",
        "options": [
            {"text": "O(1)", "is_correct": False, "order_index": 0},
            {"text": "O(log n)", "is_correct": True, "order_index": 1},
            {"text": "O(n)", "is_correct": False, "order_index": 2},
            {"text": "O(n log n)", "is_correct": False, "order_index": 3},
        ],
    },
    {
        "title": "Properties of Hash Tables",
        "prompt": "Which of the following statements about open-addressing hash tables are TRUE?",
        "type": models.QuestionType.multi_mcq,
        "difficulty": models.Difficulty.medium,
        "topic": "Data Structures",
        "tags": "hash-table,collisions",
        "solution_explanation": "In open addressing, all elements are stored directly in the hash table array without separate linked lists. Deleted slots typically require a tombstone/sentinel.",
        "options": [
            {"text": "All elements reside directly within the hash table slots.", "is_correct": True, "order_index": 0},
            {"text": "Collisions are resolved by chaining elements into external linked lists.", "is_correct": False, "order_index": 1},
            {"text": "Deleted keys require special tombstone markers to maintain probe sequences.", "is_correct": True, "order_index": 2},
            {"text": "Load factor cannot exceed 1.0.", "is_correct": True, "order_index": 3},
        ],
    },
    {
        "title": "Python Scope Output Prediction",
        "prompt": "What will be printed when this Python code executes?\n\n```python\nx = 10\ndef foo():\n    global x\n    x += 5\nfoo()\nprint(x)\n```",
        "type": models.QuestionType.output_prediction,
        "difficulty": models.Difficulty.easy,
        "topic": "Python",
        "tags": "python,scoping",
        "solution_explanation": "15",
        "options": [],
    },
    {
        "title": "Fix the Off-By-One Loop",
        "prompt": "Identify the logical error in this range calculation intended to include numbers from 1 up to $N$ inclusive:\n\n```python\ndef sum_to_n(n):\n    total = 0\n    for i in range(1, n):\n        total += i\n    return total\n```\nWhat should `range(1, n)` be replaced with?",
        "type": models.QuestionType.debugging,
        "difficulty": models.Difficulty.easy,
        "topic": "Python",
        "tags": "debugging,loops",
        "solution_explanation": "range(1, n + 1)",
        "options": [
            {"text": "range(1, n + 1)", "is_correct": True, "order_index": 0},
            {"text": "range(0, n)", "is_correct": False, "order_index": 1},
            {"text": "range(1, n - 1)", "is_correct": False, "order_index": 2},
        ],
    },
]

PROBLEMS_DATA = [
    {
        "title": "Sum of Two Numbers",
        "description": "Read two integers and print their sum.",
        "input_format": "A single line containing two space-separated integers $a$ and $b$.",
        "output_format": "Print a single integer: the sum of $a$ and $b$.",
        "constraints": "-10^9 <= a, b <= 10^9",
        "example_input": "5 7",
        "example_output": "12",
        "difficulty": models.Difficulty.easy,
        "topic": "Basic Arithmetic",
        "tags": "math,introductory",
        "time_limit_ms": 2000,
        "memory_limit_mb": 256,
        "reference_solution_language": "python",
        "reference_solution": "import sys\ndata = sys.stdin.read().split()\nif data:\n    print(int(data[0]) + int(data[1]))\n",
        "starter_codes": [
            {
                "language": "python",
                "code": "import sys\n\ndef solve():\n    data = sys.stdin.read().split()\n    if not data:\n        return\n    a, b = int(data[0]), int(data[1])\n    # TODO: compute and print sum\n    print(a + b)\n\nif __name__ == '__main__':\n    solve()\n",
            },
            {
                "language": "cpp",
                "code": "#include <iostream>\nusing namespace std;\n\nint main() {\n    long long a, b;\n    if (cin >> a >> b) {\n        cout << (a + b) << endl;\n    }\n    return 0;\n}\n",
            },
        ],
        "test_cases": [
            {
                "input_data": "5 7\n",
                "expected_output": "12\n",
                "is_hidden": False,
                "weight": 20.0,
                "order_index": 0,
                "explanation": "5 + 7 = 12",
            },
            {
                "input_data": "10 -3\n",
                "expected_output": "7\n",
                "is_hidden": False,
                "weight": 20.0,
                "order_index": 1,
                "explanation": "10 + (-3) = 7",
            },
            {
                "input_data": "0 0\n",
                "expected_output": "0\n",
                "is_hidden": True,
                "weight": 20.0,
                "order_index": 2,
                "explanation": "Zero identity",
            },
            {
                "input_data": "-15 -25\n",
                "expected_output": "-40\n",
                "is_hidden": True,
                "weight": 20.0,
                "order_index": 3,
                "explanation": "Both negative numbers",
            },
            {
                "input_data": "1000000 2000000\n",
                "expected_output": "3000000\n",
                "is_hidden": True,
                "weight": 20.0,
                "order_index": 4,
                "explanation": "Larger magnitude addition",
            },
        ],
    },
    {
        "title": "Even or Odd",
        "description": "Read an integer and print Even if it is divisible by two, otherwise print Odd.",
        "input_format": "A single integer $n$.",
        "output_format": "Print Even or Odd.",
        "constraints": "-10^9 <= n <= 10^9",
        "example_input": "9",
        "example_output": "Odd",
        "difficulty": models.Difficulty.easy,
        "topic": "Conditionals",
        "tags": "math,control-flow",
        "time_limit_ms": 2000,
        "memory_limit_mb": 256,
        "reference_solution_language": "python",
        "reference_solution": "import sys\ndata = sys.stdin.read().split()\nif data:\n    n = int(data[0])\n    print('Even' if n % 2 == 0 else 'Odd')\n",
        "starter_codes": [
            {
                "language": "python",
                "code": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    if not data:\n        return\n    n = int(data[0])\n    # TODO: Print Even or Odd\n    if n % 2 == 0:\n        print('Even')\n    else:\n        print('Odd')\n\nif __name__ == '__main__':\n    main()\n",
            }
        ],
        "test_cases": [
            {
                "input_data": "9\n",
                "expected_output": "Odd\n",
                "is_hidden": False,
                "weight": 25.0,
                "order_index": 0,
            },
            {
                "input_data": "4\n",
                "expected_output": "Even\n",
                "is_hidden": False,
                "weight": 25.0,
                "order_index": 1,
            },
            {
                "input_data": "0\n",
                "expected_output": "Even\n",
                "is_hidden": True,
                "weight": 25.0,
                "order_index": 2,
            },
            {
                "input_data": "-7\n",
                "expected_output": "Odd\n",
                "is_hidden": True,
                "weight": 25.0,
                "order_index": 3,
            },
        ],
    },
    {
        "title": "Find the Largest Number",
        "description": "Read three integers and print the largest.",
        "input_format": "Three space-separated integers $a$, $b$, and $c$.",
        "output_format": "The maximum integer among the three.",
        "constraints": "-10^9 <= a, b, c <= 10^9",
        "example_input": "12 28 19",
        "example_output": "28",
        "difficulty": models.Difficulty.easy,
        "topic": "Conditionals",
        "tags": "logic,comparison",
        "time_limit_ms": 2000,
        "memory_limit_mb": 256,
        "reference_solution_language": "python",
        "reference_solution": "import sys\ndata = sys.stdin.read().split()\nif data:\n    nums = [int(x) for x in data[:3]]\n    print(max(nums))\n",
        "starter_codes": [
            {
                "language": "python",
                "code": "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    if not data:\n        return\n    nums = [int(x) for x in data[:3]]\n    print(max(nums))\n\nif __name__ == '__main__':\n    main()\n",
            }
        ],
        "test_cases": [
            {
                "input_data": "12 28 19\n",
                "expected_output": "28\n",
                "is_hidden": False,
                "weight": 30.0,
                "order_index": 0,
            },
            {
                "input_data": "5 5 1\n",
                "expected_output": "5\n",
                "is_hidden": False,
                "weight": 30.0,
                "order_index": 1,
            },
            {
                "input_data": "-10 -5 -20\n",
                "expected_output": "-5\n",
                "is_hidden": True,
                "weight": 20.0,
                "order_index": 2,
            },
            {
                "input_data": "100 20 30\n",
                "expected_output": "100\n",
                "is_hidden": True,
                "weight": 20.0,
                "order_index": 3,
            },
        ],
    },
    {
        "title": "Two Sum",
        "description": "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.",
        "input_format": "First line contains $N$ and target $T$. Second line contains $N$ space-separated integers.",
        "output_format": "Print the zero-based indices separated by a space in ascending order.",
        "constraints": "2 <= N <= 10^4, -10^9 <= nums[i], target <= 10^9",
        "example_input": "4 9\n2 7 11 15",
        "example_output": "0 1",
        "difficulty": models.Difficulty.easy,
        "topic": "Algorithms",
        "tags": "arrays,hash-map",
        "time_limit_ms": 2000,
        "memory_limit_mb": 256,
        "reference_solution_language": "python",
        "reference_solution": "import sys\ndef solve():\n    lines = sys.stdin.read().split()\n    if not lines: return\n    n, target = int(lines[0]), int(lines[1])\n    nums = [int(x) for x in lines[2:2+n]]\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            print(f'{seen[diff]} {i}')\n            return\n        seen[num] = i\nsolve()\n",
        "starter_codes": [
            {
                "language": "python",
                "code": "import sys\n\ndef two_sum():\n    lines = sys.stdin.read().split()\n    if not lines:\n        return\n    n, target = int(lines[0]), int(lines[1])\n    nums = [int(x) for x in lines[2:2+n]]\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            print(f'{seen[diff]} {i}')\n            return\n        seen[num] = i\n\nif __name__ == '__main__':\n    two_sum()\n",
            }
        ],
        "test_cases": [
            {
                "input_data": "4 9\n2 7 11 15\n",
                "expected_output": "0 1\n",
                "is_hidden": False,
                "weight": 20.0,
                "order_index": 0,
            },
            {
                "input_data": "3 6\n3 2 4\n",
                "expected_output": "1 2\n",
                "is_hidden": False,
                "weight": 20.0,
                "order_index": 1,
            },
            {
                "input_data": "2 6\n3 3\n",
                "expected_output": "0 1\n",
                "is_hidden": True,
                "weight": 30.0,
                "order_index": 2,
            },
            {
                "input_data": "5 0\n-3 4 3 90 -4\n",
                "expected_output": "0 2\n",
                "is_hidden": True,
                "weight": 30.0,
                "order_index": 3,
            },
        ],
    },
]


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # 1. Seed Users
        user_by_email = {}
        for u in SEED_USERS:
            res = await db.execute(select(models.User).where(models.User.email == u["email"]))
            existing = res.scalar_one_or_none()
            if existing:
                user_by_email[u["email"]] = existing
            else:
                user = models.User(
                    email=u["email"],
                    full_name=u["full_name"],
                    hashed_password=hash_password(u["password"]),
                    role=u["role"],
                )
                db.add(user)
                await db.flush()
                user_by_email[u["email"]] = user
                print(f"  [seed user] Created {u['role'].value}: {u['full_name']} ({u['email']})")

        primary_teacher = user_by_email.get("priya.sharma@codearena.dev") or user_by_email["teacher@codearena.test"]
        primary_student = user_by_email.get("aaryan.patidar@codearena.dev") or user_by_email["student@codearena.test"]

        # 2. Seed Questions
        created_questions = []
        for q_data in QUESTIONS_DATA:
            res = await db.execute(select(models.Question).where(models.Question.title == q_data["title"]))
            q_exist = res.scalar_one_or_none()
            if q_exist:
                created_questions.append(q_exist)
            else:
                q = models.Question(
                    creator_id=primary_teacher.id,
                    title=q_data["title"],
                    prompt=q_data["prompt"],
                    type=q_data["type"],
                    difficulty=q_data["difficulty"],
                    topic=q_data["topic"],
                    tags=q_data.get("tags"),
                    solution_explanation=q_data.get("solution_explanation"),
                )
                db.add(q)
                await db.flush()
                for opt in q_data.get("options", []):
                    db.add(
                        models.QuestionOption(
                            question_id=q.id,
                            text=opt["text"],
                            is_correct=opt["is_correct"],
                            order_index=opt["order_index"],
                        )
                    )
                created_questions.append(q)
                print(f"  [seed question] {q.title}")

        # 3. Seed Coding Problems
        created_problems = {}
        for p_data in PROBLEMS_DATA:
            res = await db.execute(select(models.CodingProblem).where(models.CodingProblem.title == p_data["title"]))
            p_exist = res.scalar_one_or_none()
            if p_exist:
                created_problems[p_data["title"]] = p_exist
            else:
                p = models.CodingProblem(
                    creator_id=primary_teacher.id,
                    title=p_data["title"],
                    description=p_data["description"],
                    input_format=p_data.get("input_format"),
                    output_format=p_data.get("output_format"),
                    constraints=p_data.get("constraints"),
                    example_input=p_data.get("example_input"),
                    example_output=p_data.get("example_output"),
                    reference_solution=p_data.get("reference_solution"),
                    reference_solution_language=p_data.get("reference_solution_language"),
                    difficulty=p_data["difficulty"],
                    topic=p_data["topic"],
                    tags=p_data.get("tags"),
                    time_limit_ms=p_data.get("time_limit_ms", 2000),
                    memory_limit_mb=p_data.get("memory_limit_mb", 256),
                )
                db.add(p)
                await db.flush()

                for sc in p_data.get("starter_codes", []):
                    db.add(models.StarterCode(problem_id=p.id, language=sc["language"], code=sc["code"]))

                for tc in p_data.get("test_cases", []):
                    db.add(
                        models.TestCase(
                            problem_id=p.id,
                            input_data=tc["input_data"],
                            expected_output=tc["expected_output"],
                            is_hidden=tc["is_hidden"],
                            weight=tc["weight"],
                            order_index=tc["order_index"],
                            explanation=tc.get("explanation"),
                        )
                    )
                created_problems[p_data["title"]] = p
                print(f"  [seed problem] {p.title}")

        # 4. Seed Assessment 1: CS 101 Midterm
        res = await db.execute(select(models.Assessment).where(models.Assessment.title == "CS 101: Midterm Assessment"))
        ass1_exist = res.scalar_one_or_none()
        if not ass1_exist:
            assessment = models.Assessment(
                title="CS 101: Midterm Assessment",
                description="Comprehensive evaluation covering Algorithms, Complexity, Data Structures, and Two Sum implementation.",
                teacher_id=primary_teacher.id,
                state=models.AssessmentState.published,
                duration_minutes=90,
                pass_percentage=60.0,
                start_time=datetime.now(timezone.utc) - timedelta(days=1),
                end_time=datetime.now(timezone.utc) + timedelta(days=14),
                max_attempts=2,
                results_released=True,
            )
            db.add(assessment)
            await db.flush()

            order = 0
            for q in created_questions:
                db.add(models.AssessmentQuestion(assessment_id=assessment.id, question_id=q.id, order_index=order, points=10.0))
                order += 1
            if "Two Sum" in created_problems:
                db.add(models.AssessmentQuestion(assessment_id=assessment.id, problem_id=created_problems["Two Sum"].id, order_index=order, points=30.0))
            print(f"  [seed assessment] {assessment.title} (published)")

        # 5. Seed Assessment 2: CS 102 Programming Fundamentals
        res2 = await db.execute(select(models.Assessment).where(models.Assessment.title == "CS 102: Programming Fundamentals"))
        ass2_exist = res2.scalar_one_or_none()
        if not ass2_exist:
            assessment2 = models.Assessment(
                title="CS 102: Programming Fundamentals",
                description="Practical coding assessment evaluating basic arithmetic, conditionals, and standard I/O processing.",
                teacher_id=primary_teacher.id,
                state=models.AssessmentState.published,
                duration_minutes=60,
                pass_percentage=50.0,
                start_time=datetime.now(timezone.utc) - timedelta(hours=2),
                end_time=datetime.now(timezone.utc) + timedelta(days=7),
                max_attempts=3,
                results_released=True,
            )
            db.add(assessment2)
            await db.flush()

            order = 0
            if "Sum of Two Numbers" in created_problems:
                db.add(models.AssessmentQuestion(assessment_id=assessment2.id, problem_id=created_problems["Sum of Two Numbers"].id, order_index=order, points=50.0))
                order += 1
            if "Even or Odd" in created_problems:
                db.add(models.AssessmentQuestion(assessment_id=assessment2.id, problem_id=created_problems["Even or Odd"].id, order_index=order, points=50.0))
                order += 1
            print(f"  [seed assessment] {assessment2.title} (published)")

        await db.commit()
    print("\n[OK] Seed complete with realistic Indian names and demo problems!")


if __name__ == "__main__":
    asyncio.run(seed())
