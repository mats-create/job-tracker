#!/usr/bin/env python3
"""
build.py — assembles src/ files into index.html
Run: python3 build.py
"""

import os, sys, re

SRC_DIR  = "src"
SHELL    = os.path.join(SRC_DIR, "shell.html")
OUTPUT   = "index.html"
PLACEHOLDER = "<!-- BABEL_CONTENT_PLACEHOLDER -->"

PARTS = [
    "constants.js",
    "utils.js",
    "components.js",
    "dashboard.js",
    "jobs.js",
    "profiles.js",
    "cv.js",
    "covers.js",
    "assistant.js",
    "scheduler.js",
    "app.js",
]

REQUIRED = {
    "constants.js":  ["const LIGHT =", "const STATUSES", "const CLAUDE_MODEL"],
    "utils.js":      ["function cloudSave", "function callClaude", "function hasCv"],
    "components.js": ["function Card", "function Sidebar", "function MobileBottomNav"],
    "dashboard.js":  ["function Dashboard"],
    "jobs.js":       ["function JobRow", "function Jobs"],
    "profiles.js":   ["function SearchProfiles"],
    "cv.js":         ["function CVProfile", "function InlineListEditor"],
    "covers.js":     ["function CoverLetters"],
    "assistant.js":  ["function ProfileAssistant", "function buildAssistantSystem"],
    "scheduler.js":  ["function Scheduler", "function Reports", "function ActivityListings"],
    "app.js":        ["function AppShell", "function App", "root.render"],
}

def check_file(name, content):
    missing = [s for s in REQUIRED.get(name, []) if s not in content]
    if missing:
        print(f"  ✗ {name}: missing markers: {missing}")
        return False
    print(f"  ✓ {name} ({len(content):,} chars)")
    return True

def main():
    print("=== Job Tracker Build ===\n")

    # Read shell
    if not os.path.exists(SHELL):
        print(f"ERROR: {SHELL} not found"); sys.exit(1)
    with open(SHELL, encoding="utf-8") as f:
        shell = f.read()
    if PLACEHOLDER not in shell:
        print(f"ERROR: placeholder '{PLACEHOLDER}' not found in shell.html"); sys.exit(1)
    print(f"Shell: {SHELL} ({len(shell):,} chars)\n")

    # Read and validate each part
    print("Checking source files:")
    all_ok = True
    js_parts = []
    for name in PARTS:
        path = os.path.join(SRC_DIR, name)
        if not os.path.exists(path):
            print(f"  ✗ {name}: FILE NOT FOUND at {path}")
            all_ok = False
            continue
        with open(path, encoding="utf-8") as f:
            content = f.read()
        if not check_file(name, content):
            all_ok = False
        js_parts.append(content)

    if not all_ok:
        print("\nBuild aborted — fix the errors above and try again.")
        sys.exit(1)

    # Assemble
    combined_js = "\n\n".join(js_parts)
    babel_block = f'<script type="text/babel">\n{combined_js}\n</script>'
    output = shell.replace(PLACEHOLDER, babel_block)

    with open(OUTPUT, "w", encoding="utf-8") as f:
        f.write(output)

    size_kb = len(output.encode("utf-8")) / 1024
    print(f"\n✅ Built {OUTPUT} ({size_kb:.1f} KB, {len(output):,} chars)")
    print("   Drag index.html into your GitHub repo to deploy.")

if __name__ == "__main__":
    main()
