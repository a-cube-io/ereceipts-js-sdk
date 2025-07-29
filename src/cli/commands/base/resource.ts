/**
 * Base Resource Command Class
 * Abstract base class for resource management commands (CRUD operations)
 */

import ora from 'ora';
import chalk from 'chalk';
import { BaseCommand } from './command.js';
import { initializeSDK } from '../../utils/sdk.js';
import type { ACubeSDK } from '../../../index.js';
import type { ResourceListOptions, BaseCommandOptions } from '../../types.js';

export abstract class BaseResourceCommand extends BaseCommand {
  protected abstract resourceName: string;
  protected abstract resourceNamePlural: string;
  
  /**
   * Get the SDK resource instance (e.g., sdk.receipts, sdk.cashiers)
   */
  protected abstract getSDKResource(sdk: ACubeSDK): any;
  
  /**
   * Display a list of resource items
   */
  protected abstract displayItems(items: any[]): void;
  
  /**
   * List resources with common pagination and error handling
   */
  async list(options: ResourceListOptions): Promise<void> {
    const spinner = ora(`Fetching ${this.resourceNamePlural}...`).start();
    
    try {
      const sdk = await initializeSDK();
      const resource = this.getSDKResource(sdk);
      
      // Prepare API parameters
      const params: any = {};
      if (options.limit) params.limit = parseInt(options.limit.toString());
      if (options.offset) params.offset = parseInt(options.offset.toString());
      
      // Call the API
      const response = await resource.list(params);
      const items = this.extractItemsFromResponse(response);
      
      spinner.succeed(`Found ${items.length} ${this.resourceNamePlural}`);
      
      if (items.length === 0) {
        console.log(chalk.gray(`No ${this.resourceNamePlural} found`));
      } else {
        // Support different output formats
        if (options.format === 'json') {
          console.log(JSON.stringify(items, null, 2));
        } else {
          this.displayItems(items);
        }
      }
      
      // Ensure the method completes to allow proper exit
      return;
      
    } catch (error: any) {
      spinner.fail(`Failed to fetch ${this.resourceNamePlural}`);
      throw error;
    }
  }
  
  /**
   * Get a single resource by ID
   */
  async get(id: string, _options: BaseCommandOptions): Promise<void> {
    const spinner = ora(`Fetching ${this.resourceName}...`).start();
    
    try {
      const sdk = await initializeSDK();
      const resource = this.getSDKResource(sdk);
      
      const item = await resource.retrieve(id);
      
      spinner.succeed(`Found ${this.resourceName}`);
      
      this.displaySingleItem(item);
      return;
    } catch (error: any) {
      spinner.fail(`Failed to fetch ${this.resourceName}`);
      throw error;
    }
  }
  
  /**
   * Delete a resource by ID
   */
  async delete(id: string, _options: BaseCommandOptions): Promise<void> {
    const spinner = ora(`Deleting ${this.resourceName}...`).start();
    
    try {
      const sdk = await initializeSDK();
      const resource = this.getSDKResource(sdk);
      
      await resource.delete(id);
      
      spinner.succeed(`${this.resourceName} deleted successfully`);
      
      // Ensure the method completes to allow proper exit
      return;
    } catch (error: any) {
      spinner.fail(`Failed to delete ${this.resourceName}`);
      throw error;
    }
  }
  
  /**
   * Extract items from API response - handles both direct arrays and paginated responses
   */
  protected extractItemsFromResponse(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (response.members && Array.isArray(response.members)) {
      return response.members;
    }
    return [];
  }
  
  /**
   * Display a single item - default implementation, can be overridden
   */
  protected displaySingleItem(item: any): void {
    console.log(JSON.stringify(item, null, 2));
  }
  
  /**
   * Format item display with consistent styling
   */
  protected formatItemHeader(id: string, title?: string): string {
    if (title) {
      return `${chalk.bold(id)} - ${title}`;
    }
    return chalk.bold(id);
  }
  
  /**
   * Format property display with consistent styling
   */
  protected formatProperty(label: string, value: any, fallback = 'N/A'): string {
    const displayValue = value ?? fallback;
    return `  ${label}: ${displayValue}`;
  }
}