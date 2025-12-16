# Git Workflow

## Purpose

Defines the Git branching strategy, commit conventions, and version control best practices for the AHS Field Service Execution Platform.

## Branching Strategy

### Branch Types

```
main (production)
  ↑
develop (integration)
  ↑
feature/ABC-123-description
hotfix/ABC-456-critical-fix
release/v1.2.0
```

**Branches**:
- `main` - Production code, always deployable
- `develop` - Integration branch for features
- `feature/*` - Feature development
- `hotfix/*` - Critical production fixes
- `release/*` - Release preparation

### Branch Protection Rules

**main branch**:
- ✅ Require pull request reviews (minimum 2)
- ✅ Require status checks to pass (CI/CD)
- ✅ Require conversation resolution
- ✅ Require signed commits (optional)
- ❌ No direct pushes
- ❌ No force pushes

**develop branch**:
- ✅ Require pull request reviews (minimum 1)
- ✅ Require status checks to pass
- ❌ No force pushes

## Feature Development Workflow

### 1. Create Feature Branch

```bash
# Update develop
git checkout develop
git pull origin develop

# Create feature branch from develop
git checkout -b feature/ABC-123-add-provider-scoring

# Naming: feature/TICKET-ID-short-description
# Example: feature/ABC-123-add-provider-scoring
#          feature/ABC-456-fix-buffer-calculation
#          feature/ABC-789-update-assignment-ui
```

### 2. Develop Feature

```bash
# Make changes
# Write tests
# Commit frequently (see Commit Conventions below)

git add .
git commit -m "feat(assignment): add scoring transparency"

# Push to remote
git push origin feature/ABC-123-add-provider-scoring
```

### 3. Keep Branch Updated

```bash
# Regularly sync with develop to avoid merge conflicts
git checkout develop
git pull origin develop

git checkout feature/ABC-123-add-provider-scoring
git rebase develop

# Or use merge if team prefers
git merge develop

# Resolve conflicts if any
git push origin feature/ABC-123-add-provider-scoring --force-with-lease
```

### 4. Create Pull Request

```bash
# Push final changes
git push origin feature/ABC-123-add-provider-scoring

# Create PR on GitHub:
# - Base: develop
# - Compare: feature/ABC-123-add-provider-scoring
# - Title: [ABC-123] Add provider scoring transparency
# - Description: Use PR template
```

### 5. Address Review Feedback

```bash
# Make requested changes
git add .
git commit -m "refactor(assignment): extract scoring logic to separate service"

# Push updates
git push origin feature/ABC-123-add-provider-scoring
```

### 6. Merge to Develop

```bash
# After approval, merge via GitHub PR
# Choose merge strategy: Squash and Merge (recommended)

# Delete feature branch after merge
git branch -d feature/ABC-123-add-provider-scoring
git push origin --delete feature/ABC-123-add-provider-scoring
```

## Commit Conventions

### Conventional Commits Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

| Type | Description | Example |
|------|-------------|---------|
| **feat** | New feature | `feat(assignment): add scoring transparency` |
| **fix** | Bug fix | `fix(scheduling): correct buffer stacking for holidays` |
| **docs** | Documentation only | `docs(api): update scheduling API examples` |
| **style** | Code style (formatting, semicolons) | `style: apply prettier formatting` |
| **refactor** | Code refactoring | `refactor(provider): extract zone validation logic` |
| **perf** | Performance improvement | `perf(db): add index on service_orders.scheduled_date` |
| **test** | Adding/updating tests | `test(assignment): add funnel transparency tests` |
| **chore** | Build, dependencies, tools | `chore: update nestjs to v10.3.0` |
| **ci** | CI/CD changes | `ci: add integration test step to pipeline` |
| **revert** | Revert previous commit | `revert: revert "feat(assignment): add scoring"` |

### Scope

Scope indicates which module/service is affected:

- `assignment` - Assignment & Dispatch service
- `scheduling` - Scheduling service
- `provider` - Provider & Capacity service
- `orchestration` - Orchestration & Control service
- `execution` - Execution & Mobile service
- `contracts` - Contracts & Documents service
- `communication` - Communication service
- `config` - Configuration service
- `auth` - Identity & Access service
- `api` - API layer
- `db` - Database
- `ui` - Frontend

### Subject

- Use imperative mood: "add" not "added" or "adds"
- Don't capitalize first letter
- No period at the end
- Max 72 characters

### Body

- Explain **what** and **why**, not **how**
- Wrap at 72 characters
- Separate from subject with blank line

### Footer

- Reference issues: `Fixes: ABC-123` or `Refs: ABC-456`
- Breaking changes: `BREAKING CHANGE: description`

### Examples

**Simple commit**:
```bash
git commit -m "feat(assignment): add provider scoring transparency"
```

**Detailed commit**:
```bash
git commit -m "fix(scheduling): correct buffer stacking for holidays

Buffers were not correctly skipping national holidays when calculating
the earliest service date. This fix ensures all non-working days
(weekends and holidays) are excluded from buffer day calculations.

The issue affected service orders in France and Spain where holidays
are numerous and can significantly impact scheduling.

Fixes: ABC-789
Refs: ABC-123"
```

**Breaking change**:
```bash
git commit -m "feat(api)!: change assignment API response structure

BREAKING CHANGE: The assignment API now returns funnel data in a
nested 'transparency' object instead of at the root level.

Before:
{
  "assignedProvider": "...",
  "funnel": { ... }
}

After:
{
  "assignedProvider": "...",
  "transparency": {
    "funnel": { ... },
    "scores": { ... }
  }
}

Clients must update their code to access funnel data via the
transparency object.

Fixes: ABC-890"
```

