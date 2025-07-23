# GitHub Actions Setup

## Overview
This repository includes automated workflows for continuous integration and publishing to NPM.

## Workflows

### 🏷️ Tag-Based Release (`tag-release.yml`) - **RECOMMENDED**
**Triggers**: When tags matching `v*` pattern are pushed (e.g., `v1.2.3`)

**Features**:
- ✅ **Git tag driven** - Standard Git workflow with version tags
- ✅ **NPM script integration** - Works with existing `npm run release:*` commands
- ✅ **Smart version sync** - Updates package.json to match tag version
- ✅ **Comprehensive quality checks** - Tests, linting, type checking before publish
- ✅ **Rich changelog** - Auto-generated from commits since last tag
- ✅ **Duplicate protection** - Prevents publishing existing versions
- ✅ **Standard semver** - Supports standard and prerelease versions

### 🚀 Auto Publish (`publish.yml`)
**Triggers**: Push to `master` or `main` branch, manual dispatch

**Features**:
- ✅ Smart publishing - only publishes when `package.json` version changes
- ✅ Comprehensive quality checks (tests, linting, type checking)
- ✅ Automatic GitHub release creation
- ✅ Duplicate prevention - checks NPM registry before publishing
- ✅ Skip with `[skip ci]` in commit message

### 🧪 CI Tests (`ci.yml`)
**Triggers**: Pull requests to `master`/`main`, pushes to `develop`/`feature/*`

**Features**:
- ✅ Multi-Node.js version testing (16, 18, 20)
- ✅ Full quality gate (tests, linting, type checking, build)
- ✅ Fast feedback for PRs

## Required Secrets Setup

### 1. NPM_TOKEN (Required for publishing)

1. **Generate NPM Token**:
   - Go to [NPM Access Tokens](https://www.npmjs.com/settings/tokens)
   - Click "Generate New Token" → "Automation" (recommended for CI/CD)
   - Copy the generated token

2. **Add to GitHub Secrets**:
   - Go to your repository on GitHub
   - Navigate to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Your NPM token from step 1
   - Click "Add secret"

### 2. GITHUB_TOKEN (Automatic)
- Automatically provided by GitHub Actions
- Used for creating releases and repository access
- No manual setup required

## Release Management

### 🎯 Recommended: Tag-Based Release Workflow

**Option 1: Using NPM Scripts (Recommended)**
```bash
# Patch release (1.0.0 → 1.0.1) - Bug fixes
npm run release:patch

# Minor release (1.0.0 → 1.1.0) - New features
npm run release:minor

# Major release (1.0.0 → 2.0.0) - Breaking changes
npm run release:major
```

**Option 2: Manual Git Tags**
```bash
# Standard release
git tag v1.2.3
git push origin v1.2.3

# Prerelease versions (beta, alpha, rc)
git tag v1.2.3-beta.1
git push origin v1.2.3-beta.1

# Annotated tags with message
git tag -a v1.2.3 -m "Release version 1.2.3 with new features"
git push origin v1.2.3
```

**Supported Version Formats:**
- ✅ `v1.2.3` - Standard release
- ✅ `v1.2.3-beta.1` - Beta prerelease  
- ✅ `v1.2.3-alpha.2` - Alpha prerelease
- ✅ `v1.2.3-rc.1` - Release candidate
- ❌ `1.2.3` - Missing 'v' prefix (will be rejected)

**What Happens Automatically:**
1. 🏷️ Tag pushed to GitHub triggers workflow
2. 📦 Package.json version updated to match tag
3. 🧪 Full quality checks run (tests, lint, type-check)
4. 📋 Package built and published to NPM
5. 📝 GitHub release created with changelog
6. 🎉 Release summary generated

### 🔄 Alternative: Auto-Publish Workflow

**For direct version changes (not recommended for releases):**
```bash
# Edit package.json version manually
git add package.json
git commit -m "🔖 Bump version to 1.0.1"
git push origin master
# Auto-publish workflow detects version change and publishes
```

> ⚠️ **Note**: Auto-publish creates basic releases. Use tag-based workflow for proper releases with changelogs.

### 📋 Release Workflow Comparison

| Feature | Tag-Based Release (`tag-release.yml`) | Auto Publish (`publish.yml`) | Manual NPM |
|---------|---------------------------------------|------------------------------|------------|
| **Trigger Method** | 🏷️ Git tags | 📝 Version change in commit | 👤 Command line |
| **Version Management** | 🤖 Tag → package.json sync | 👤 Manual edit | 🤖 NPM version command |
| **Git Integration** | ✅ Native Git tags | ⚠️ Requires manual push | ✅ With `--follow-tags` |
| **Release Notes** | 🤖 Rich changelog from commits | 🤖 Basic auto-generated | ❌ None |
| **Quality Checks** | ✅ Full test suite | ✅ Full test suite | ❌ Manual |
| **Duplicate Protection** | ✅ NPM + Git tag validation | ✅ NPM check only | ❌ None |
| **Rollback Safety** | ✅ Delete tag to rollback | ⚠️ Harder to revert | ❌ No protection |
| **Team Collaboration** | ✅ Visible tags in Git history | ⚠️ Only in commit history | ❌ Local only |
| **CI/CD Standard** | ✅ Industry standard | ⚠️ Custom approach | ❌ Not automated |

### Skip Publishing
Add `[skip ci]` to commit message to skip the auto-publish workflow:
```bash
git commit -m "docs: update README [skip ci]"
```

## Troubleshooting

### Common Issues

**❌ NPM publish fails with 403 error**
- Check that `NPM_TOKEN` secret is set correctly
- Verify token has publish permissions for the package
- Ensure package name in `package.json` matches NPM package

**❌ Version not detected as changed**
- Ensure `package.json` version was actually modified in the commit
- Check that the commit contains the version change

**❌ Tests fail in CI but pass locally**
- Check Node.js version compatibility (CI tests Node 16, 18, 20)
- Verify all dependencies are in `package.json` (not just locally installed)
- Check for environment-specific issues

### Manual Publishing
If automatic publishing fails, you can publish manually:
```bash
npm run build
npm run test
npm run lint:check
npm run type-check
npm publish --access public
```

## Security Best Practices

### Token Security
- ✅ Use "Automation" tokens for CI/CD (more secure than personal tokens)
- ✅ Tokens stored as GitHub secrets (encrypted and access-controlled)
- ✅ Limited token scope (publish access only)

### Workflow Security
- ✅ Use official GitHub Actions with pinned versions
- ✅ Minimal permissions and secure token handling
- ✅ No secrets logged or exposed in workflow outputs

## Monitoring

### GitHub Actions Tab
- View workflow runs and results
- Download logs for debugging
- Manually trigger workflows

### NPM Package Status
- Check [NPM package page](https://www.npmjs.com/package/@a-cube-io/ereceipts-js-sdk)
- Verify published versions and download stats
- Monitor package health and security

### GitHub Releases
- Automatic releases created on publish
- Release notes generated from commit history
- Tagged with version numbers for easy reference