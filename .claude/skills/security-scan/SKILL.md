# Security Scan Skill

Performs SAST (Static Application Security Testing) and secret scanning on the Beans Inventory codebase.

## When to Use

- Before committing code changes
- After modifying authentication, API endpoints, or database queries
- When adding new dependencies
- During code review (agent review stage)
- On CI/CD pipeline (automated check)

## Scan Stages

### 1. SAST — Static Analysis

**Python (backend):**
```bash
cd backend
pip install bandit -q
bandit -r app/ -f json --severity-level medium 2>/dev/null
```

**JavaScript/TypeScript (frontend):**
```bash
cd frontend
npm run lint -- --ext .ts,.tsx
```

### 2. Secret Scanning

Check for hardcoded secrets in staged files:
- API keys, tokens, passwords, connection strings
- Private keys (RSA, SSH, PEM)
- JWT secrets, session secrets
- Database credentials

**Patterns to scan:**
- `password\s*=\s*["']...`
- `secret[_-]key\s*=\s*["']...`
- `api[_-]key\s*=\s*["']...`
- `token\s*=\s*["']...`
- `-----BEGIN.*PRIVATE KEY-----`
- AWS/GCP/Azure credential patterns
- Connection strings with embedded passwords

### 3. Dependency Verification

**Python:**
```bash
cd backend
pip install pip-audit -q
pip-audit --severity medium
```

**JavaScript:**
```bash
cd frontend
npm audit --audit-level=moderate
```

## Trigger

Activate when:
- User says "security scan" or "run security check"
- Before committing sensitive changes
- On pre-commit hook
- In CI pipeline

## Command

```
use security-scan skill to scan [backend|frontend|all]
```

Or in Claude Code:
```
@security-scan scan the staged changes
```

## Output Format

```markdown
### Security Scan Results

**SAST:** ✅ Clean / ⚠️ Issues found
- [MEDIUM] Issue description — file:line

**Secrets:** ✅ No secrets found / 🚫 Secrets detected
- [BLOCKER] Hardcoded password in config.py:42

**Dependencies:** ✅ No known CVEs / ⚠️ Vulnerabilities found
- [HIGH] package@1.2.3 — CVE-2024-XXXXX

**Overall:** PASS / NEEDS FIX
```

## Pre-Commit Hook

Add to `.pre-commit-config.yaml`:
```yaml
repos:
  - repo: local
    hooks:
      - id: security-scan
        name: Security Scan
        entry: bash -c 'cd backend && bandit -r app/ -ll 2>/dev/null; cd ../frontend && npm run lint 2>/dev/null'
        language: system
        pass_filenames: false
        stages: [commit]
```