## Hotfix Workflow

For critical production bugs:

### 1. Create Hotfix Branch from Main

```bash
git checkout main
git pull origin main

git checkout -b hotfix/ABC-999-fix-assignment-crash

# Naming: hotfix/TICKET-ID-description
```

### 2. Fix and Test

```bash
# Make minimal changes to fix the issue
# Add tests to prevent regression

git add .
git commit -m "fix(assignment): prevent null pointer in scoring service

Critical fix for production crash when provider has no P1 services.
Added null check and comprehensive tests.

Fixes: ABC-999"
```

### 3. Create PR to Main

```bash
git push origin hotfix/ABC-999-fix-assignment-crash

# Create PR:
# Base: main
# Compare: hotfix/ABC-999-fix-assignment-crash
# Title: [HOTFIX] [ABC-999] Fix assignment crash
```

### 4. Merge and Tag

```bash
# After approval, merge to main
# Create release tag
git checkout main
git pull origin main
git tag -a v1.2.1 -m "Hotfix: Fix assignment crash"
git push origin v1.2.1

# Also merge to develop to keep in sync
git checkout develop
git pull origin develop
git merge main
git push origin develop
```

## Release Workflow

### 1. Create Release Branch

```bash
# From develop when ready for release
git checkout develop
git pull origin develop

git checkout -b release/v1.3.0
```

### 2. Prepare Release

```bash
# Update version in package.json
npm version 1.3.0 --no-git-tag-version

# Update CHANGELOG.md
# Generate changelog from commits
npx standard-version --dry-run

# Commit version bump
git add package.json CHANGELOG.md
git commit -m "chore(release): bump version to 1.3.0"

git push origin release/v1.3.0
```

### 3. Test Release

```bash
# Deploy to staging
# Run full test suite
# Perform UAT (User Acceptance Testing)

# Fix bugs found during testing
git commit -m "fix(ui): correct calendar display issue"
```

### 4. Merge to Main and Develop

```bash
# Create PR to main
# Base: main
# Compare: release/v1.3.0

# After approval, merge
# Tag release
git checkout main
git pull origin main
git tag -a v1.3.0 -m "Release v1.3.0"
git push origin v1.3.0

# Merge back to develop
git checkout develop
git pull origin develop
git merge main
git push origin develop

# Delete release branch
git branch -d release/v1.3.0
git push origin --delete release/v1.3.0
```

## Rebase vs Merge

### When to Rebase

✅ **Use rebase for**:
- Updating feature branch with develop
- Cleaning up local commits before pushing
- Maintaining linear history

```bash
git checkout feature/ABC-123
git rebase develop
```

### When to Merge

✅ **Use merge for**:
- Integrating feature into develop (via PR)
- Hotfix to main and develop
- Release branch to main

```bash
git checkout develop
git merge feature/ABC-123 --no-ff
```

### ⚠️ Never Rebase Public Branches

❌ **Never rebase**:
- main branch
- develop branch
- Any branch others are working on

## Resolving Conflicts

### During Rebase

```bash
git rebase develop

# Conflicts appear
# Edit conflicted files
# Look for <<<<<<< HEAD markers

# After resolving
git add <resolved-files>
git rebase --continue

# Or abort if needed
git rebase --abort
```

### During Merge

```bash
git merge develop

# Conflicts appear
# Resolve conflicts in files

git add <resolved-files>
git commit -m "merge: resolve conflicts with develop"
```

## Git Aliases (Optional)

Add to `~/.gitconfig`:

```ini
[alias]
  co = checkout
  br = branch
  ci = commit
  st = status
  unstage = reset HEAD --
  last = log -1 HEAD
  visual = log --oneline --graph --decorate --all
  amend = commit --amend --no-edit
  
  # Conventional commits helpers
  feat = !git commit -m \"feat:
  fix = !git commit -m \"fix:
  docs = !git commit -m \"docs:
  
  # Clean merged branches
  cleanup = "!git branch --merged | grep -v '\\*\\|main\\|develop' | xargs -n 1 git branch -d"
```

## Best Practices

### Do's ✅

- ✅ Commit often (small, logical commits)
- ✅ Write descriptive commit messages
- ✅ Review your changes before committing (`git diff`)
- ✅ Keep feature branches short-lived (< 1 week)
- ✅ Sync with develop regularly
- ✅ Delete merged branches
- ✅ Use conventional commits
- ✅ Add ticket reference in commits

### Don'ts ❌

- ❌ Commit broken code
- ❌ Commit secrets or credentials
- ❌ Use generic messages ("fix bug", "update code")
- ❌ Mix multiple concerns in one commit
- ❌ Force push to main or develop
- ❌ Commit generated files (build artifacts, node_modules)
- ❌ Leave large files in repo
- ❌ Commit commented-out code

## .gitignore

```
# Dependencies
node_modules/
npm-debug.log

# Build outputs
dist/
build/
*.js.map

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
.nyc_output/

# Logs
logs/
*.log

# Temporary
tmp/
temp/
```

## Useful Git Commands

```bash
# View commit history
git log --oneline --graph --decorate --all

# Show changes in last commit
git show

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard all local changes
git reset --hard HEAD

# Stash changes
git stash
git stash pop

# Cherry-pick commit
git cherry-pick <commit-hash>

# Find who changed a line
git blame <file>

# Search commits
git log --grep="assignment"

# Show files changed in commit
git show --name-only <commit-hash>
```

---

**Document Version**: 1.0.0
**Last Updated**: 2025-01-14
