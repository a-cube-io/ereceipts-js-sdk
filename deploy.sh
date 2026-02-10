#!/bin/bash

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Reset function - undo last version bump
reset_last_release() {
    echo ""
    echo -e "${YELLOW}Reset last release${NC}"
    echo ""

    # Get last tag
    LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

    if [[ -z "$LAST_TAG" ]]; then
        echo -e "${RED}No tags found.${NC}"
        exit 1
    fi

    echo -e "Last tag: ${GREEN}$LAST_TAG${NC}"
    echo ""

    # Check if tag is pushed to remote
    if git ls-remote --tags origin | grep -q "$LAST_TAG"; then
        echo -e "${RED}Warning: Tag $LAST_TAG exists on remote!${NC}"
        echo "This will only reset locally. Remote cleanup needed manually."
        echo ""
    fi

    read -p "Undo release $LAST_TAG? (y/N): " CONFIRM_RESET

    if [[ ! "$CONFIRM_RESET" =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi

    # Delete tag
    git tag -d "$LAST_TAG"
    echo -e "${GREEN}Deleted tag $LAST_TAG${NC}"

    # Reset last commit
    git reset --hard HEAD~1
    echo -e "${GREEN}Reset to previous commit${NC}"

    NEW_VERSION=$(node -p "require('./package.json').version")
    echo ""
    echo -e "${GREEN}Done! Version is now: $NEW_VERSION${NC}"
    exit 0
}

# Handle arguments
if [[ "$1" == "--reset" ]] || [[ "$1" == "-r" ]]; then
    reset_last_release
fi

if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    echo "Usage: ./deploy.sh [option]"
    echo ""
    echo "Options:"
    echo "  (none)      Start deploy process"
    echo "  --reset, -r Undo last release (local only)"
    echo "  --help, -h  Show this help"
    exit 0
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   ACube E-Receipt SDK - Deploy${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Current version: ${GREEN}$CURRENT_VERSION${NC}"
echo ""

# Check npm login status
echo -e "${BLUE}Checking npm authentication...${NC}"
NPM_USER=$(npm whoami 2>/dev/null || echo "")

if [[ -z "$NPM_USER" ]]; then
    echo -e "${RED}Not logged in to npm.${NC}"
    echo ""
    read -p "Login now? (Y/n): " DO_LOGIN

    if [[ "$DO_LOGIN" =~ ^[Nn]$ ]]; then
        echo "Aborted. Run 'npm login' first."
        exit 1
    fi

    npm login

    NPM_USER=$(npm whoami 2>/dev/null || echo "")
    if [[ -z "$NPM_USER" ]]; then
        echo -e "${RED}Login failed.${NC}"
        exit 1
    fi
fi

echo -e "Logged in as: ${GREEN}$NPM_USER${NC}"
echo ""

# Check for uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
    echo -e "${YELLOW}Warning: You have uncommitted changes${NC}"
    git status --short
    echo ""
    read -p "Continue anyway? (y/N): " CONTINUE
    if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

# Parse current version
IFS='.' read -r MAJOR MINOR PATCH <<< "${CURRENT_VERSION//v/}"
PATCH_NUM="${PATCH%%-*}"  # Remove prerelease suffix if any

# Version selection menu
echo -e "${BLUE}Select version bump:${NC}"
echo ""
echo "  1) patch      (bug fixes)           $CURRENT_VERSION -> $MAJOR.$MINOR.$((PATCH_NUM + 1))"
echo "  2) minor      (new features)        $CURRENT_VERSION -> $MAJOR.$((MINOR + 1)).0"
echo "  3) major      (breaking changes)    $CURRENT_VERSION -> $((MAJOR + 1)).0.0"
echo "  4) prepatch   (patch prerelease)    $CURRENT_VERSION -> $MAJOR.$MINOR.$((PATCH_NUM + 1))-0"
echo "  5) preminor   (minor prerelease)    $CURRENT_VERSION -> $MAJOR.$((MINOR + 1)).0-0"
echo "  6) premajor   (major prerelease)    $CURRENT_VERSION -> $((MAJOR + 1)).0.0-0"
echo "  7) prerelease (increment pre)       $CURRENT_VERSION -> next prerelease"
echo "  8) custom     (enter manually)"
echo ""
read -p "Choice [1-8]: " VERSION_CHOICE

case $VERSION_CHOICE in
    1) VERSION_TYPE="patch" ;;
    2) VERSION_TYPE="minor" ;;
    3) VERSION_TYPE="major" ;;
    4) VERSION_TYPE="prepatch" ;;
    5) VERSION_TYPE="preminor" ;;
    6) VERSION_TYPE="premajor" ;;
    7) VERSION_TYPE="prerelease" ;;
    8)
        read -p "Enter version (e.g., 2.1.0): " CUSTOM_VERSION
        VERSION_TYPE="$CUSTOM_VERSION"
        ;;
    *)
        echo -e "${RED}Invalid choice. Aborted.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}Step 1/5: Quality checks${NC}"
echo "Running format, lint, and typecheck..."
bun run quality

echo ""
echo -e "${BLUE}Step 2/5: Running tests${NC}"
bun run test

echo ""
echo -e "${BLUE}Step 3/5: Building package${NC}"
bun run build

echo ""
echo -e "${BLUE}Step 4/5: Bumping version${NC}"

# Bump version (npm version handles git commit and tag)
if [[ "$VERSION_CHOICE" == "8" ]]; then
    NEW_VERSION=$(npm version "$VERSION_TYPE" --no-git-tag-version)
else
    NEW_VERSION=$(npm version "$VERSION_TYPE" --no-git-tag-version)
fi

echo -e "New version: ${GREEN}$NEW_VERSION${NC}"

# Git commit and tag
git add package.json package-lock.json bun.lock
git commit -m "Release $NEW_VERSION"
git tag "$NEW_VERSION"

echo ""
echo -e "${BLUE}Step 5/5: Publishing to npm${NC}"
echo ""
echo -e "${YELLOW}About to publish $NEW_VERSION to npm${NC}"
read -p "Proceed with publish? (y/N): " CONFIRM_PUBLISH

if [[ ! "$CONFIRM_PUBLISH" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Publish cancelled. Reverting changes...${NC}"
    echo ""

    # Delete tag
    git tag -d "$NEW_VERSION" 2>/dev/null
    echo -e "Deleted tag $NEW_VERSION"

    # Reset commit
    git reset --hard HEAD~1
    echo -e "Reset to previous commit"

    RESTORED_VERSION=$(node -p "require('./package.json').version")
    echo ""
    echo -e "${GREEN}Restored to version: $RESTORED_VERSION${NC}"
    exit 0
fi

# Ask for OTP (2FA)
read -p "Enter OTP code (leave empty if no 2FA): " OTP_CODE

if [[ -n "$OTP_CODE" ]]; then
    npm publish --access public --otp "$OTP_CODE"
else
    npm publish --access public
fi

echo ""
echo -e "${BLUE}Pushing to git remote...${NC}"
git push && git push --tags

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Successfully published $NEW_VERSION${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "npm: https://www.npmjs.com/package/@a-cube-io/ereceipts-js-sdk"
echo ""
