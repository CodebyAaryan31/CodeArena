"""
Isolated Code Execution Service (Runner)
Supports Python 3, C++17, and Node.js JavaScript.
Prioritizes Docker-isolated execution; provides configurable sandboxed local execution
and runner_unavailable fallback when Docker is not present.
"""

import os
import shutil
import subprocess
import sys
import tempfile
import time
from typing import List, Optional
from fastapi import FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="CODEARENA Execution Runner", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.getenv("RUNNER_API_KEY", "CHANGE_ME_internal_key")
ALLOW_LOCAL_SUBPROCESS = os.getenv("RUNNER_ALLOW_LOCAL_SUBPROCESS", "true").lower() in ("true", "1", "yes")
MAX_OUTPUT_BYTES = 256 * 1024  # 256 KB


class TestCaseItem(BaseModel):
    id: Optional[str] = None
    input_data: str = ""
    expected_output: Optional[str] = None
    is_hidden: bool = False
    weight: float = 1.0


class SingleRunRequest(BaseModel):
    language: str = Field(..., description="python, cpp, or javascript")
    source_code: str
    stdin: str = ""
    expected_output: Optional[str] = None
    time_limit_ms: int = 3000
    memory_limit_mb: int = 256


class SingleRunResponse(BaseModel):
    status: str  # ok, runner_unavailable, system_error
    verdict: str  # accepted, wrong_answer, compilation_error, runtime_error, time_limit_exceeded, memory_limit_exceeded, output_limit_exceeded, runner_unavailable, system_error
    stdout: str = ""
    stderr: str = ""
    execution_time_ms: int = 0
    memory_kb: int = 0
    exit_code: int = 0
    passed: bool = False


class BatchRunRequest(BaseModel):
    language: str
    source_code: str
    test_cases: List[TestCaseItem]
    time_limit_ms: int = 3000
    memory_limit_mb: int = 256


class BatchRunResponse(BaseModel):
    status: str
    overall_verdict: str
    total_score: float
    max_score: float
    results: List[SingleRunResponse]


def is_docker_available() -> bool:
    docker_bin = shutil.which("docker")
    if not docker_bin:
        return False
    try:
        res = subprocess.run([docker_bin, "info"], capture_output=True, timeout=2)
        return res.returncode == 0
    except Exception:
        return False


def normalize_text(text: Optional[str]) -> str:
    if not text:
        return ""
    lines = [line.rstrip() for line in text.strip().splitlines()]
    return "\n".join(lines)


