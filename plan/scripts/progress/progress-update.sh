#!/bin/bash
set -e

# Progress Update Script - A-Cube SDK Enterprise Transformation
# Usage: ./progress-update.sh [OPTIONS]

# Parse command line arguments
TASK_START=""
TASK_COMPLETE=""
PHASE=""
DASHBOARD_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --task-start)
            TASK_START="$2"
            PHASE="$3"
            shift 3
            ;;
        --task-complete)
            TASK_COMPLETE="$2"
            PHASE="$3"
            shift 3
            ;;
        --dashboard-only)
            DASHBOARD_ONLY=true
            shift
            ;;
        *)
            echo "Unknown parameter: $1"
            echo "Usage: $0 [--task-start TASK_ID PHASE] [--task-complete TASK_ID PHASE] [--dashboard-only]"
            exit 1
            ;;
    esac
done

echo "📊 Updating progress dashboard..."

# Helper function to count completed tasks for a phase
count_completed_tasks() {
    local phase=$1
    local count=$(grep -c "✅ Task $phase\." plan/progress/completed-tasks.md 2>/dev/null || echo 0)
    echo "$count"
}

# Helper function to count total tasks for a phase
count_total_tasks() {
    local phase=$1
    local count=$(find "plan/tasks/phase-$phase" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
    if [[ -z "$count" || "$count" -eq 0 ]]; then
        # If no task files exist yet, use estimated counts from planning
        case $phase in
            1) echo 15 ;;
            2) echo 12 ;;
            3) echo 10 ;;
            4) echo 8 ;;
            5) echo 6 ;;
            6) echo 9 ;;
            *) echo 0 ;;
        esac
    else
        echo "$count"
    fi
}

# Helper function to calculate progress percentage
calculate_progress() {
    local completed=$1
    local total=$2
    if [[ $total -eq 0 ]]; then
        echo 0
    else
        echo $((completed * 100 / total))
    fi
}

# Get current timestamp
TIMESTAMP=$(date)
UPDATE_TIME=$(date '+%Y-%m-%d %H:%M:%S')

# Calculate progress for all phases
PHASE_1_COMPLETED=$(count_completed_tasks 1)
PHASE_1_TOTAL=$(count_total_tasks 1)
PHASE_1_PROGRESS=$(calculate_progress $PHASE_1_COMPLETED $PHASE_1_TOTAL)

PHASE_2_COMPLETED=$(count_completed_tasks 2)
PHASE_2_TOTAL=$(count_total_tasks 2)
PHASE_2_PROGRESS=$(calculate_progress $PHASE_2_COMPLETED $PHASE_2_TOTAL)

PHASE_3_COMPLETED=$(count_completed_tasks 3)
PHASE_3_TOTAL=$(count_total_tasks 3)
PHASE_3_PROGRESS=$(calculate_progress $PHASE_3_COMPLETED $PHASE_3_TOTAL)

PHASE_4_COMPLETED=$(count_completed_tasks 4)
PHASE_4_TOTAL=$(count_total_tasks 4)
PHASE_4_PROGRESS=$(calculate_progress $PHASE_4_COMPLETED $PHASE_4_TOTAL)

PHASE_5_COMPLETED=$(count_completed_tasks 5)
PHASE_5_TOTAL=$(count_total_tasks 5)
PHASE_5_PROGRESS=$(calculate_progress $PHASE_5_COMPLETED $PHASE_5_TOTAL)

PHASE_6_COMPLETED=$(count_completed_tasks 6)
PHASE_6_TOTAL=$(count_total_tasks 6)
PHASE_6_PROGRESS=$(calculate_progress $PHASE_6_COMPLETED $PHASE_6_TOTAL)

# Setup phase (always 100% complete)
PHASE_0_COMPLETED=5
PHASE_0_TOTAL=5
PHASE_0_PROGRESS=100

