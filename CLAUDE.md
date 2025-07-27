# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

⚠️ Rules
Core Principles
* MVP Mindset: Think minimum viable solution first, iterate later
* Simplicity Above All: Every change should impact the least amount of code possible
* Zero Laziness Policy: Find root causes, implement proper fixes, never use temporary solutions
* Senior Developer Standards: Apply rigorous engineering practices consistently
Planning Phase
1. Initial Analysis
* Always start in planning mode - no exceptions
* Read and understand the existing codebase thoroughly
* Identify all relevant files and dependencies
* Research external knowledge/packages if needed using available tools
2. Plan Documentation
* Write comprehensive plan to claude/tasks/TASK_NAME.md
* Include:
    * Detailed implementation strategy with reasoning
    * Broken down, checkable task items
    * Technical considerations and constraints
    * Potential risks and mitigation strategies
3. Plan Approval
* STOP and request review - never proceed without explicit approval
* Present plan clearly with rationale
* Wait for confirmation before any implementation
Implementation Phase
4. Task Execution
* Work through tasks systematically in planned order
* Mark tasks complete as you finish them
* Update plan dynamically as requirements evolve
5. Change Documentation
* Provide high-level explanation for each change made
* Append detailed descriptions to plan file for knowledge transfer
* Maintain clear audit trail of all modifications
6. Quality Standards
* Root Cause Analysis: Always identify and fix underlying issues
* Minimal Impact: Touch only necessary code relevant to the task
* Bug Prevention: Prioritize not introducing new issues over speed
* Code Simplicity: Choose the most straightforward implementation path
Completion Phase
7. Final Review
* Add comprehensive review section to TASK_NAME.md
* Summarize all changes made and their impact
* Document any lessons learned or future considerations
* Ensure complete knowledge transfer documentation
Non-Negotiable Rules
1. No lazy solutions - temporary fixes are prohibited
2. Simplicity first - complex solutions require justification
3. Plan approval required - no implementation without sign-off
4. Complete documentation - every change must be explained
5. Senior-level quality - code must meet professional standards



## Development Commands

**Essential Commands:**
```bash
# Build the project (ESM output via tsup)
npm run build

# Development with hot reload
npm run dev

# Type checking
npm run typecheck

# Linting with auto-fix
npm run lint:fix

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Single test file
npm test -- src/__tests__/path/to/specific.test.ts

# Coverage report
npm test -- --coverage

# Pre-publish checks (build + test + lint)
npm run prepublishOnly
```

**Build System:**
- Uses `tsup` for ESM-only output targeting Node 18+
- TypeScript strict mode with comprehensive type checking
- Source maps and declaration files generated
- Native dependency externalization (keytar)

## Architecture Overview

### Core Architecture Pattern
**Enterprise SDK with Stripe-Style Resource Architecture:**
- Main SDK class (`ACubeSDK`) with lazy-loaded resource properties
- OpenAPI-first design with generated types and endpoints
- Event-driven architecture using EventEmitter3
- Dual HTTP clients (API + Auth) with middleware stack
- Cross-platform compatibility (Node.js CLI focused)

### Key Architectural Components

**1. Core SDK (`src/core/sdk.ts`)**
- Central `ACubeSDK` class extending EventEmitter
- Lazy-loaded resources: `cashiers`, `receipts`, `pointOfSales`, `merchants`, `pems`, `cashRegisters`
- Environment management (sandbox/production/development)
- HTTP client orchestration with separate API and Auth clients
- Configuration merging with sensible defaults

**2. Resource Layer (`src/resources/`)**
- OpenAPI-generated resource classes inheriting from `BaseOpenAPIResource`
- Type-safe operations with automatic parameter binding
- Schema validation and comprehensive error handling
- Audit trail and metadata tracking integration

**3. HTTP Client Stack (`src/http/`)**
- Enterprise-grade HTTP client with middleware architecture
- Circuit breaker pattern for fault tolerance
- Retry handler with exponential backoff
- Request/response middleware pipeline
- Comprehensive error handling and logging

**4. Generated Layer (`src/generated/`)**
- Auto-generated from `openapi.yaml` specification
- Type-safe endpoint definitions with operation metadata
- Complete TypeScript interfaces for request/response types
- Branded types for ID safety

