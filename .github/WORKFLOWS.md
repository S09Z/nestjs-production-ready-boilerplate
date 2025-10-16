# GitHub Workflows Documentation

This document describes all the GitHub Actions workflows configured for this project.

## 📋 Table of Contents

- [CI Workflow](#ci-workflow)
- [Code Quality Workflow](#code-quality-workflow)
- [Pull Request Workflow](#pull-request-workflow)
- [Docker Build Workflow](#docker-build-workflow)
- [Release Workflow](#release-workflow)

---

## CI Workflow

**File**: `.github/workflows/ci.yml`

### Triggers
- Push to `main` and `develop` branches
- Pull requests to `main` and `develop` branches

### Jobs

#### 1. Test Stage 🧪
- **Matrix Testing**: Tests against Node.js 18, 20, and 22
- **Services**: PostgreSQL 16 and Redis 7
- **Steps**:
  - Checkout code
  - Setup pnpm and Node.js
  - Install dependencies
  - Generate Prisma Client
  - Run linter
  - Run TypeScript type check
  - Run unit tests
  - Run test coverage
  - Upload coverage to Codecov
  - Run E2E tests

#### 2. Build Stage 🏗️
- **Depends on**: Test stage (only runs if tests pass)
- **Steps**:
  - Checkout code
  - Setup pnpm and Node.js
  - Install dependencies
  - Generate Prisma Client
  - Build application
  - Verify build artifacts
  - Upload build artifacts (retained for 7 days)

#### 3. Security Audit Stage 🔒
- **Depends on**: Test stage
- **Steps**:
  - Run pnpm security audit
  - Check for known vulnerabilities
  - Upload audit report (retained for 30 days)

---

## Code Quality Workflow

**File**: `.github/workflows/code-quality.yml`

### Triggers
- Pull requests to `main` and `develop` branches

### Jobs

#### 1. Lint 📝
- Run ESLint
- Check code formatting with Prettier

#### 2. Type Check 🔍
- Run TypeScript compiler with `--noEmit`
- Verify type safety

#### 3. Dependency Review 📦
- Review dependency changes in PRs
- Fail on moderate or higher severity vulnerabilities

#### 4. Secret Detection 🔐
- Scan code for accidentally committed secrets
- Uses TruffleHog OSS

---

## Pull Request Workflow

**File**: `.github/workflows/pr.yml`

### Triggers
- PR opened, synchronized, reopened, labeled, or unlabeled

### Jobs

#### 1. PR Size Labeling 📏
- Automatically labels PRs based on size:
  - `size/xs`: ≤10 lines
  - `size/s`: ≤100 lines
  - `size/m`: ≤500 lines
  - `size/l`: ≤1000 lines
  - `size/xl`: >1000 lines (warns to split)

#### 2. Auto Label 🏷️
- Labels PRs based on changed files
- Configuration in `.github/labeler.yml`

#### 3. PR Title Check ✅
- Enforces semantic commit messages
- Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

#### 4. Welcome Comment 💬
- Posts helpful checklist on new PRs
- Includes review process information

---

## Docker Build Workflow

**File**: `.github/workflows/docker.yml`

### Triggers
- Push to `main` and `develop` branches
- Push tags starting with `v*`
- Pull requests to `main`

### Jobs

#### Build and Push 🐳
- **Multi-platform**: Builds for `linux/amd64` and `linux/arm64`
- **Registry**: GitHub Container Registry (ghcr.io)
- **Tags**:
  - Branch name for branches
  - `latest` for main branch
  - Semantic version tags for releases
  - SHA-based tags
- **Security**: Runs Trivy vulnerability scanner
- **Caching**: Uses GitHub Actions cache for faster builds

---

## Release Workflow

**File**: `.github/workflows/release.yml`

### Triggers
- Push tags starting with `v*` (e.g., `v1.0.0`)

### Jobs

#### 1. Create Release 🚀
- Generate changelog
- Run tests
- Build application
- Create GitHub Release
- Attach build artifacts

#### 2. Publish to NPM 📦
- Only for stable releases (no pre-release suffix)
- Builds and publishes to NPM registry
- **Note**: Currently commented out, uncomment to enable

#### 3. Notify 📢
- Send release notifications
- Placeholder for Slack/Discord/Email integration

---

## 🔧 Configuration Files

### `.github/labeler.yml`
Auto-labeling configuration for PRs based on changed files:

| Label | Files |
|-------|-------|
| `documentation` | `*.md`, `docs/**` |
| `config` | `*.json`, `*.yml`, `.env.example` |
| `dependencies` | `package.json`, `pnpm-lock.yaml` |
| `database` | `prisma/**`, `src/database/**` |
| `api` | `**/*.controller.ts` |
| `services` | `**/*.service.ts` |
| `tests` | `**/*.spec.ts`, `test/**` |
| `ci-cd` | `.github/**`, `Dockerfile` |
| `dto` | `**/dto/*.ts` |
| `health` | `src/health/**` |
| `security` | `src/common/filters/**`, `src/common/guards/**` |
| `cache` | `src/cache/**` |

---

## 📊 Workflow Status Badges

Add these to your README.md:

```markdown
![CI](https://github.com/YOUR_USERNAME/YOUR_REPO/workflows/CI/badge.svg)
![Code Quality](https://github.com/YOUR_USERNAME/YOUR_REPO/workflows/Code%20Quality/badge.svg)
![Docker Build](https://github.com/YOUR_USERNAME/YOUR_REPO/workflows/Docker%20Build/badge.svg)
```

---

## 🚀 Usage

### Running Workflows Locally

Use [act](https://github.com/nektos/act) to test workflows locally:

```bash
# Install act
brew install act

# Run CI workflow
act -j test

# Run with specific event
act pull_request
```

### Required Secrets

Configure these in your repository settings:

| Secret | Description | Required For |
|--------|-------------|--------------|
| `GITHUB_TOKEN` | Automatically provided | All workflows |
| `NPM_TOKEN` | NPM publishing token | Release workflow |
| `CODECOV_TOKEN` | Codecov integration | CI workflow (optional) |

### Branch Protection Rules

Recommended settings for `main` branch:

- ✅ Require pull request reviews (1 approval)
- ✅ Require status checks to pass:
  - `Test`
  - `Build`
  - `Lint Code`
  - `Type Check`
- ✅ Require branches to be up to date
- ✅ Require conversation resolution
- ✅ Do not allow bypassing

---

## 📈 Metrics and Monitoring

### Coverage Reports
- Uploaded to Codecov after test runs
- Available in PR comments
- Historical tracking in Codecov dashboard

### Build Artifacts
- Stored for 7 days
- Downloadable from workflow runs
- Useful for debugging failed deployments

### Security Scans
- Trivy results uploaded to GitHub Security
- Vulnerability alerts in Security tab
- Automated dependency updates via Dependabot

---

## 🔄 Continuous Improvement

### Planned Enhancements
- [ ] Add performance benchmarking
- [ ] Integrate with deployment platforms
- [ ] Add smoke tests for production
- [ ] Set up automated changelog generation
- [ ] Add Slack/Discord notifications

---

## 🤝 Contributing

When adding new workflows:

1. Document the workflow in this file
2. Add appropriate status checks to branch protection
3. Test locally with `act` if possible
4. Update README badges if applicable

---

## 📚 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Marketplace](https://github.com/marketplace?type=actions)
- [Act - Local Testing](https://github.com/nektos/act)