# Calculate total progress
TOTAL_COMPLETED=$((PHASE_0_COMPLETED + PHASE_1_COMPLETED + PHASE_2_COMPLETED + PHASE_3_COMPLETED + PHASE_4_COMPLETED + PHASE_5_COMPLETED + PHASE_6_COMPLETED))
TOTAL_TASKS=$((PHASE_0_TOTAL + PHASE_1_TOTAL + PHASE_2_TOTAL + PHASE_3_TOTAL + PHASE_4_TOTAL + PHASE_5_TOTAL + PHASE_6_TOTAL))
TOTAL_PROGRESS=$(calculate_progress $TOTAL_COMPLETED $TOTAL_TASKS)

# Determine current phase and status
CURRENT_PHASE="Phase 1 - Core Architecture"
CURRENT_STATUS="🔄 Ready to Start"

if [[ $PHASE_1_COMPLETED -gt 0 ]]; then
    CURRENT_STATUS="🔄 In Progress"
fi

if [[ $PHASE_1_PROGRESS -eq 100 ]]; then
    CURRENT_PHASE="Phase 2 - Developer Experience"
    CURRENT_STATUS="⏳ Ready to Start"
fi

if [[ $PHASE_2_COMPLETED -gt 0 ]]; then
    CURRENT_PHASE="Phase 2 - Developer Experience"
    CURRENT_STATUS="🔄 In Progress"
fi

# Continue this pattern for other phases...

# Helper function to get status emoji
get_status_emoji() {
    local progress=$1
    if [[ $progress -eq 0 ]]; then
        echo "⏳ Pending"
    elif [[ $progress -eq 100 ]]; then
        echo "✅ Complete"
    else
        echo "🔄 In Progress"
    fi
}

# Regenerate dashboard
cat > plan/progress/dashboard.md << EOF
# 📊 SDK Enterprise Transformation - Progress Dashboard

*Auto-updated on $TIMESTAMP*

## 🎯 Overall Progress

**Total Progress**: $TOTAL_PROGRESS% ($TOTAL_COMPLETED/$TOTAL_TASKS tasks completed)  
**Current Phase**: $CURRENT_PHASE  
**Timeline Status**: ✅ On Track  
**Quality Score**: 🟢 Excellent Setup

| Phase | Tasks | Completed | Progress | Status | Duration |
|-------|--------|-----------|----------|---------|----------|
| **Phase 0: Setup** | $PHASE_0_TOTAL | $PHASE_0_COMPLETED | $PHASE_0_PROGRESS% | ✅ Complete | 1 week |
| **Phase 1: Core Architecture** | $PHASE_1_TOTAL | $PHASE_1_COMPLETED | $PHASE_1_PROGRESS% | $(get_status_emoji $PHASE_1_PROGRESS) | 4-5 weeks |
| **Phase 2: Developer Experience** | $PHASE_2_TOTAL | $PHASE_2_COMPLETED | $PHASE_2_PROGRESS% | $(get_status_emoji $PHASE_2_PROGRESS) | 3-4 weeks |
| **Phase 3: Security & Compliance** | $PHASE_3_TOTAL | $PHASE_3_COMPLETED | $PHASE_3_PROGRESS% | $(get_status_emoji $PHASE_3_PROGRESS) | 3-4 weeks |
| **Phase 4: Plugin Architecture** | $PHASE_4_TOTAL | $PHASE_4_COMPLETED | $PHASE_4_PROGRESS% | $(get_status_emoji $PHASE_4_PROGRESS) | 3-4 weeks |
| **Phase 5: Performance** | $PHASE_5_TOTAL | $PHASE_5_COMPLETED | $PHASE_5_PROGRESS% | $(get_status_emoji $PHASE_5_PROGRESS) | 2-3 weeks |
| **Phase 6: Testing & Quality** | $PHASE_6_TOTAL | $PHASE_6_COMPLETED | $PHASE_6_PROGRESS% | $(get_status_emoji $PHASE_6_PROGRESS) | 2-3 weeks |

**Grand Total**: $TOTAL_PROGRESS% ($TOTAL_COMPLETED/$TOTAL_TASKS tasks completed)

## 📈 Current Sprint Status

