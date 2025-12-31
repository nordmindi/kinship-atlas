# CI/CD Pipeline Documentation

## Overview

Kinship Atlas uses GitHub Actions for continuous integration and deployment. The pipeline ensures code quality, test coverage, and system health before any code reaches production.

## Workflows

### 1. CI Pipeline (`ci.yml`)

Runs on every push and pull request to `main` or `develop` branches.

#### Jobs:

1. **Lint & Type Check**
   - Runs ESLint
   - TypeScript type checking
   - Ensures code quality standards

2. **Test & Coverage**
   - Runs all tests
   - Generates coverage reports
   - **Enforces 80% coverage threshold**
   - Uploads coverage to Codecov (if configured)

3. **Build**
   - Builds the application
   - Verifies production build succeeds
   - Checks for build artifacts

4. **Database Health Check**
   - Runs database health checks
   - Verifies database integrity
   - Checks for orphaned data

5. **Security Audit**
   - Runs `npm audit`
   - Checks for known vulnerabilities
   - Reports security issues

### 2. PR Checks (`pr-checks.yml`)

Runs on pull requests to provide quick feedback.

- Merge conflict detection
- Linting
- Type checking
- Test execution
- Coverage reporting

### 3. Release Pipeline (`release.yml`)

Runs when code is pushed to `main` or when a version tag is created.

- Pre-release validation
- Release note generation
- GitHub release creation
- Production deployment (if configured)

## Coverage Requirements

The pipeline enforces **80% coverage** for:
- Lines
- Functions
- Branches
- Statements

If coverage falls below 80%, the build will fail.

## Running Checks Locally

Before pushing code, run all checks locally:

```bash
# Run all CI checks
npm run ci:check

# Individual checks
npm run lint          # Linting
npm run type-check    # Type checking
npm run test:coverage # Tests with coverage
npm run build         # Build check
npm run health:check  # Health check
```

## GitHub Secrets

For production deployments, configure these secrets in GitHub:

- `VITE_SUPABASE_URL_REMOTE` - Production Supabase URL
- `VITE_SUPABASE_ANON_KEY_REMOTE` - Production Supabase anon key
- `VERCEL_TOKEN` - Vercel deployment token (optional)
- `CODECOV_TOKEN` - Codecov token (optional)

## Workflow Status

View workflow status:
- GitHub Actions tab in repository
- Status badges in README (if configured)
- PR status checks

## Troubleshooting

### Tests Failing
1. Run tests locally: `npm run test:run`
2. Check coverage: `npm run test:coverage`
3. Review test output for specific failures

### Coverage Below 80%
1. Run coverage report: `npm run test:coverage`
2. Review `coverage/index.html` for uncovered code
3. Add tests for uncovered areas
4. Focus on critical paths first

### Build Failing
1. Run build locally: `npm run build`
2. Check for TypeScript errors
3. Verify all dependencies are installed
4. Check for missing environment variables

### Health Check Failing
1. Ensure Supabase is running locally
2. Check database migrations are applied
3. Verify environment variables are set
4. Run health check manually: `npm run health:check`

## Best Practices

1. **Always run checks locally** before pushing
2. **Keep coverage above 80%** - add tests for new code
3. **Fix linting errors** before committing
4. **Write meaningful commit messages**
5. **Keep PRs focused** - one feature or fix per PR
6. **Review CI results** before merging

## Continuous Improvement

The CI/CD pipeline is continuously improved. Suggestions and improvements are welcome!

