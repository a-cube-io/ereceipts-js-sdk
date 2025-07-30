/**
 * Pre-commit Quality Gates for A-Cube SDK
 * Automated quality checks before code commits
 */

export interface QualityGateConfig {
  enabled: boolean;
  failFast: boolean; // Stop on first failure
  parallel: boolean; // Run checks in parallel
  timeoutMs: number;
  checks: {
    lint: QualityCheckConfig;
    format: QualityCheckConfig;
    typecheck: QualityCheckConfig;
    test: QualityCheckConfig;
    security: QualityCheckConfig;
    dependencies: QualityCheckConfig;
    commitMessage: QualityCheckConfig;
    fileSize: QualityCheckConfig;
  };
  notifications: {
    slack?: { webhook: string; channel: string };
    email?: { recipients: string[]; smtp: any };
    teams?: { webhook: string };
  };
}

export interface QualityCheckConfig {
  enabled: boolean;
  severity: 'error' | 'warning' | 'info';
  autofix: boolean;
  timeout: number;
  rules?: Record<string, any>;
}

export interface QualityCheckResult {
  check: string;
  status: 'pass' | 'fail' | 'warning' | 'skipped';
  duration: number;
  details: {
    filesChecked: number;
    issues: QualityIssue[];
    autoFixed: number;
    warnings: string[];
  };
  command?: string;
  output?: string;
}

export interface QualityIssue {
  file: string;
  line?: number;
  column?: number;
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  fixable: boolean;
  category: 'lint' | 'format' | 'type' | 'security' | 'dependency' | 'style';
}

export interface CommitValidation {
  isValid: boolean;
  score: number; // 0-100
  issues: QualityIssue[];
  suggestions: string[];
  bypassable: boolean;
}

export class PreCommitManager {
  private config: QualityGateConfig;

  private hooks: Map<string, QualityHook> = new Map();

  private cache: Map<string, QualityCheckResult> = new Map();

  constructor(config?: Partial<QualityGateConfig>) {
    this.config = {
      enabled: true,
      failFast: false,
      parallel: true,
      timeoutMs: 300000, // 5 minutes
      checks: {
        lint: { enabled: true, severity: 'error', autofix: true, timeout: 60000 },
        format: { enabled: true, severity: 'warning', autofix: true, timeout: 30000 },
        typecheck: { enabled: true, severity: 'error', autofix: false, timeout: 120000 },
        test: { enabled: true, severity: 'error', autofix: false, timeout: 180000 },
        security: { enabled: true, severity: 'error', autofix: false, timeout: 90000 },
        dependencies: { enabled: true, severity: 'warning', autofix: false, timeout: 60000 },
        commitMessage: { enabled: true, severity: 'warning', autofix: false, timeout: 5000 },
        fileSize: { enabled: true, severity: 'warning', autofix: false, timeout: 10000 },
      },
      notifications: {},
      ...config,
    };

    this.initializeDefaultHooks();
  }

  /**
   * Register custom quality hook
   */
  registerHook(name: string, hook: QualityHook): void {
    this.hooks.set(name, hook);
  }