### Active Phase: $CURRENT_PHASE
**Status**: $CURRENT_STATUS  
**Progress**: $PHASE_1_PROGRESS% ($PHASE_1_COMPLETED/$PHASE_1_TOTAL tasks)  

$(if [[ -f "plan/progress/current-sprint.md" ]]; then
    echo "### Current Sprint Details"
    grep -A 10 "Current Task\|Last Completed Task" plan/progress/current-sprint.md 2>/dev/null | head -5 || echo "No current sprint details available"
fi)

## 🎯 Phase 1 Detailed Progress

### 1.1 Resource-Based SDK Core (Week 2)
| Task | Status | Progress | Target |
|------|--------|----------|---------|
| 1.1.1 ACubeSDK Core Class | $(if grep -q "✅ Task 1\.1\.1" plan/progress/completed-tasks.md 2>/dev/null; then echo "✅ Complete"; else echo "⏳ Pending"; fi) | $(if grep -q "✅ Task 1\.1\.1" plan/progress/completed-tasks.md 2>/dev/null; then echo "100%"; else echo "0%"; fi) | 2-3 days |
| 1.1.2 BaseResource Abstract Class | $(if grep -q "✅ Task 1\.1\.2" plan/progress/completed-tasks.md 2>/dev/null; then echo "✅ Complete"; else echo "⏳ Pending"; fi) | $(if grep -q "✅ Task 1\.1\.2" plan/progress/completed-tasks.md 2>/dev/null; then echo "100%"; else echo "0%"; fi) | 2 days |
| 1.1.3 Lazy Loading Pattern | $(if grep -q "✅ Task 1\.1\.3" plan/progress/completed-tasks.md 2>/dev/null; then echo "✅ Complete"; else echo "⏳ Pending"; fi) | $(if grep -q "✅ Task 1\.1\.3" plan/progress/completed-tasks.md 2>/dev/null; then echo "100%"; else echo "0%"; fi) | 1 day |
| 1.1.4 Resource Factory System | $(if grep -q "✅ Task 1\.1\.4" plan/progress/completed-tasks.md 2>/dev/null; then echo "✅ Complete"; else echo "⏳ Pending"; fi) | $(if grep -q "✅ Task 1\.1\.4" plan/progress/completed-tasks.md 2>/dev/null; then echo "100%"; else echo "0%"; fi) | 2 days |
| 1.1.5 Smart Resource Caching | $(if grep -q "✅ Task 1\.1\.5" plan/progress/completed-tasks.md 2>/dev/null; then echo "✅ Complete"; else echo "⏳ Pending"; fi) | $(if grep -q "✅ Task 1\.1\.5" plan/progress/completed-tasks.md 2>/dev/null; then echo "100%"; else echo "0%"; fi) | 1 day |

### 1.2 Advanced HTTP Engine (Week 3)
| Task | Status | Progress | Target |
|------|--------|----------|---------|
| 1.2.1 Circuit Breaker Pattern | $(if grep -q "✅ Task 1\.2\.1" plan/progress/completed-tasks.md 2>/dev/null; then echo "✅ Complete"; else echo "⏳ Pending"; fi) | $(if grep -q "✅ Task 1\.2\.1" plan/progress/completed-tasks.md 2>/dev/null; then echo "100%"; else echo "0%"; fi) | 2 days |
| 1.2.2 Middleware Pipeline | $(if grep -q "✅ Task 1\.2\.2" plan/progress/completed-tasks.md 2>/dev/null; then echo "✅ Complete"; else echo "⏳ Pending"; fi) | $(if grep -q "✅ Task 1\.2\.2" plan/progress/completed-tasks.md 2>/dev/null; then echo "100%"; else echo "0%"; fi) | 2 days |
| 1.2.3 Smart Retry Engine | $(if grep -q "✅ Task 1\.2\.3" plan/progress/completed-tasks.md 2>/dev/null; then echo "✅ Complete"; else echo "⏳ Pending"; fi) | $(if grep -q "✅ Task 1\.2\.3" plan/progress/completed-tasks.md 2>/dev/null; then echo "100%"; else echo "0%"; fi) | 1 day |
| 1.2.4 Request Deduplication | $(if grep -q "✅ Task 1\.2\.4" plan/progress/completed-tasks.md 2>/dev/null; then echo "✅ Complete"; else echo "⏳ Pending"; fi) | $(if grep -q "✅ Task 1\.2\.4" plan/progress/completed-tasks.md 2>/dev/null; then echo "100%"; else echo "0%"; fi) | 1 day |
| 1.2.5 Automatic Rate Limiting | $(if grep -q "✅ Task 1\.2\.5" plan/progress/completed-tasks.md 2>/dev/null; then echo "✅ Complete"; else echo "⏳ Pending"; fi) | $(if grep -q "✅ Task 1\.2\.5" plan/progress/completed-tasks.md 2>/dev/null; then echo "100%"; else echo "0%"; fi) | 1 day |

