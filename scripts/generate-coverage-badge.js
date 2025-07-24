#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read coverage summary
const coveragePath = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');

if (!fs.existsSync(coveragePath)) {
  console.error('Coverage summary not found. Run tests with coverage first.');
  process.exit(1);
}

const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
const total = coverage.total;

// Calculate overall coverage percentage
const statements = total.statements.pct;
const branches = total.branches.pct;
const functions = total.functions.pct;
const lines = total.lines.pct;

// Use statements as the main coverage metric
const coveragePercent = Math.round(statements);

// Determine color based on coverage percentage
let color = 'red';
if (coveragePercent >= 80) {
  color = 'brightgreen';
} else if (coveragePercent >= 60) {
  color = 'yellow';
} else if (coveragePercent >= 40) {
  color = 'orange';
}

// Generate badge URL
const badgeUrl = `https://img.shields.io/badge/coverage-${coveragePercent}%25-${color}?style=flat-square`;

console.log(`Coverage: ${coveragePercent}%`);
console.log(`Badge URL: ${badgeUrl}`);

// Update README if it exists
const readmePath = path.join(__dirname, '..', 'README.md');
if (fs.existsSync(readmePath)) {
  let readme = fs.readFileSync(readmePath, 'utf8');
  
  // Check if coverage badge already exists
  const badgeRegex = /!\[Coverage\]\(https:\/\/img\.shields\.io\/badge\/coverage-\d+%25-\w+\?style=flat-square\)/;
  
  if (badgeRegex.test(readme)) {
    // Replace existing badge
    readme = readme.replace(badgeRegex, `![Coverage](${badgeUrl})`);
  } else {
    // Add badge after the main title
    const titleRegex = /^# (.+)$/m;
    if (titleRegex.test(readme)) {
      readme = readme.replace(titleRegex, `# $1\n\n![Coverage](${badgeUrl})\n`);
    }
  }
  
  fs.writeFileSync(readmePath, readme);
  console.log('README updated with coverage badge');
} 