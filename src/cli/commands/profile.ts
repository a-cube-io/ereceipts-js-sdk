/**
 * Profile Management Commands
 * Handles user profile switching and management
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { BaseCommand } from './base/command.js';
import { loadConfig, saveConfig, listProfiles, deleteProfile } from '../config/index.js';
import type { BaseCommandOptions } from '../types.js';

export class ProfileListCommand extends BaseCommand {
  protected commandName = 'profile-list';
  
  protected async executeCommand(_options: BaseCommandOptions): Promise<void> {
    const config = await loadConfig();
    const profiles = await listProfiles();
    
    console.log(chalk.blue('Available Profiles'));
    console.log('─'.repeat(30));
    
    if (profiles.length === 0) {
      console.log(chalk.gray('No profiles found'));
      return;
    }
    
    profiles.forEach(profile => {
      const isCurrent = config.currentProfile === profile;
      const marker = isCurrent ? chalk.green('→') : ' ';
      const name = isCurrent ? chalk.green(profile) : profile;
      console.log(`${marker} ${name}`);
    });
  }
}

export class ProfileSwitchCommand extends BaseCommand {
  protected commandName = 'profile-switch';
  
  constructor(private profileName: string) {
    super();
  }
  
  protected async executeCommand(_options: BaseCommandOptions): Promise<void> {
    const profiles = await listProfiles();
    
    if (!profiles.includes(this.profileName)) {
      throw new Error(`Profile '${this.profileName}' not found. Available profiles: ${profiles.join(', ')}`);
    }
    
    const config = await loadConfig();
    config.currentProfile = this.profileName;
    await saveConfig(config);
    
    console.log(chalk.green(`✓ Switched to profile: ${this.profileName}`));
  }
}

export class ProfileDeleteCommand extends BaseCommand {
  protected commandName = 'profile-delete';
  
  constructor(private profileName: string) {
    super();
  }
  
  protected async executeCommand(_options: BaseCommandOptions): Promise<void> {
    const profiles = await listProfiles();
    
    if (!profiles.includes(this.profileName)) {
      throw new Error(`Profile '${this.profileName}' not found`);
    }
    
    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to delete profile '${this.profileName}'?`,
      default: false,
    }]);
    
    if (!confirm) {
      console.log(chalk.yellow('Profile deletion cancelled'));
      return;
    }
    
    await deleteProfile(this.profileName);
    
    // If we deleted the current profile, clear it
    const config = await loadConfig();
    if (config.currentProfile === this.profileName) {
      delete config.currentProfile;
      await saveConfig(config);
    }
    
    console.log(chalk.green(`✓ Profile '${this.profileName}' deleted`));
  }
}