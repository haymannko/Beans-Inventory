#!/bin/bash
# Dependency verification script — checks for known CVEs
# Usage: bash scripts/verify-deps.sh [backend|frontend|all]

set -e

MODE="${1:-all}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok() { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
fail() { echo -e "${RED}🚫 $1${NC}"; }

check_backend() {
    echo ""
    echo "=== Backend (Python) Dependencies ==="
    cd backend 2>/dev/null || { fail "backend/ not found"; return 1; }

    if command -v pip-audit &>/dev/null; then
        echo "Running pip-audit..."
        if pip-audit --severity medium 2>/dev/null; then
            ok "No known vulnerabilities in Python dependencies"
        else
            fail "Vulnerabilities found — run: pip-audit for details"
        fi
    else
        warn "pip-audit not installed — install with: pip install pip-audit"
        echo "Falling back to safety check..."
        if pip install safety -q 2>/dev/null && safety check --json 2>/dev/null; then
            ok "No known vulnerabilities (safety check)"
        else
            warn "Could not verify Python dependencies — install pip-audit"
        fi
    fi

    # Check for pinned versions
    echo ""
    echo "Checking version pinning..."
    UNPINNED=$(grep -v "==" requirements.txt | grep -v "^#" | grep -v "^$" | wc -l)
    if [ "$UNPINNED" -gt 0 ]; then
        warn "$UNPINNED dependencies not pinned to specific versions"
        grep -v "==" requirements.txt | grep -v "^#" | grep -v "^$" | head -5
    else
        ok "All dependencies pinned"
    fi

    cd ..
}

check_frontend() {
    echo ""
    echo "=== Frontend (Node.js) Dependencies ==="
    cd frontend 2>/dev/null || { fail "frontend/ not found"; return 1; }

    echo "Running npm audit..."
    if npm audit --audit-level=moderate 2>/dev/null; then
        ok "No moderate+ vulnerabilities in npm packages"
    else
        fail "Vulnerabilities found — run: npm audit for details"
    fi

    # Check for outdated packages
    echo ""
    echo "Checking outdated packages..."
    OUTDATED=$(npm outdated 2>/dev/null | wc -l)
    if [ "$OUTDATED" -gt 0 ]; then
        warn "$OUTDATED packages are outdated"
    else
        ok "All packages up to date"
    fi

    cd ..
}

echo "🔍 Dependency Verification — Beans Inventory"
echo "============================================="

case "$MODE" in
    backend)  check_backend ;;
    frontend) check_frontend ;;
    all)
        check_backend
        check_frontend
        ;;
    *)
        echo "Usage: $0 [backend|frontend|all]"
        exit 1
        ;;
esac

echo ""
echo "============================================="
echo "Dependency verification complete."
