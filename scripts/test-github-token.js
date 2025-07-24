#!/usr/bin/env node

/**
 * Test script to check GitHub token permissions
 * Run with: node scripts/test-github-token.js
 */

import { execSync } from 'child_process';

console.log('🔍 Testing GitHub token permissions...\n');

try {
  // Test basic authentication
  console.log('1. Testing authentication...');
  const authResult = execSync('gh auth status', { encoding: 'utf8' });
  console.log('✅ Authentication successful');
  console.log(authResult);

  // Test repository access
  console.log('\n2. Testing repository access...');
  const repoResult = execSync('gh repo view a-cube-io/ereceipts-js-sdk', { encoding: 'utf8' });
  console.log('✅ Repository access successful');
  console.log(repoResult.split('\n').slice(0, 5).join('\n') + '...');

  // Test releases access
  console.log('\n3. Testing releases access...');
  const releasesResult = execSync('gh release list --limit 3', { encoding: 'utf8' });
  console.log('✅ Releases access successful');
  console.log(releasesResult);

  console.log('\n🎉 All permissions tests passed!');
  console.log('The GitHub token has sufficient permissions for releases.');

} catch (error) {
  console.error('\n❌ Permission test failed:');
  console.error(error.message);
  
  console.log('\n🔧 To fix this issue:');
  console.log('1. Go to Repository Settings > Actions > General');
  console.log('2. Set "Workflow permissions" to "Read and write permissions"');
  console.log('3. Or create a Personal Access Token with "repo" scope');
  console.log('4. Add the token as GH_TOKEN secret in repository settings');
  
  process.exit(1);
} 