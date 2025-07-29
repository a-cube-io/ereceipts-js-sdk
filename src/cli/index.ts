/**
 * A-Cube E-Receipt SDK CLI
 * Refactored modular CLI with clean command architecture
 */

import { Command } from 'commander';
import {
  // Auth commands
  LoginCommand,
  LogoutCommand,
  StatusCommand,
  RefreshCommand,
  
  // Config commands
  SetupCommand,
  ShowConfigCommand,
  
  // Resource commands
  ReceiptsCommand,
  CashiersCommand,
  MerchantsCommand,
  PointOfSalesCommand,
  
  // Profile commands
  ProfileListCommand,
  ProfileSwitchCommand,
  ProfileDeleteCommand,
  
  // Other commands
  InteractiveCommand,
  VersionCommand,
} from './commands/index.js';

const program = new Command();

// CLI metadata
program
  .name('acube')
  .description('A-Cube E-Receipt SDK CLI')
  .version('1.0.0');

// Authentication commands
const authCmd = program
  .command('auth')
  .description('Authentication management');

authCmd
  .command('login')
  .description('Login to your account')
  .option('-u, --username <username>', 'Username')
  .option('-p, --password <password>', 'Password')
  .option('--profile <profile>', 'Environment profile (sandbox/production/development)')
  .option('-r, --remember', 'Remember credentials')
  .option('-f, --force', 'Force login even if already authenticated')
  .action(async (options) => {
    await new LoginCommand().execute(options);
  });

authCmd
  .command('logout')
  .description('Logout from your account')
  .option('-f, --force', 'Force logout without confirmation')
  .action(async (options) => {
    await new LogoutCommand().execute(options);
  });

authCmd
  .command('status')
  .description('Show authentication status')
  .option('-v, --verbose', 'Show detailed information')
  .action(async (options) => {
    await new StatusCommand().execute(options);
  });

authCmd
  .command('refresh')
  .description('Refresh authentication token')
  .action(async (options) => {
    await new RefreshCommand().execute(options);
  });

// Configuration commands
const configCmd = program
  .command('config')
  .description('Configuration management');

configCmd
  .command('setup')
  .description('Interactive configuration setup')
  .action(async (options) => {
    await new SetupCommand().execute(options);
  });

configCmd
  .command('show')
  .description('Show current configuration')
  .action(async (options) => {
    await new ShowConfigCommand().execute(options);
  });

// Profile commands
const profileCmd = program
  .command('profile')
  .description('Profile management');

profileCmd
  .command('list')
  .description('List available profiles')
  .action(async (options) => {
    await new ProfileListCommand().execute(options);
  });

profileCmd
  .command('switch <name>')
  .description('Switch to a different profile')
  .action(async (name: string, options) => {
    await new ProfileSwitchCommand(name).execute(options);
  });

profileCmd
  .command('delete <name>')
  .description('Delete a profile')
  .action(async (name: string, options) => {
    await new ProfileDeleteCommand(name).execute(options);
  });

// Resource commands - Receipts
const receiptCmd = program
  .command('receipt')
  .alias('receipts')
  .description('Manage receipts');

receiptCmd
  .command('create')
  .description('Create a new receipt')
  .action(async (options) => {
    await new ReceiptsCommand().create(options);
  });

receiptCmd
  .command('get <id>')
  .description('Get a receipt by ID')
  .action(async (id: string, options) => {
    await new ReceiptsCommand().get(id, options);
  });

receiptCmd
  .command('list')
  .description('List receipts')
  .option('-l, --limit <number>', 'Number of receipts to fetch', '10')
  .option('-o, --offset <number>', 'Number of receipts to skip', '0')
  .option('--format <format>', 'Output format (table|json)', 'json')
  .action(async (options) => {
    await new ReceiptsCommand().list(options);
  });

receiptCmd
  .command('delete <id>')
  .description('Delete a receipt')
  .action(async (id: string, options) => {
    await new ReceiptsCommand().delete(id, options);
  });

// Resource commands - Cashiers
const cashierCmd = program
  .command('cashier')
  .alias('cashiers')
  .description('Manage cashiers');

cashierCmd
  .command('list')
  .description('List cashiers')
  .option('-l, --limit <number>', 'Number of cashiers to fetch', '10')
  .option('-o, --offset <number>', 'Number of cashiers to skip', '0')
  .option('--format <format>', 'Output format (table|json)', 'json')
  .action(async (options) => {
    await new CashiersCommand().list(options);
  });

// Resource commands - Merchants
const merchantCmd = program
  .command('merchant')
  .alias('merchants')
  .description('Manage merchants');

merchantCmd
  .command('list')
  .description('List merchants')
  .option('-l, --limit <number>', 'Number of merchants to fetch', '10')
  .option('--format <format>', 'Output format (table|json)', 'json')
  .action(async (options) => {
    await new MerchantsCommand().list(options);
  });

// Resource commands - Point of Sales
const posCmd = program
  .command('pos')
  .alias('point-of-sale')
  .description('Manage point of sales');

posCmd
  .command('list')
  .description('List point of sales')
  .option('-l, --limit <number>', 'Number of point of sales to fetch', '10')
  .option('-o, --offset <number>', 'Number of point of sales to skip', '0')
  .option('--format <format>', 'Output format (table|json)', 'json')
  .action(async (options) => {
    await new PointOfSalesCommand().execute(options);
  });

// Interactive mode
program
  .command('interactive')
  .alias('i')
  .description('Start interactive mode')
  .action(async (options) => {
    await new InteractiveCommand().execute(options);
  });

// Version command
program
  .command('version')
  .description('Show version information')
  .action(async (options) => {
    await new VersionCommand().execute(options);
  });

// Parse command line arguments
program.parse();

export { program };