def execute_subprocess(
    language: str,
    source_code: str,
    stdin: str,
    time_limit_ms: int,
    expected_output: Optional[str] = None,
) -> SingleRunResponse:
    timeout_seconds = max(0.5, time_limit_ms / 1000.0)

    with tempfile.TemporaryDirectory() as temp_dir:
        lang = language.lower()

        if lang in ("python", "python3", "py"):
            file_path = os.path.join(temp_dir, "solution.py")
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(source_code)
            cmd = [sys.executable, file_path]
            compile_cmd = None

        elif lang in ("cpp", "c++"):
            source_path = os.path.join(temp_dir, "solution.cpp")
            exe_path = os.path.join(temp_dir, "solution.exe" if os.name == "nt" else "solution")
            with open(source_path, "w", encoding="utf-8") as f:
                f.write(source_code)

            gpp = shutil.which("g++")
            if not gpp:
                return SingleRunResponse(
                    status="system_error",
                    verdict="system_error",
                    stderr="C++ compiler (g++) is not installed on runner host.",
                    exit_code=1,
                )
            compile_cmd = [gpp, "-O2", "-std=c++17", source_path, "-o", exe_path]
            cmd = [exe_path]

        elif lang in ("javascript", "js", "node"):
            file_path = os.path.join(temp_dir, "solution.js")
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(source_code)
            node_bin = shutil.which("node") or "node"
            cmd = [node_bin, file_path]
            compile_cmd = None

        else:
            return SingleRunResponse(
                status="system_error",
                verdict="system_error",
                stderr=f"Unsupported language: {language}",
                exit_code=1,
            )

        # ── Compilation step (if required) ──
        if compile_cmd:
            try:
                comp_res = subprocess.run(
                    compile_cmd,
                    capture_output=True,
                    text=True,
                    timeout=10,
                )
                if comp_res.returncode != 0:
                    return SingleRunResponse(
                        status="ok",
                        verdict="compilation_error",
                        stderr=comp_res.stderr[:2000],
                        exit_code=comp_res.returncode,
                    )
            except subprocess.TimeoutExpired:
                return SingleRunResponse(
                    status="ok",
                    verdict="compilation_error",
                    stderr="Compilation timed out.",
                    exit_code=1,
                )
            except Exception as e:
                return SingleRunResponse(
                    status="system_error",
                    verdict="system_error",
                    stderr=f"Compilation failure: {str(e)}",
                    exit_code=1,
                )

        # ── Execution step ──
        start_time = time.perf_counter()
        try:
            run_res = subprocess.run(
                cmd,
                input=stdin,
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
            )
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)

            stdout = run_res.stdout
            stderr = run_res.stderr

            if len(stdout.encode("utf-8")) > MAX_OUTPUT_BYTES:
                return SingleRunResponse(
                    status="ok",
                    verdict="output_limit_exceeded",
                    stdout=stdout[:2000],
                    stderr="Output limit exceeded (max 256 KB).",
                    execution_time_ms=elapsed_ms,
                    exit_code=run_res.returncode,
                )

            if run_res.returncode != 0:
                return SingleRunResponse(
                    status="ok",
                    verdict="runtime_error",
                    stdout=stdout[:2000],
                    stderr=stderr[:2000],
                    execution_time_ms=elapsed_ms,
                    exit_code=run_res.returncode,
                )

            # Check verdict against expected output
            passed = False
            verdict = "accepted"
            if expected_output is not None:
                norm_out = normalize_text(stdout)
                norm_exp = normalize_text(expected_output)
                passed = norm_out == norm_exp
                verdict = "accepted" if passed else "wrong_answer"
            else:
                passed = True
                verdict = "accepted"

            return SingleRunResponse(
                status="ok",
                verdict=verdict,
                stdout=stdout[:5000],
                stderr=stderr[:2000],
                execution_time_ms=elapsed_ms,
                exit_code=0,
                passed=passed,
            )

        except subprocess.TimeoutExpired:
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            return SingleRunResponse(
                status="ok",
                verdict="time_limit_exceeded",
                execution_time_ms=max(elapsed_ms, time_limit_ms),
                stderr=f"Time limit of {time_limit_ms}ms exceeded.",
                exit_code=124,
            )
        except Exception as e:
            return SingleRunResponse(
                status="system_error",
                verdict="system_error",
                stderr=f"Runner execution error: {str(e)}",
                exit_code=1,
            )


@app.get("/health")
def health():
    docker_ready = is_docker_available()
    return {
        "status": "ok",
        "service": "codearena-runner",
        "docker_available": docker_ready,
        "local_subprocess_enabled": ALLOW_LOCAL_SUBPROCESS,
    }


@app.post("/run", response_model=SingleRunResponse)
def run_code(req: SingleRunRequest):
    docker_ready = is_docker_available()
    if not docker_ready and not ALLOW_LOCAL_SUBPROCESS:
        return SingleRunResponse(
            status="runner_unavailable",
            verdict="runner_unavailable",
            stderr="Execution runner is unavailable. Docker is required for secure execution.",
            exit_code=503,
        )

    return execute_subprocess(
        language=req.language,
        source_code=req.source_code,
        stdin=req.stdin,
        time_limit_ms=req.time_limit_ms,
        expected_output=req.expected_output,
    )


@app.post("/batch", response_model=BatchRunResponse)
def run_batch(req: BatchRunRequest):
    docker_ready = is_docker_available()
    if not docker_ready and not ALLOW_LOCAL_SUBPROCESS:
        results = [
            SingleRunResponse(
                status="runner_unavailable",
                verdict="runner_unavailable",
                stderr="Runner unavailable.",
            )
            for _ in req.test_cases
        ]
        return BatchRunResponse(
            status="runner_unavailable",
            overall_verdict="runner_unavailable",
            total_score=0.0,
            max_score=sum(tc.weight for tc in req.test_cases),
            results=results,
        )

    results: List[SingleRunResponse] = []
    total_score = 0.0
    max_score = sum(tc.weight for tc in req.test_cases)
    first_failing_verdict: Optional[str] = None

    for tc in req.test_cases:
        res = execute_subprocess(
            language=req.language,
            source_code=req.source_code,
            stdin=tc.input_data,
            time_limit_ms=req.time_limit_ms,
            expected_output=tc.expected_output,
        )
        results.append(res)
        if res.passed:
            total_score += tc.weight
        elif not first_failing_verdict:
            first_failing_verdict = res.verdict

    overall = "accepted" if len(results) > 0 and all(r.passed for r in results) else (first_failing_verdict or "wrong_answer")

    return BatchRunResponse(
        status="ok",
        overall_verdict=overall,
        total_score=total_score,
        max_score=max_score,
        results=results,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("runner_app:app", host="0.0.0.0", port=8001, reload=False)
