#!/bin/bash
set -e

# Task Start Script - A-Cube SDK Enterprise Transformation
# Usage: ./task-start.sh "1.1.1" "Implement ACubeSDK Core Class"

TASK_ID=$1
TASK_TITLE=$2

if [[ -z "$TASK_ID" || -z "$TASK_TITLE" ]]; then
    echo "❌ Error: Missing required parameters"
    echo "Usage: ./task-start.sh \"TASK_ID\" \"TASK_TITLE\""
    echo "Example: ./task-start.sh \"1.1.1\" \"Implement ACubeSDK Core Class\""
    exit 1
fi

PHASE=$(echo $TASK_ID | cut -d'.' -f1)
TASK_FILE="plan/tasks/phase-$PHASE/$TASK_ID.md"

echo "🚀 Starting task: $TASK_ID - $TASK_TITLE"
echo "📁 Phase: $PHASE"
echo "📄 Task file: $TASK_FILE"

# Validate task file exists
if [[ ! -f "$TASK_FILE" ]]; then
    echo "⚠️  Warning: Task file $TASK_FILE not found"
    echo "📝 Creating basic task file..."
    
    mkdir -p "plan/tasks/phase-$PHASE"
    cat > "$TASK_FILE" << EOF
# Task $TASK_ID: $TASK_TITLE

**Phase**: $PHASE
**Status**: 🔄 In Progress
**Started**: $(date)
**Assignee**: Claude Code

## 📋 Task Overview
$TASK_TITLE

## 🎯 Objectives
- Implement $TASK_TITLE
- Ensure quality standards
- Complete testing
- Update documentation

## ✅ Acceptance Criteria
- [ ] Implementation complete
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Code review passed

---
*Task created: $(date)*
EOF
fi

# Create task branch
echo "🌿 Creating task branch: task/$TASK_ID"
git checkout -b "task/$TASK_ID" 2>/dev/null || {
    echo "ℹ️  Branch task/$TASK_ID already exists, switching to it"
    git checkout "task/$TASK_ID"
}

# Update current sprint file
echo "📊 Updating current sprint status..."
cat > plan/progress/current-sprint.md << EOF
# 📋 Current Sprint Status

**Current Task**: $TASK_ID  
**Task Title**: $TASK_TITLE  
**Phase**: $PHASE  
**Started**: $(date)  
**Status**: 🔄 In Progress  
**Branch**: task/$TASK_ID  
**Assignee**: Claude Code  

## 📝 Task Description

$(head -20 "$TASK_FILE" | tail -15)

## 🎯 Sprint Goals

- Complete $TASK_TITLE implementation
- Maintain quality standards (>95% test coverage)
- Update documentation
- Prepare for next task

## 📊 Progress Indicators

- [ ] Task setup complete ✅
- [ ] Implementation started
- [ ] Testing in progress
- [ ] Documentation updated
- [ ] Code review ready

## 🔗 Related Links

- [Task Details]($TASK_FILE)
- [Phase Documentation](../phases/phase-$PHASE-*.md)
- [Progress Dashboard](dashboard.md)

---
*Sprint updated: $(date)*
EOF

# Check if GitHub CLI is available and configured
if command -v gh &> /dev/null && gh auth status &> /dev/null; then
    echo "📋 Creating GitHub issue..."
    
    # Create GitHub issue
    ISSUE_NUMBER=$(gh issue create \
        --title "[$PHASE] $TASK_TITLE" \
        --body-file "$TASK_FILE" \
        --label "phase-$PHASE" \
        --label "in-progress" \
        --assignee "@me" \
        --json number \
        --jq '.number' 2>/dev/null || echo "")
    
    if [[ -n "$ISSUE_NUMBER" ]]; then
        echo "✅ GitHub Issue created: #$ISSUE_NUMBER"
        
        # Update task file with issue number
        sed -i.bak "s/\*\*Status\*\*: 🔄 In Progress/\*\*Status\*\*: 🔄 In Progress\n\*\*GitHub Issue\*\*: #$ISSUE_NUMBER/" "$TASK_FILE"
        rm "$TASK_FILE.bak" 2>/dev/null || true
    else
        echo "⚠️  Could not create GitHub issue (check permissions)"
    fi
else
    echo "ℹ️  GitHub CLI not available or not configured"
    echo "💡 Install with: brew install gh && gh auth login"
fi

# Commit changes
echo "💾 Committing task start..."
git add plan/progress/current-sprint.md "$TASK_FILE" 2>/dev/null || true
git commit -m "start: begin task $TASK_ID

Task: $TASK_ID
Title: $TASK_TITLE  
Phase: $PHASE
Status: In Progress
Branch: task/$TASK_ID

Started implementation of $TASK_TITLE as part of Phase $PHASE.
" 2>/dev/null || {
    echo "ℹ️  No changes to commit (files already up to date)"
}

# Update progress dashboard
echo "📈 Updating progress dashboard..."
./plan/scripts/progress/progress-update.sh --task-start "$TASK_ID" "$PHASE" 2>/dev/null || {
    echo "⚠️  Progress update script not found or failed"
}

echo ""
echo "✅ Task $TASK_ID started successfully!"
echo ""
echo "📋 Summary:"
echo "   Task ID: $TASK_ID"
echo "   Title: $TASK_TITLE"
echo "   Phase: $PHASE"
echo "   Branch: task/$TASK_ID"
echo "   Status: 🔄 In Progress"
if [[ -n "$ISSUE_NUMBER" ]]; then
    echo "   GitHub Issue: #$ISSUE_NUMBER"
fi
echo ""
echo "🎯 Next Steps:"
echo "   1. Review task details in: $TASK_FILE"
echo "   2. Begin implementation"
echo "   3. Run tests frequently"
echo "   4. Complete with: ./plan/scripts/progress/task-complete.sh \"$TASK_ID\" \"Description\""
echo ""
echo "🔗 Useful Commands:"
echo "   View task file: cat $TASK_FILE"
echo "   Check progress: cat plan/progress/current-sprint.md"
echo "   Switch branches: git checkout main"
echo ""
echo "Happy coding! 🚀"