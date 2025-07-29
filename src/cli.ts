/**
 * A-Cube E-Receipt SDK CLI Entry Point
 * 
 * This file has been refactored into a modular architecture.
 * The original implementation is backed up as cli.ts.backup
 * 
 * New architecture:
 * - src/cli/index.ts - Main CLI with command registration
 * - src/cli/commands/ - Individual command implementations
 * - src/cli/utils/ - Shared utilities
 * - src/cli/config/ - Configuration management
 */

// Re-export the modular CLI
export * from './cli/index.js';