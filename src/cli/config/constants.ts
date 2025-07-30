/**
 * CLI Configuration Constants
 */

import os from 'os';
import path from 'path';

import type { TraceConfig } from '../types.js';

// File paths for CLI configuration
export const CONFIG_DIR = path.join(os.homedir(), '.acube');
export const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
export const AUTH_FILE = path.join(CONFIG_DIR, 'auth.json');
export const PROFILES_DIR = path.join(CONFIG_DIR, 'profiles');

// Default trace configuration
export const DEFAULT_TRACE_CONFIG: TraceConfig = {
  enabled: false,
  level: 'basic',
  includeStack: false,
  includeContext: true,
  includeTimestamp: true,
  outputFormat: 'pretty',
};
