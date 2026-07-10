#!/bin/bash
# Pre-commit hook — runs security scan before commit
# Install: cp scripts/pre-commit.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "🔒 Secure Workflow — Pre-Commit Check"
echo "======================================"

# Stage 1: Secret scanning
echo ""
echo "📝 Stage 1: Secret Scanning"
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || true)

if [ -n "$STAGED_FILES" ]; then
    SECRETS_FOUND=0
    for file in $STAGED_FILES; do
        if [ -f "$file" ]; then
            # Check for common secret patterns
            if grep -lE "(password|secret|token|api_key|private_key)\s*=\s*['\"][^'\"$]" "$file" 2>/dev/null | grep -v ".env.example" | grep -v "test_" | grep -v "__mock__" > /dev/null 2>&1; then
                echo -e "${RED}🚫 Possible secret in: $file${NC}"
                grep -nE "(password|secret|token|api_key|private_key)\s*=\s*['\"][^'\"$]" "$file" | head -3
                SECRETS_FOUND=1
            fi
            # Check for private keys
            if grep -l "BEGIN.*PRIVATE KEY" "$file" 2>/dev/null > /dev/null 2>&1; then
                echo -e "${RED}🚫 Private key found in: $file${NC}"
                SECRETS_FOUND=1
            fi
        fi
    done
    if [ "$SECRETS_FOUND" -eq 1 ]; then
        echo -e "${RED}🚫 Secrets detected — commit blocked${NC}"
        echo "Fix: Remove secrets, use environment variables, then re-commit."
        exit 1
    fi
    echo -e "${GREEN}✅ No secrets detected${NC}"
else
    echo -e "${YELLOW}⚠️  No staged files to scan${NC}"
fi

# Stage 2: SAST (backend)
echo ""
echo "🔍 Stage 2: SAST — Backend"
if [ -d "backend" ] && command -v bandit &>/dev/null; then
    BANDIT_RESULT=$(bandit -r backend/app/ -ll -f json 2>/dev/null || true)
    if echo "$BANDIT_RESULT" | grep -q '"issue_severity": "HIGH"'; then
        echo -e "${RED}🚫 High severity issues found${NC}"
        echo "$BANDIT_RESULT" | python3 -c "import sys,json; [print(f'  {i[\"issue_text\"]} ({i[\"filename\"]}:{i[\"line_number\"]})') for i in json.load(sys.stdin).get('results',[])]" 2>/dev/null
        exit 1
    fi
    echo -e "${GREEN}✅ SAST clean (no high severity)${NC}"
elif [ -d "backend" ]; then
    echo -e "${YELLOW}⚠️  bandit not installed — skipping SAST${NC}"
    echo "Install: pip install bandit"
fi

# Stage 3: Lint (frontend)
echo ""
echo "🔎 Stage 3: Lint — Frontend"
if [ -d "frontend" ]; then
    cd frontend
    if npm run lint --quiet 2>/dev/null; then
        echo -e "${GREEN}✅ Lint clean${NC}"
    else
        echo -e "${YELLOW}⚠️  Lint warnings (non-blocking)${NC}"
    fi
    cd ..
fi

# Stage 4: Dependency check reminder
echo ""
echo "📦 Stage 4: Dependency Check"
echo -e "${YELLOW}⚠️  Run before merge: bash scripts/verify-deps.sh${NC}"

echo ""
echo "======================================"
echo -e "${GREEN}🔒 Pre-commit check passed — commit allowed${NC}"
echo "======================================"
