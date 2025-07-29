/**
 * CLI Types and Interfaces
 * Centralized type definitions for the CLI application
 */

import type { AuthUser } from '../auth/types.js';

// Error tracing configuration
export interface TraceConfig {
  enabled: boolean;
  level: 'basic' | 'detailed' | 'verbose' | 'debug';
  includeStack: boolean;
  includeContext: boolean;
  includeTimestamp: boolean;
  outputFormat: 'json' | 'pretty' | 'compact';
}

// Configuration and state management
export interface CLIConfig {
  environment: 'sandbox' | 'production' | 'development';
  baseUrls?: {
    api?: string;
    auth?: string;
  };
  currentProfile?: string;
  trace?: TraceConfig;
}

export interface CLIAuthState {
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser;
  expiresAt?: number;
}

// Command execution context
export interface CommandContext {
  config: CLIConfig;
  auth?: CLIAuthState;
  profile?: string;
}

// Command options
export interface BaseCommandOptions {
  profile?: string;
  trace?: boolean;
  verbose?: boolean;
}

export interface ResourceListOptions extends BaseCommandOptions {
  limit?: number;
  offset?: number;
  format?: 'table' | 'json';
}

export interface AuthCommandOptions extends BaseCommandOptions {
  remember?: boolean;
  force?: boolean;
}

// Process management
export type ProcessStatus = 'success' | 'error' | 'cancelled';

export interface ProcessResult {
  status: ProcessStatus;
  message?: string;
  data?: any;
  error?: Error;
}

// Custom error classes for better CLI error handling
export class AuthenticationRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationRequiredError';
  }
}