"""
Task framework for release notes pipeline.

Provides utilities and helpers for the multi-stage
release notes workflow (analysis -> release notes -> migration).
"""

from backend.task_framework.utils import (
    get_task_result,
    format_prompt,
    format_prompt_safe,
    extract_markdown_content,
    create_work_dir,
    extract_clean_markdown,
    input_check,
    extract_file_paths,
    check_file_paths,
)

__all__ = [
    "get_task_result",
    "format_prompt",
    "format_prompt_safe",
    "extract_markdown_content",
    "create_work_dir",
    "extract_clean_markdown",
    "input_check",
    "extract_file_paths",
    "check_file_paths",
]
