/**
 * Auth Status Command Implementation
 * Shows current authentication status
 */

import chalk from 'chalk';
import { BaseCommand } from '../base/command.js';
import { loadAuth, loadConfig } from '../../config/index.js';
import type { AuthCommandOptions } from '../../types.js';

export class StatusCommand extends BaseCommand {
  protected commandName = 'auth-status';
  
  protected async executeCommand(_options: AuthCommandOptions): Promise<void> {
    const config = await loadConfig();
    const auth = await loadAuth(config.currentProfile);
    
    console.log(chalk.blue('Authentication Status'));
    console.log('─'.repeat(40));
    
    if (!auth || !auth.accessToken) {
      console.log(chalk.red('❌ Not authenticated'));
      console.log(chalk.gray('Run "acube auth login" to authenticate'));
      return;
    }
    
    // Parse token to get expiration info
    let tokenInfo: any = null;
    let isExpired = false;
    
    try {
      // Simple token parsing for CLI (without full TokenManager)
      if (auth.accessToken) {
        const parts = auth.accessToken.split('.');
        if (parts.length === 3 && parts[1]) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          tokenInfo = payload;
        }
      }
      
      const expiresAt = auth.expiresAt || (tokenInfo?.exp ? tokenInfo.exp * 1000 : null);
      isExpired = expiresAt ? Date.now() >= expiresAt : false;
      
    } catch (error) {
      console.log('🔧 Debug: Failed to parse token:', error);
    }
    
    if (isExpired) {
      console.log(chalk.red('❌ Token expired'));
      console.log(chalk.gray('Run "acube auth login" to re-authenticate'));
      return;
    }
    
    console.log(chalk.green('✅ Authenticated'));
    
    if (auth.user) {
      console.log(`Email: ${chalk.cyan(auth.user.email)}`);
      console.log(`Roles: ${chalk.cyan(auth.user.roles?.join(', ') || 'N/A')}`);
    }
    
    if (config.currentProfile) {
      console.log(`Profile: ${chalk.cyan(config.currentProfile)}`);
    }
    
    if (auth.expiresAt) {
      console.log(`Expires: ${chalk.gray(new Date(auth.expiresAt).toLocaleString())}`);
    }
    
    console.log(`Environment: ${chalk.cyan(config.environment)}`);
    console.log(`Token length: ${chalk.gray(auth.accessToken.length)} characters`);
  }
}