### 1.3 TypeScript-First Type System (Weeks 4-5)
| Task | Status | Progress | Target |
|------|--------|----------|---------|
| 1.3.1 Branded Types System | $(if grep -q "✅ Task 1\.3\.1" plan/progress/completed-tasks.md 2>/dev/null; then echo "✅ Complete"; else echo "⏳ Pending"; fi) | $(if grep -q "✅ Task 1\.3\.1" plan/progress/completed-tasks.md 2>/dev/null; then echo "100%"; else echo "0%"; fi) | 2 days |
| 1.3.2 Discriminated Unions | $(if grep -q "✅ Task 1\.3\.2" plan/progress/completed-tasks.md 2>/dev/null; then echo "✅ Complete"; else echo "⏳ Pending"; fi) | $(if grep -q "✅ Task 1\.3\.2" plan/progress/completed-tasks.md 2>/dev/null; then echo "100%"; else echo "0%"; fi) | 2 days |
| 1.3.3 Template Literal Types | $(if grep -q "✅ Task 1\.3\.3" plan/progress/completed-tasks.md 2>/dev/null; then echo "✅ Complete"; else echo "⏳ Pending"; fi) | $(if grep -q "✅ Task 1\.3\.3" plan/progress/completed-tasks.md 2>/dev/null; then echo "100%"; else echo "0%"; fi) | 2 days |
| 1.3.4 Conditional Types | $(if grep -q "✅ Task 1\.3\.4" plan/progress/completed-tasks.md 2>/dev/null; then echo "✅ Complete"; else echo "⏳ Pending"; fi) | $(if grep -q "✅ Task 1\.3\.4" plan/progress/completed-tasks.md 2>/dev/null; then echo "100%"; else echo "0%"; fi) | 2 days |
| 1.3.5 Auto-Generated Types | $(if grep -q "✅ Task 1\.3\.5" plan/progress/completed-tasks.md 2>/dev/null; then echo "✅ Complete"; else echo "⏳ Pending"; fi) | $(if grep -q "✅ Task 1\.3\.5" plan/progress/completed-tasks.md 2>/dev/null; then echo "100%"; else echo "0%"; fi) | 2 days |

## 🚨 Blockers & Issues

**Current Blockers**: None  
**Resolved Issues**: 5 (Project setup completed)

## 📊 Quality Metrics

| Metric | Current | Target | Status | Trend |
|--------|---------|--------|---------|-------|
| **Test Coverage** | - | >98% | 🔴 Not Started | - |
| **Bundle Size** | - | <50KB | 🔴 Not Started | - |
| **Type Safety** | - | 100% | 🔴 Not Started | - |
| **Security Score** | - | A+ | 🔴 Not Started | - |
| **Performance Score** | - | >90 | 🔴 Not Started | - |
| **Documentation** | 95% | 100% | 🟡 Excellent | ↗️ |

## 🏆 Recent Achievements

$(if [[ -f "plan/progress/completed-tasks.md" ]]; then
    echo "### Latest Completed Tasks"
    tail -n 20 plan/progress/completed-tasks.md | grep "## ✅" | tail -3 || echo "No completed tasks yet"
fi)

## 📅 Upcoming Milestones

