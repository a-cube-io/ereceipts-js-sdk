/**
 * Configuration Management
 * Handles CLI configuration, authentication state, and profiles
 */

import path from 'path';
import fs from 'fs/promises';

import { AUTH_FILE, CONFIG_DIR, CONFIG_FILE, PROFILES_DIR, DEFAULT_TRACE_CONFIG } from './constants.js';

import type { CLIConfig, CLIAuthState } from '../types.js';

// Utility functions
export async function ensureConfigDir(): Promise<void> {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    await fs.mkdir(PROFILES_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

export async function loadConfig(): Promise<CLIConfig> {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    const config = JSON.parse(data);

    // Ensure trace config has all required properties
    if (config.trace) {
      config.trace = { ...DEFAULT_TRACE_CONFIG, ...config.trace };
    }

    return config;
  } catch (error) {
    // Return default config if file doesn't exist
    return {
      environment: 'sandbox',
      trace: DEFAULT_TRACE_CONFIG,
    };
  }
}

export async function saveConfig(config: CLIConfig): Promise<void> {
  await ensureConfigDir();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export async function loadAuth(profile?: string): Promise<CLIAuthState | null> {
  try {
    const authFile = profile ? path.join(PROFILES_DIR, `${profile}.json`) : AUTH_FILE;
    const data = await fs.readFile(authFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

export async function saveAuth(auth: CLIAuthState, profile?: string): Promise<void> {
  await ensureConfigDir();
  const authFile = profile ? path.join(PROFILES_DIR, `${profile}.json`) : AUTH_FILE;
  await fs.writeFile(authFile, JSON.stringify(auth, null, 2));
}

export async function clearAuth(profile?: string): Promise<void> {
  try {
    const authFile = profile ? path.join(PROFILES_DIR, `${profile}.json`) : AUTH_FILE;
    await fs.unlink(authFile);
  } catch (error) {
    // File might not exist, ignore error
  }
}

export async function listProfiles(): Promise<string[]> {
  try {
    const files = await fs.readdir(PROFILES_DIR);
    return files
      .filter(file => file.endsWith('.json'))
      .map(file => path.basename(file, '.json'));
  } catch (error) {
    return [];
  }
}

export async function deleteProfile(name: string): Promise<void> {
  const profileFile = path.join(PROFILES_DIR, `${name}.json`);
  await fs.unlink(profileFile);
}