**5. React Integration (`src/hooks/react/`)**
- Query hooks with caching and optimistic updates
- Mutation hooks with offline support
- Subscription system for real-time updates
- Provider pattern for state management

### Type System Architecture

**Branded Types (`src/types/branded.ts`):**
- ID types are branded to prevent mixing (CashierId, ReceiptId, etc.)
- Runtime validation with compile-time safety
- Used throughout the SDK for type safety

**Generated Types (`src/types/generated.ts`):**
- Auto-generated from OpenAPI specification
- Complete API contract types with XOR/OneOf helpers
- Never edit manually - regenerate from spec

### Configuration System

**Environment Handling:**
- `sandbox`: Default development environment
- `production`: Live Italian tax system
- `development`: Local testing environment
- Automatic base URL resolution per environment

**HTTP Configuration:**
- Separate configs for API (`DEFAULT_HTTP_CONFIG`) and Auth (`AUTH_HTTP_CONFIG`)
- Middleware-based authentication injection
- Circuit breaker and retry policies configurable

## Testing Strategy

**Test Architecture:**
- Jest with ts-jest for TypeScript compilation
- ESM module support with proper transformations
- Comprehensive coverage requirements (90% all metrics)
- Platform-specific test utilities in `src/__tests__/setup.ts`

**Test Categories:**
- Unit tests for core SDK and utilities
- OpenAPI resource integration tests
- HTTP client and middleware tests  
- Error handling and validation tests
- E2E workflow and performance tests

**Coverage Exclusions:**
- Generated type files (`src/types/generated.ts`)
- Test files and setup utilities
- Type declaration files

## OpenAPI Integration

**Code Generation Workflow:**
- `openapi.yaml` is the source of truth for API contracts
- Types are generated into `src/types/generated.ts`
- Endpoint definitions in `src/generated/endpoints.ts`
- Resource classes implement operations using generated definitions

**Key OpenAPI Resources:**
- **Cashiers**: User account management
- **Receipts**: E-receipt lifecycle management
- **Merchants**: Business entity operations
- **Point of Sales**: POS device management
- **Cash Registers**: Device registration
- **PEMs**: Electronic memorization devices

## Module System & Imports

**Path Aliases:**
- `@/` maps to `src/` directory for clean imports
- TypeScript configured with bundler module resolution
- ESM-first with `.js` extensions in imports (TypeScript requirement)

**Export Strategy:**
- Main exports through `src/index.ts`
- Resource-specific exports for tree-shaking
- Type-only exports clearly marked
- Default export of main SDK class

## Development Patterns

**Error Handling:**
- Custom error hierarchy extending base `ACubeSDKError`
- Context-aware error creation from HTTP responses
- Audit trail integration for compliance
- Comprehensive error metadata and recovery guidance

**Security Considerations:**
- Strict TypeScript configuration with no implicit any
- OpenAPI schema validation at runtime
- Secure token handling with platform-specific storage
- Comprehensive input validation and sanitization

**Performance Optimizations:**
- Lazy resource loading to minimize initial bundle
- Tree-shakeable exports for optimal bundle size
- Circuit breaker pattern for fault tolerance
- Caching strategies in React hooks

## CLI-Specific Features

This is a CLI tool package with:
- Binary executables: `acube` and `acube-cli`
- CLI framework using Commander.js
- Interactive prompts with Inquirer
- Development tools for SDK scaffolding
- Webhook development and testing utilities

**Key Dependencies:**
- `chalk`: Terminal styling
- `inquirer`: Interactive prompts  
- `express`: Webhook server
- `ngrok`: Tunneling for webhook testing
- `keytar`: Secure credential storage

## Important Files to Understand

**Core Architecture:**
- `src/core/sdk.ts` - Main SDK class and configuration
- `src/resources/base-openapi.ts` - Resource base class pattern
- `src/http/client.ts` - HTTP client implementation

**Type Safety:**
- `src/types/branded.ts` - ID type safety system
- `src/generated/endpoints.ts` - OpenAPI endpoint definitions
- `openapi.yaml` - API specification source

**Development Tools:**
- `tsup.config.ts` - Build configuration
- `jest.config.ts` - Test runner setup
- `.eslintrc.cjs` - Code quality rules