"""
Client for communicating with the isolated CodeArena Runner service.
If runner service HTTP call fails or is not running, provides a direct internal execution
pipeline (respecting Docker / sandbox settings) so that assessments, test runs, and grading
operate seamlessly without blocking.
"""

import httpx
from typing import Dict, Any, List, Optional
from app.core.config import settings

import sys
from pathlib import Path

# Ensure project root is in sys.path for runner package access
root_dir = str(Path(__file__).resolve().parent.parent.parent.parent)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

try:
    from runner.runner_app import execute_subprocess, is_docker_available, ALLOW_LOCAL_SUBPROCESS
except ImportError:
    def is_docker_available() -> bool:
        return False
    ALLOW_LOCAL_SUBPROCESS = True
    def execute_subprocess(*args, **kwargs):
        raise RuntimeError("Runner execution engine unavailable")


async def run_single_code(
    language: str,
    source_code: str,
    stdin: str = "",
    expected_output: Optional[str] = None,
    time_limit_ms: int = 3000,
    memory_limit_mb: int = 256,
) -> Dict[str, Any]:
    url = f"{settings.RUNNER_BASE_URL}/run"
    payload = {
        "language": language,
        "source_code": source_code,
        "stdin": stdin,
        "expected_output": expected_output,
        "time_limit_ms": time_limit_ms,
        "memory_limit_mb": memory_limit_mb,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                url,
                json=payload,
                headers={"X-Runner-Key": settings.RUNNER_API_KEY},
            )
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        pass

    # Direct fallback if runner microservice isn't running separately
    docker_ready = is_docker_available()
    if not docker_ready and not ALLOW_LOCAL_SUBPROCESS:
        return {
            "status": "runner_unavailable",
            "verdict": "runner_unavailable",
            "stderr": "Docker execution runner is unavailable.",
            "exit_code": 503,
            "passed": False,
        }

    res = execute_subprocess(
        language=language,
        source_code=source_code,
        stdin=stdin,
        time_limit_ms=time_limit_ms,
        expected_output=expected_output,
    )
    return res.model_dump()


async def run_batch_code(
    language: str,
    source_code: str,
    test_cases: List[Dict[str, Any]],
    time_limit_ms: int = 3000,
    memory_limit_mb: int = 256,
) -> Dict[str, Any]:
    url = f"{settings.RUNNER_BASE_URL}/batch"
    payload = {
        "language": language,
        "source_code": source_code,
        "test_cases": test_cases,
        "time_limit_ms": time_limit_ms,
        "memory_limit_mb": memory_limit_mb,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                url,
                json=payload,
                headers={"X-Runner-Key": settings.RUNNER_API_KEY},
            )
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        pass

    # Fallback to direct execution
    results = []
    total_score = 0.0
    max_score = sum(tc.get("weight", 1.0) for tc in test_cases)
    first_failing_verdict = None

    docker_ready = is_docker_available()
    if not docker_ready and not ALLOW_LOCAL_SUBPROCESS:
        return {
            "status": "runner_unavailable",
            "overall_verdict": "runner_unavailable",
            "total_score": 0.0,
            "max_score": max_score,
            "results": [
                {
                    "status": "runner_unavailable",
                    "verdict": "runner_unavailable",
                    "stderr": "Runner unavailable.",
                    "passed": False,
                }
                for _ in test_cases
            ],
        }

    for tc in test_cases:
        res = execute_subprocess(
            language=language,
            source_code=source_code,
            stdin=tc.get("input_data", ""),
            time_limit_ms=time_limit_ms,
            expected_output=tc.get("expected_output"),
        )
        res_dict = res.model_dump()
        results.append(res_dict)
        if res.passed:
            total_score += tc.get("weight", 1.0)
        elif not first_failing_verdict:
            first_failing_verdict = res.verdict

    overall = "accepted" if len(results) > 0 and all(r["passed"] for r in results) else (first_failing_verdict or "wrong_answer")

    return {
        "status": "ok",
        "overall_verdict": overall,
        "total_score": total_score,
        "max_score": max_score,
        "results": results,
    }