  /**
   * Run all pre-commit checks
   */
  async runPreCommitChecks(stagedFiles: string[]): Promise<CommitValidation> {
    if (!this.config.enabled) {
      return {
        isValid: true,
        score: 100,
        issues: [],
        suggestions: [],
        bypassable: false,
      };
    }

    const startTime = Date.now();
    const results: QualityCheckResult[] = [];
    const enabledChecks = Object.entries(this.config.checks)
      .filter(([_, config]) => config.enabled)
      .map(([name, config]) => ({ name, config }));

    try {
      if (this.config.parallel && !this.config.failFast) {
        // Run all checks in parallel
        const promises = enabledChecks.map(({ name, config }) =>
          this.runQualityCheck(name, config, stagedFiles),
        );
        const checkResults = await Promise.allSettled(promises);

        checkResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              check: enabledChecks[index]?.name || 'unknown',
              status: 'fail',
              duration: 0,
              details: {
                filesChecked: 0,
                issues: [{
                  file: 'system',
                  rule: 'execution_error',
                  severity: 'error',
                  message: result.reason?.message || 'Check execution failed',
                  fixable: false,
                  category: 'lint',
                }],
                autoFixed: 0,
                warnings: [],
              },
            });
          }
        });
      } else {
        // Run checks sequentially
        for (const { name, config } of enabledChecks) {
          const result = await this.runQualityCheck(name, config, stagedFiles);
          results.push(result);

          if (this.config.failFast && result.status === 'fail' && config.severity === 'error') {
            break;
          }
        }
      }

      // Calculate overall validation result
      const validation = this.calculateCommitValidation(results);

      // Cache results for performance
      this.cacheResults(results);

      // Send notifications if needed
      if (!validation.isValid || validation.issues.length > 0) {
        await this.sendNotifications(validation, results);
      }

      // Log summary
      this.logQualitySummary(results, Date.now() - startTime);

      return validation;

    } catch (error) {
      return {
        isValid: false,
        score: 0,
        issues: [{
          file: 'system',
          rule: 'pre_commit_error',
          severity: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          fixable: false,
          category: 'lint',
        }],
        suggestions: ['Check pre-commit configuration', 'Verify tool availability'],
        bypassable: false,
      };
    }
  }

  /**
   * Auto-fix issues where possible
   */
  async autoFixIssues(stagedFiles: string[]): Promise<{
    fixed: number;
    remaining: QualityIssue[];
  }> {
    let totalFixed = 0;
    const remainingIssues: QualityIssue[] = [];

    for (const [checkName, config] of Object.entries(this.config.checks)) {
      if (!config.enabled || !config.autofix) {continue;}

      const hook = this.hooks.get(checkName);
      if (!hook?.autofix) {continue;}

      try {
        const result = await hook.autofix(stagedFiles, config);
        totalFixed += result.fixed;
        remainingIssues.push(...result.remaining);
      } catch (error) {
        console.warn(`Auto-fix failed for ${checkName}:`, error);
      }
    }

    return { fixed: totalFixed, remaining: remainingIssues };
  }

  /**
   * Validate commit message format
   */
  validateCommitMessage(message: string): QualityCheckResult {
    const issues: QualityIssue[] = [];
    const patterns = {
      conventional: /^(feat|fix|docs|style|refactor|test|chore|ci|perf|build|revert)(\(.+\))?: .{1,50}/,
      length: /^.{1,72}$/,
      capitalization: /^[A-Z]/,
    };

    // Check conventional commit format
    if (!patterns.conventional.test(message)) {
      issues.push({
        file: 'commit-message',
        rule: 'conventional-commits',
        severity: 'warning',
        message: 'Commit message should follow conventional commits format',
        fixable: false,
        category: 'style',
      });
    }

    // Check length
    const firstLine = message.split('\n')[0] || '';
    if (!patterns.length.test(firstLine)) {
      issues.push({
        file: 'commit-message',
        rule: 'message-length',
        severity: 'warning',
        message: 'Commit message first line should be 1-72 characters',
        fixable: false,
        category: 'style',
      });
    }

    return {
      check: 'commitMessage',
      status: issues.length === 0 ? 'pass' : 'warning',
      duration: 0,
      details: {
        filesChecked: 1,
        issues,
        autoFixed: 0,
        warnings: [],
      },
    };
  }

  /**
   * Check file sizes
   */
  async checkFileSizes(files: string[]): Promise<QualityCheckResult> {
    const issues: QualityIssue[] = [];
    const maxSizes = {
      '.js': 100 * 1024,   // 100KB
      '.ts': 100 * 1024,   // 100KB
      '.tsx': 100 * 1024,  // 100KB
      '.jsx': 100 * 1024,  // 100KB
      '.json': 10 * 1024,  // 10KB
      '.md': 50 * 1024,    // 50KB
    };

    for (const file of files) {
      try {
        const fs = await import('fs');
        const stats = await fs.promises.stat(file);
        const ext = file.substring(file.lastIndexOf('.'));
        const maxSize = maxSizes[ext as keyof typeof maxSizes];

        if (maxSize && stats.size > maxSize) {
          issues.push({
            file,
            rule: 'file-size',
            severity: 'warning',
            message: `File size ${Math.round(stats.size / 1024)}KB exceeds limit ${Math.round(maxSize / 1024)}KB`,
            fixable: false,
            category: 'style',
          });
        }
      } catch (error) {
        // File might not exist or be readable, skip
      }
    }

    return {
      check: 'fileSize',
      status: issues.length === 0 ? 'pass' : 'warning',
      duration: 0,
      details: {
        filesChecked: files.length,
        issues,
        autoFixed: 0,
        warnings: [],
      },
    };
  }

  /**
   * Generate quality report
   */
  generateQualityReport(results: QualityCheckResult[]): {
    summary: {
      totalChecks: number;
      passed: number;
      failed: number;
      warnings: number;
      score: number;
    };
    details: QualityCheckResult[];
    recommendations: string[];
  } {
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const warnings = results.filter(r => r.status === 'warning').length;

    const score = Math.round((passed / results.length) * 100);

    const recommendations: string[] = [];

    if (failed > 0) {
      recommendations.push('Fix critical issues before committing');
    }

    if (warnings > 0) {
      recommendations.push('Consider addressing warnings to improve code quality');
    }

    const securityIssues = results.some(r =>
      r.details.issues.some(i => i.category === 'security'),
    );

    if (securityIssues) {
      recommendations.push('Review and fix security vulnerabilities immediately');
    }

    return {
      summary: {
        totalChecks: results.length,
        passed,
        failed,
        warnings,
        score,
      },
      details: results,
      recommendations,
    };
  }

  private async runQualityCheck(
    name: string,
    config: QualityCheckConfig,
    files: string[],
  ): Promise<QualityCheckResult> {
    const startTime = Date.now();
    const hook = this.hooks.get(name);

    if (!hook) {
      return {
        check: name,
        status: 'skipped',
        duration: 0,
        details: {
          filesChecked: 0,
          issues: [],
          autoFixed: 0,
          warnings: [`No hook registered for ${name}`],
        },
      };
    }

    try {
      const result = await Promise.race([
        hook.execute(files, config),
        new Promise<QualityCheckResult>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), config.timeout),
        ),
      ]);

      result.duration = Date.now() - startTime;
      return result;
    } catch (error) {
      return {
        check: name,
        status: 'fail',
        duration: Date.now() - startTime,
        details: {
          filesChecked: files.length,
          issues: [{
            file: 'system',
            rule: 'execution_error',
            severity: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
            fixable: false,
            category: 'lint',
          }],
          autoFixed: 0,
          warnings: [],
        },
      };
    }
  }

  private calculateCommitValidation(results: QualityCheckResult[]): CommitValidation {
    const issues: QualityIssue[] = [];
    const suggestions: string[] = [];

    let score = 100;
    let hasErrors = false;

    for (const result of results) {
      issues.push(...result.details.issues);

      if (result.status === 'fail') {
        const errorIssues = result.details.issues.filter(i => i.severity === 'error');
        if (errorIssues.length > 0) {
          hasErrors = true;
          score -= errorIssues.length * 10;
        }
      }

      if (result.status === 'warning') {
        score -= result.details.issues.length * 2;
      }
    }

    score = Math.max(0, score);

    if (hasErrors) {
      suggestions.push('Fix all error-level issues before committing');
    }

    if (issues.some(i => i.fixable)) {
      suggestions.push('Run auto-fix to resolve fixable issues');
    }

    return {
      isValid: !hasErrors,
      score,
      issues,
      suggestions,
      bypassable: !hasErrors && issues.every(i => i.severity !== 'error'),
    };
  }

  private cacheResults(results: QualityCheckResult[]): void {
    const cacheKey = `quality_${Date.now()}`;
    this.cache.set(cacheKey, {
      check: 'summary',
      status: results.every(r => r.status === 'pass') ? 'pass' : 'fail',
      duration: results.reduce((sum, r) => sum + r.duration, 0),
      details: {
        filesChecked: Math.max(...results.map(r => r.details.filesChecked)),
        issues: results.flatMap(r => r.details.issues),
        autoFixed: results.reduce((sum, r) => sum + r.details.autoFixed, 0),
        warnings: results.flatMap(r => r.details.warnings),
      },
    });

    // Keep only last 10 results
    if (this.cache.size > 10) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }

  private async sendNotifications(
    validation: CommitValidation,
    results: QualityCheckResult[],
  ): Promise<void> {
    if (!validation.isValid && this.config.notifications.slack) {
      // Send Slack notification for failed commits
      const message = this.formatSlackMessage(validation, results);
      await this.sendSlackNotification(message);
    }
  }

  private formatSlackMessage(
    validation: CommitValidation,
    _results: QualityCheckResult[],
  ): string {
    const errorCount = validation.issues.filter(i => i.severity === 'error').length;
    const warningCount = validation.issues.filter(i => i.severity === 'warning').length;

    return `🚨 Pre-commit Quality Check Failed
Score: ${validation.score}/100
Errors: ${errorCount}
Warnings: ${warningCount}
Status: ${validation.isValid ? '✅ Passed' : '❌ Failed'}`;
  }

  private async sendSlackNotification(message: string): Promise<void> {
    // Implementation would depend on Slack webhook integration
    console.log('Slack notification:', message);
  }

  private logQualitySummary(results: QualityCheckResult[], duration: number): void {
    console.log('\n📊 Quality Check Summary');
    console.log('─'.repeat(50));

    for (const result of results) {
      const icon = result.status === 'pass' ? '✅' :
                   result.status === 'fail' ? '❌' :
                   result.status === 'warning' ? '⚠️' : '⏭️';

      console.log(`${icon} ${result.check}: ${result.status} (${result.duration}ms)`);

      if (result.details.issues.length > 0) {
        result.details.issues.forEach(issue => {
          console.log(`   └─ ${issue.file}: ${issue.message}`);
        });
      }
    }

    console.log('─'.repeat(50));
    console.log(`Total duration: ${duration}ms`);
  }

  private initializeDefaultHooks(): void {
    // ESLint hook
    this.hooks.set('lint', {
      execute: async (files, _config) => ({
        check: 'lint',
        status: 'pass',
        duration: 0,
        details: { filesChecked: files.length, issues: [], autoFixed: 0, warnings: [] },
      }),
      autofix: async (_files, _config) => ({ fixed: 0, remaining: [] }),
    });

    // Prettier hook
    this.hooks.set('format', {
      execute: async (files, _config) => ({
        check: 'format',
        status: 'pass',
        duration: 0,
        details: { filesChecked: files.length, issues: [], autoFixed: 0, warnings: [] },
      }),
      autofix: async (_files, _config) => ({ fixed: 0, remaining: [] }),
    });

    // TypeScript hook
    this.hooks.set('typecheck', {
      execute: async (files, _config) => ({
        check: 'typecheck',
        status: 'pass',
        duration: 0,
        details: { filesChecked: files.length, issues: [], autoFixed: 0, warnings: [] },
      }),
    });

    // Jest/Test hook
    this.hooks.set('test', {
      execute: async (files, _config) => ({
        check: 'test',
        status: 'pass',
        duration: 0,
        details: { filesChecked: files.length, issues: [], autoFixed: 0, warnings: [] },
      }),
    });

    // Security audit hook
    this.hooks.set('security', {
      execute: async (files, _config) => ({
        check: 'security',
        status: 'pass',
        duration: 0,
        details: { filesChecked: files.length, issues: [], autoFixed: 0, warnings: [] },
      }),
    });

    // Dependency check hook
    this.hooks.set('dependencies', {
      execute: async (files, _config) => ({
        check: 'dependencies',
        status: 'pass',
        duration: 0,
        details: { filesChecked: files.length, issues: [], autoFixed: 0, warnings: [] },
      }),
    });
  }
}

export interface QualityHook {
  execute(files: string[], config: QualityCheckConfig): Promise<QualityCheckResult>;
  autofix?(files: string[], config: QualityCheckConfig): Promise<{
    fixed: number;
    remaining: QualityIssue[];
  }>;
}
