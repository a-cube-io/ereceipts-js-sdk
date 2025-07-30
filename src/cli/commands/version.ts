/**
 * Version Command Implementation
 * Displays CLI and SDK version information
 */

import chalk from 'chalk';

import { BaseCommand } from './base/command.js';

import type { BaseCommandOptions } from '../types.js';

export class VersionCommand extends BaseCommand {
  protected commandName = 'version';

  protected async executeCommand(_options: BaseCommandOptions): Promise<void> {
    // Import package.json to get version info
    try {
      // Read package.json from the project root
      const fs = await import('fs/promises');
      const path = await import('path');
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageData = JSON.parse(await fs.readFile(packagePath, 'utf-8'));

      console.log(chalk.blue('A-Cube E-Receipt SDK'));
      console.log(`Version: ${chalk.green(packageData.version)}`);
      console.log(`Node.js: ${chalk.gray(process.version)}`);
      console.log(`Platform: ${chalk.gray(process.platform)} ${chalk.gray(process.arch)}`);

    } catch (error) {
      console.log(chalk.blue('A-Cube E-Receipt SDK'));
      console.log(`Version: ${chalk.gray('Unknown')}`);
      console.log(`Node.js: ${chalk.gray(process.version)}`);
      console.log(`Platform: ${chalk.gray(process.platform)} ${chalk.gray(process.arch)}`);
    }
  }
}
