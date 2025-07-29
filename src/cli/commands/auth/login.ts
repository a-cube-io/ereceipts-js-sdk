/**
 * Login Command Implementation
 * Handles user authentication
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { BaseCommand } from '../base/command.js';
import { initializeSDK } from '../../utils/sdk.js';
import { saveAuth, loadConfig, saveConfig } from '../../config/index.js';
import type { AuthCommandOptions } from '../../types.js';

interface LoginOptions extends AuthCommandOptions {
  username?: string;
  password?: string;
  profile?: string;
}

export class LoginCommand extends BaseCommand {
  protected commandName = 'login';
  
  protected async executeCommand(options: LoginOptions): Promise<void> {
    console.log(chalk.blue('A-Cube E-Receipt Authentication'));
    
    // Get current config
    let config = await loadConfig();
    
    // Handle --profile option
    if (options.profile) {
      // Update environment based on profile
      const envMap: Record<string, 'sandbox' | 'production' | 'development'> = {
        'sandbox': 'sandbox',
        'production': 'production', 
        'development': 'development',
        'dev': 'development',
        'prod': 'production'
      };
      
      const environment = envMap[options.profile.toLowerCase()] || 'sandbox';
      config = { ...config, environment };
      
      // Save updated config
      await saveConfig(config);
      console.log(chalk.gray(`Environment set to: ${environment}`));
    }
    
    // Get credentials from options or prompt user
    let credentials: { username: string; password: string };
    
    if (options.username && options.password) {
      credentials = {
        username: options.username,
        password: options.password
      };
      console.log(chalk.gray(`Logging in as: ${options.username}`));
    } else {
      const prompts = [];
      
      if (!options.username) {
        prompts.push({
          type: 'input',
          name: 'username',
          message: 'Username:',
          validate: (input: string) => input.length > 0 || 'Please enter a username',
        });
      }
      
      if (!options.password) {
        prompts.push({
          type: 'password',
          name: 'password',
          message: 'Password:',
          mask: '*',
        });
      }
      
      const prompted = await inquirer.prompt(prompts);
      credentials = {
        username: options.username || prompted.username,
        password: options.password || prompted.password
      };
    }
    
    const spinner = ora('Authenticating...').start();
    
    try {
      // Initialize SDK (without requiring auth)
      const sdk = await initializeSDK(false);
      
      // Perform login
      const user = await sdk.login({
        username: credentials.username,
        password: credentials.password,
      });
      
      // Get the auth state from the SDK to retrieve the access token
      const authState = sdk.getAuthState();
      
      // Calculate expiration from token or default to 24 hours
      let expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours default
      if (authState && authState.expiresAt) {
        expiresAt = authState.expiresAt;
      }
      
      // Config already loaded and potentially updated above
      
      // Save authentication state with token
      await saveAuth({
        user,
        accessToken: authState?.accessToken || null,
        refreshToken: authState?.refreshToken || null,
        expiresAt,
      }, config.currentProfile);
      
      spinner.succeed('Authentication successful');
      
      console.log(`Welcome, ${chalk.green(user.email)}!`);
      console.log(`Roles: ${chalk.cyan(user.roles?.join(', ') || 'N/A')}`);
      console.log(`Session expires: ${chalk.gray(new Date(expiresAt).toLocaleString())}`);
      
    } catch (error: any) {
      spinner.fail('Authentication failed');
      throw error;
    }
  }
}