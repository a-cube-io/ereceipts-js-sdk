/**
 * Error Handling and Tracing Utilities
 * Comprehensive error formatting and tracing system
 */

import chalk from 'chalk';

import { loadConfig } from '../config/index.js';
import { DEFAULT_TRACE_CONFIG } from '../config/constants.js';

import type { TraceConfig } from '../types.js';

export function formatErrorTrace(error: any, context?: any, config?: TraceConfig): string {
  const traceConfig = config || DEFAULT_TRACE_CONFIG;

  if (!traceConfig.enabled) {
    return error.message || 'Unknown error';
  }

  const timestamp = traceConfig.includeTimestamp
    ? `[${new Date().toISOString()}] `
    : '';

  let output = '';

  switch (traceConfig.outputFormat) {
    case 'json':
      output = formatErrorTraceJSON(error, context, traceConfig);
      break;
    case 'compact':
      output = formatErrorTraceCompact(error, context, traceConfig);
      break;
    case 'pretty':
    default:
      output = formatErrorTracePretty(error, context, traceConfig);
      break;
  }

  return timestamp + output;
}

function formatErrorTracePretty(error: any, context?: any, config?: TraceConfig): string {
  const traceConfig = config || DEFAULT_TRACE_CONFIG;

  let output = chalk.red('┌─ Error Details ─────────────────────────────\n');

  // Basic error information
  output += `${chalk.red('│ ') + chalk.bold('Message: ') + (error.message || 'Unknown error')  }\n`;

  if (error.name) {
    output += `${chalk.red('│ ') + chalk.bold('Type: ') + error.name  }\n`;
  }

  if (error.code) {
    output += `${chalk.red('│ ') + chalk.bold('Code: ') + error.code  }\n`;
  }

  // HTTP-specific information
  if (error.status || error.statusCode) {
    output += `${chalk.red('│ ') + chalk.bold('Status: ') + (error.status || error.statusCode)  }\n`;
  }

  if (error.response?.data) {
    output += `${chalk.red('│ ') + chalk.bold('Response: ') + JSON.stringify(error.response.data, null, 2).replace(/\\n/g, '\n│   ')  }\n`;
  }

  // Context information
  if (traceConfig.includeContext && context) {
    output += `${chalk.red('│ ') + chalk.bold('Context: ')  }\n`;
    Object.entries(context).forEach(([key, value]) => {
      output += `${chalk.red('│   ') + chalk.cyan(`${key  }: `) + String(value)  }\n`;
    });
  }

  // Stack trace
  if (traceConfig.includeStack && error.stack) {
    output += `${chalk.red('│ ') + chalk.bold('Stack Trace: ')  }\n`;
    const stackLines = error.stack.split('\n').slice(1); // Remove first line (it's the message)
    stackLines.forEach((line: string) => {
      output += `${chalk.red('│   ') + chalk.gray(line.trim())  }\n`;
    });
  }

  output += chalk.red('└─────────────────────────────────────────────');

  return output;
}

function formatErrorTraceCompact(error: any, context?: any, _config?: TraceConfig): string {
  const parts = [error.message || 'Unknown error'];

  if (error.code) {parts.push(`[${error.code}]`);}
  if (error.status || error.statusCode) {parts.push(`HTTP:${error.status || error.statusCode}`);}
  if (context?.operation) {parts.push(`Op:${context.operation}`);}

  return parts.join(' ');
}

function formatErrorTraceJSON(error: any, context?: any, config?: TraceConfig): string {
  const errorObject: any = {
    message: error.message || 'Unknown error',
    type: error.name || 'Error',
    timestamp: new Date().toISOString(),
  };

  if (error.code) {errorObject.code = error.code;}
  if (error.status || error.statusCode) {errorObject.status = error.status || error.statusCode;}
  if (error.response?.data) {errorObject.response = error.response.data;}

  if (config?.includeContext && context) {
    errorObject.context = context;
  }

  if (config?.includeStack && error.stack) {
    errorObject.stack = error.stack.split('\n');
  }

  return JSON.stringify(errorObject, null, 2);
}

export async function getTraceConfig(commandOptions?: any): Promise<TraceConfig> {
  try {
    const config = await loadConfig();
    const baseConfig = config.trace || DEFAULT_TRACE_CONFIG;

    // Override with command-line options
    if (commandOptions?.trace) {
      return {
        ...baseConfig,
        enabled: true,
        level: commandOptions.verbose ? 'verbose' : baseConfig.level,
      };
    }

    return baseConfig;
  } catch (error) {
    return DEFAULT_TRACE_CONFIG;
  }
}

export async function handleError(error: any, context?: any, commandOptions?: any): Promise<void> {
  const traceConfig = await getTraceConfig(commandOptions);
  const formattedError = formatErrorTrace(error, context, traceConfig);
  console.error(formattedError);
}
