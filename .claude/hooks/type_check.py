#!/usr/bin/env python3
import json
import sys
import subprocess
import re
import os
from pathlib import Path


def find_project_root(current_path):
    """Find the project root by looking for tsconfig.json"""
    current = Path(current_path).resolve()
    while current != current.parent:
        if (current / "tsconfig.json").exists():
            return current
        current = current.parent
    return None


def run_typescript_check(project_root, file_path=None):
    """Run TypeScript check with proper configuration"""
    cmd = ["npx", "tsc", "--noEmit", "--pretty"]

    # Add incremental for faster checks
    if (project_root / "tsconfig.json").exists():
        cmd.extend(["--project", str(project_root)])

    try:
        result = subprocess.run(
            cmd,
            cwd=project_root,
            capture_output=True,
            text=True,
            timeout=30,  # Prevent hanging
        )
        return result
    except subprocess.TimeoutExpired:
        print("⚠️ TypeScript check timed out", file=sys.stderr)
        return None
    except FileNotFoundError:
        print("⚠️ TypeScript not found - run 'npm install typescript'", file=sys.stderr)
        return None


def parse_tsc_output(stdout, stderr, file_path):
    """Parse TypeScript output and filter for relevant errors"""
    output = stdout + stderr
    if not output.strip():
        return []

    errors = []
    current_file = None

    for line in output.split("\n"):
        line = line.strip()
        if not line:
            continue

        # Match file path pattern: src/path/file.ts(line,col): error TS...
        file_match = re.match(
            r"^([^(]+)\((\d+),(\d+)\):\s*(error|warning)\s*(TS\d+):\s*(.+)$", line
        )
        if file_match:
            error_file, line_num, col_num, severity, code, message = file_match.groups()
            errors.append(
                {
                    "file": error_file,
                    "line": int(line_num),
                    "column": int(col_num),
                    "severity": severity,
                    "code": code,
                    "message": message,
                }
            )
        # Also catch general error messages
        elif "error TS" in line:
            errors.append(
                {
                    "file": file_path or "unknown",
                    "line": 0,
                    "column": 0,
                    "severity": "error",
                    "code": "TS????",
                    "message": line,
                }
            )

    return errors


def filter_relevant_errors(errors, target_file_path):
    """Filter errors relevant to the modified file"""
    if not target_file_path:
        return errors

    # Convert to absolute path for comparison
    target_abs = os.path.abspath(target_file_path)

    relevant_errors = []
    for error in errors:
        error_abs = os.path.abspath(error["file"])
        # Include errors from the target file or files it directly imports/exports
        if error_abs == target_abs or target_file_path in error["file"]:
            relevant_errors.append(error)

    return relevant_errors


def format_error_output(errors, file_path):
    """Format errors for readable output"""
    if not errors:
        return "✅ No TypeScript errors found"

    output = [f"⚠️ Found {len(errors)} TypeScript error(s):"]

    # Group errors by file
    files_errors = {}
    for error in errors:
        file_key = error["file"]
        if file_key not in files_errors:
            files_errors[file_key] = []
        files_errors[file_key].append(error)

    for file, file_errors in files_errors.items():
        output.append(f"\n📁 {file}:")
        for error in file_errors:
            location = (
                f"  Line {error['line']}, Col {error['column']}"
                if error["line"] > 0
                else "  "
            )
            output.append(f"{location}: {error['severity']} {error['code']}")
            output.append(f"    {error['message']}")

    return "\n".join(output)


def main():
    try:
        # Read input from Claude Code
        input_data = json.loads(sys.stdin.read())
    except json.JSONDecodeError as e:
        print(f"❌ Hook input error: {e}", file=sys.stderr)
        sys.exit(1)

    # Extract file information
    tool_input = input_data.get("tool_input", {})
    file_path = tool_input.get("file_path")

    if not file_path:
        print("⚠️ No file path provided", file=sys.stderr)
        sys.exit(0)

    # Only check TypeScript files
    if not re.search(r"\.(ts|tsx)$", file_path, re.IGNORECASE):
        sys.exit(0)  # Not a TypeScript file, skip silently

    # Find project root
    project_root = find_project_root(file_path)
    if not project_root:
        print(
            "⚠️ Could not find tsconfig.json - skipping TypeScript check",
            file=sys.stderr,
        )
        sys.exit(0)

    print(f"🔍 Checking TypeScript for: {file_path}", file=sys.stderr)

    # Run TypeScript check
    result = run_typescript_check(project_root, file_path)
    if result is None:
        sys.exit(0)  # Error already reported

    # Parse and filter errors
    all_errors = parse_tsc_output(result.stdout, result.stderr, file_path)
    relevant_errors = filter_relevant_errors(all_errors, file_path)

    # Format output
    output = format_error_output(relevant_errors, file_path)
    print(output, file=sys.stderr)

    # Exit codes:
    # 0 = success (no errors or only warnings)
    # 1 = soft error (warnings or minor issues)
    # 2 = hard error (serious TypeScript errors)

    error_count = len([e for e in relevant_errors if e["severity"] == "error"])
    warning_count = len([e for e in relevant_errors if e["severity"] == "warning"])

    if error_count > 0:
        print(f"\n❌ {error_count} error(s) need to be fixed", file=sys.stderr)
        sys.exit(2)  # Hard error - stop execution
    elif warning_count > 0:
        print(f"\n⚠️ {warning_count} warning(s) found", file=sys.stderr)
        sys.exit(2)  # Soft error - warn but continue
    else:
        print("\n✅ TypeScript check passed", file=sys.stderr)
        sys.exit(0)


main()