### Week 2 Targets (Phase 1.1)
- 🎯 **Complete Task 1.1.1**: ACubeSDK Core Class
- 🎯 **Begin Task 1.1.2**: BaseResource implementation
- 🎯 **Setup Test Infrastructure**: Testing framework
- 🎯 **Establish CI/CD**: Automated quality gates

### Major Project Milestones
- **Week 6**: Phase 1 Complete - Core Architecture
- **Week 10**: Phase 2 Complete - Developer Experience
- **Week 14**: Phase 3 Complete - Security & Compliance
- **Week 18**: Phase 4 Complete - Plugin Architecture
- **Week 20**: Phase 5 Complete - Performance
- **Week 23**: Phase 6 Complete - Launch Ready

## 🔗 Quick Links

### Project Management
- 📋 [Project Charter](../project-charter.md) - Vision and goals
- 🗓 [Timeline & Roadmap](../timeline-roadmap.md) - Detailed schedule
- 📝 [Current Sprint](current-sprint.md) - Active work details

### Phase Documentation
- 🏗 [Phase 1: Core Architecture](../phases/phase-1-core-architecture.md)
- 🛠 [Phase 2: Developer Experience](../phases/phase-2-developer-experience.md)
- 🔒 [Phase 3: Security & Compliance](../phases/phase-3-security-compliance.md)

### Development Tools
- 🤖 [Automation Scripts](../scripts/) - Task and progress management
- 📊 [Quality Gates](../config/quality-gates.json) - Validation criteria
- 🔄 [GitHub Integration](../scripts/github/) - Repository management

## 📈 Velocity & Trends

### Team Velocity
- **Week 1**: 5 tasks completed (Setup phase)
- **Current Sprint**: $PHASE_1_COMPLETED tasks completed
- **Target Velocity**: 3-4 tasks/week (sustainable pace)

### Progress Trends
- **Overall Progress**: $TOTAL_PROGRESS%
- **Current Phase**: $PHASE_1_PROGRESS%
- **Quality Setup**: 95% → 100% (automation ready)

## 🎯 Success Indicators

### Green Indicators ✅
- Project setup completed successfully
- Quality gates established and functional
- Documentation comprehensive and updated
- Automation scripts operational
- Team velocity sustainable

### Watch Items 🟡
$(if [[ $PHASE_1_PROGRESS -gt 0 && $PHASE_1_PROGRESS -lt 100 ]]; then echo "- Phase 1 development in progress"; fi)
- Type system complexity (TypeScript 5.0 features)
- Performance benchmark establishment

### Risk Items 🔴
- None currently identified

---

**Dashboard Last Updated**: $UPDATE_TIME  
**Next Update**: Automated on task completion  
**Update Frequency**: Real-time during development  
**Data Source**: Automated progress tracking

**Status Summary**: $(if [[ $TOTAL_PROGRESS -lt 10 ]]; then echo "✅ Project launched successfully with comprehensive setup. Ready for development."; elif [[ $TOTAL_PROGRESS -lt 50 ]]; then echo "🔄 Development in progress with strong momentum."; else echo "🚀 Excellent progress toward enterprise-grade SDK completion."; fi)
EOF

# Log the update
if [[ "$DASHBOARD_ONLY" != true ]]; then
    if [[ -n "$TASK_START" ]]; then
        echo "📈 Updated dashboard for task start: $TASK_START (Phase $PHASE)"
    elif [[ -n "$TASK_COMPLETE" ]]; then
        echo "📈 Updated dashboard for task completion: $TASK_COMPLETE (Phase $PHASE)"
    else
        echo "📈 Updated dashboard (manual refresh)"
    fi
fi

echo "✅ Progress dashboard updated successfully!"

# If we have GitHub CLI, update project board
if command -v gh &> /dev/null && gh auth status &> /dev/null 2>&1; then
    echo "📋 Updating GitHub project board..."
    # This would update GitHub project fields if configured
    # For now, just log the capability
    echo "ℹ️  GitHub project integration available (not yet configured)"
fi

echo "📊 Dashboard available at: plan/progress/dashboard.md"