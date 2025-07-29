# A-Cube E-Receipt SDK CLI - Usage Guide

A comprehensive command-line interface for the A-Cube e-receipt system that mirrors the SDK functionality with full authentication support.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Authentication](#authentication)
- [Profile Management](#profile-management)
- [Available Commands](#available-commands)
- [Resource Management](#resource-management)
- [Interactive Mode](#interactive-mode)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Security](#security)

## Installation

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager
- Valid A-Cube credentials

### Install from npm

```bash
npm install -g @a-cube-io/cli
```

### Install from source

```bash
git clone https://github.com/a-cube-io/ereceipts-js-sdk.git
cd ereceipts-js-sdk
npm install
npm run build
npm link
```

### Verify Installation

```bash
acube --version
acube --help
```

## Quick Start

### 1. First-time Login

```bash
# Interactive login (recommended for first use)
acube auth login

# Or provide credentials directly
acube auth login -u your-username -p your-password
```

### 2. Check Authentication Status

```bash
acube auth status
```

### 3. List Your Receipts

```bash
acube receipt list
```

### 4. Get Help

```bash
# General help
acube --help

# Command-specific help
acube auth --help
acube receipt --help
```

## Authentication

The CLI uses the same authentication system as the SDK, supporting OAuth2 with JWT tokens.

### Login Commands

#### Interactive Login (Recommended)
```bash
acube auth login
```
- Prompts for username and password securely
- Masks password input
- Provides clear success/error feedback

#### Direct Login
```bash
# With username prompt for password
acube auth login -u your-username

# With both credentials (not recommended for security)
acube auth login -u your-username -p your-password

# With preferred role
acube auth login -u your-username --role merchant
```

#### Profile-based Login
```bash
# Save credentials to a named profile
acube auth login --profile production

# Login to specific profile
acube auth login --profile staging -u staging-user
```

### Authentication Status

```bash
# Check current authentication status
acube auth status

# Check specific profile status
acube auth status --profile production
```

**Status Information Includes:**
- ✅ Authentication state (authenticated/not authenticated)
- 👤 Current user information
- 🏢 Merchant and role details
- ⏰ Token expiration time
- 🔄 Token refresh status

### Logout

```bash
# Logout from current session
acube auth logout

# Logout from specific profile
acube auth logout --profile production

# Force logout (clear local data even if server logout fails)
acube auth logout --force
```

### Token Management

The CLI automatically handles:
- **Token Storage**: Secure local storage with restricted file permissions (0o600)
- **Token Refresh**: Automatic refresh before expiration
- **Token Validation**: Validates tokens before API calls
- **Session Management**: Handles multiple concurrent sessions

## Profile Management

Profiles allow you to manage multiple authentication contexts (e.g., different environments, users, or merchants).

### Creating Profiles

```bash
# Create and switch to a new profile
acube auth login --profile production

# Create profile for different environment
acube auth login --profile staging --env sandbox
```

### Managing Profiles

```bash
# List all profiles
acube profiles list

# Switch to a profile
acube profiles use production

# Current profile status
acube auth status

# Remove a profile
acube profiles remove staging
```

### Profile Configuration

Profiles are stored in `~/.acube/profiles/` with the following structure:
- `~/.acube/config.json` - Global configuration
- `~/.acube/auth.json` - Default profile authentication
- `~/.acube/profiles/production.json` - Named profile authentication

## Available Commands

### Authentication Commands

| Command | Description | Options |
|---------|-------------|---------|
| `acube auth login` | Login to A-Cube system | `-u, --username`, `-p, --password`, `--profile`, `--role` |
| `acube auth logout` | Logout from system | `--profile`, `--force` |
| `acube auth status` | Show authentication status | `--profile` |
| `acube auth refresh` | Manually refresh tokens | `--profile` |

### Resource Management Commands

| Command | Description | Options |
|---------|-------------|---------|
| `acube receipt list` | List receipts | `-l, --limit`, `-s, --status`, `-f, --from`, `-t, --to` |
| `acube receipt get <id>` | Get receipt details | None |
| `acube receipt create` | Create new receipt | `--interactive` |
| `acube receipt update <id>` | Update receipt | `--interactive` |
| `acube receipt delete <id>` | Delete receipt | `--confirm` |
| `acube cashier list` | List cashiers | `-l, --limit`, `-m, --merchant` |
| `acube cashier get <id>` | Get cashier details | None |
| `acube merchant list` | List merchants | `-l, --limit` |
| `acube merchant get <id>` | Get merchant details | None |
| `acube pos list` | List point of sales | `-l, --limit` |
| `acube pos get <id>` | Get POS details | None |

### Utility Commands

| Command | Description | Options |
|---------|-------------|---------|
| `acube config` | Show configuration | `--profile` |
| `acube profiles` | Manage profiles | None |
| `acube interactive` | Start interactive mode | None |

## Resource Management

### Receipts

#### List Receipts
```bash
# Basic list (10 most recent)
acube receipt list

# List with custom limit
acube receipt list -l 50

# Filter by status
acube receipt list -s completed

# Filter by date range
acube receipt list -f 2024-01-01 -t 2024-01-31

# Combine filters
acube receipt list -l 100 -s pending -f 2024-01-01
```

#### Get Receipt Details
```bash
acube receipt get receipt_123456789
```

#### Create Receipt
```bash
# Interactive creation (recommended)
acube receipt create --interactive

# Quick creation with JSON data
acube receipt create --data '{"amount": 10.50, "description": "Test receipt"}'
```

#### Update Receipt
```bash
# Interactive update
acube receipt update receipt_123456789 --interactive

# Direct update with JSON
acube receipt update receipt_123456789 --data '{"status": "completed"}'
```

#### Delete Receipt
```bash
# With confirmation prompt
acube receipt delete receipt_123456789

# Skip confirmation (use with caution)
acube receipt delete receipt_123456789 --confirm
```

### Cashiers

#### List Cashiers
```bash
# List all cashiers
acube cashier list

# Filter by merchant
acube cashier list -m merchant_12345

# Custom limit
acube cashier list -l 25
```

#### Get Cashier Details
```bash
acube cashier get cashier_67890
```

### Merchants

#### List Merchants
```bash
# List all accessible merchants
acube merchant list

# Custom limit
acube merchant list -l 20
```

#### Get Merchant Details
```bash
acube merchant get merchant_12345
```

### Point of Sales (POS)

#### List POS Devices
```bash
# List all POS devices
acube pos list

# Custom limit
acube pos list -l 15
```

#### Get POS Details
```bash
acube pos get pos_device_789
```

## Interactive Mode

For complex operations or when you prefer guided interfaces, use interactive mode:

```bash
acube interactive
```

### Interactive Mode Features

- **📋 Menu-driven interface** with clear options
- **🔍 Resource browsing** with pagination
- **✏️ Guided creation/editing** of resources
- **🚀 Quick actions** for common operations
- **💡 Context-sensitive help** and tips

### Interactive Mode Navigation

```
? What would you like to do? (Use arrow keys)
❯ 🔐 Authentication Management
  📄 Receipt Management  
  👤 Cashier Management
  🏢 Merchant Management
  🖥️  Point of Sales Management
  ⚙️  Configuration
  ❌ Exit
```

## Configuration

### Environment Configuration

```bash
# Set environment (sandbox, production, development)
acube config set environment sandbox

# Set custom API URLs
acube config set api-url https://api.acube.example.com
acube config set auth-url https://auth.acube.example.com

# View current configuration
acube config show
```

### Configuration File Locations

- **Global Config**: `~/.acube/config.json`
- **Default Auth**: `~/.acube/auth.json`
- **Named Profiles**: `~/.acube/profiles/{profile-name}.json`

### Sample Configuration

```json
{
  "environment": "sandbox",
  "baseUrls": {
    "api": "https://ereceipts-it-sandbox.acubeapi.com",
    "auth": "https://common-sandbox.api.acubeapi.com"
  },
  "currentProfile": "default"
}
```

## Troubleshooting

### Common Issues

#### Authentication Problems

**Issue**: `Not authenticated. Please run: acube auth login`
```bash
# Solution: Login again
acube auth login

# Check authentication status
acube auth status

# Try refreshing tokens
acube auth refresh
```

**Issue**: `Token expired` or authentication errors
```bash
# Solution: Re-authenticate
acube auth logout
acube auth login
```

#### Network/API Issues

**Issue**: Connection timeouts or API errors
```bash
# Check your network connection
curl -I https://ereceipts-it-sandbox.acubeapi.com/health

# Verify environment configuration
acube config show

# Try different environment
acube config set environment sandbox
```

#### Permission Issues

**Issue**: `Access denied` or permission errors
```bash
# Check your user roles and permissions
acube auth status

# Ensure you're using the correct merchant context
acube merchant list
```

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
# Enable debug output
DEBUG=acube:* acube receipt list

# Or use verbose flag (if available)
acube --verbose receipt list
```

### Getting Help

```bash
# General help
acube --help

# Command-specific help
acube auth --help
acube receipt --help

# Get command examples
acube receipt create --help
```

## Security

### Authentication Security

- **🔐 Secure Token Storage**: Tokens stored with restricted file permissions (0o600)
- **🔄 Automatic Token Refresh**: Prevents expired token issues
- **🚫 No Credential Logging**: Passwords and tokens never logged to console
- **⏰ Session Timeout**: Automatic logout on token expiration

### Best Practices

#### Credential Management
```bash
# ✅ Good: Interactive login (masks password)
acube auth login

# ❌ Avoid: Password in command line (visible in shell history)
acube auth login -u user -p password
```

#### Profile Security
```bash
# ✅ Good: Use profiles for different environments
acube auth login --profile production
acube auth login --profile staging

# ✅ Good: Regular logout for shared systems
acube auth logout
```

#### Configuration Security
- Keep configuration files secure with appropriate permissions
- Regularly rotate credentials
- Use different profiles for different environments
- Never commit authentication files to version control

### File Permissions

The CLI automatically sets secure permissions:
- Configuration files: `0o644` (readable by owner and group)
- Authentication files: `0o600` (readable/writable by owner only)
- Profile directories: `0o755` (standard directory permissions)

## Advanced Usage

### Scripting and Automation

#### Batch Operations
```bash
#!/bin/bash
# Example: Process multiple receipts

acube auth login -u $ACUBE_USER -p $ACUBE_PASS

for receipt_id in $(acube receipt list --format ids); do
  echo "Processing receipt: $receipt_id"
  acube receipt get $receipt_id --format json > "receipt_${receipt_id}.json"
done
```

#### CI/CD Integration
```bash
# Use environment variables for credentials
export ACUBE_USERNAME="ci-user"
export ACUBE_PASSWORD="ci-password"

# Non-interactive login for automation
acube auth login --non-interactive

# Process receipts with JSON output for parsing
acube receipt list --format json | jq '.[].id' | xargs -I {} acube receipt get {}
```

### Custom Output Formats

```bash
# JSON output for programmatic use
acube receipt list --format json

# CSV output for spreadsheets
acube receipt list --format csv

# Table format for readable output (default)
acube receipt list --format table
```

## API Reference

For detailed API documentation and SDK integration, refer to:
- [SDK Documentation](../README.md)
- [API Reference](./API_REFERENCE.md)
- [Authentication Guide](./AUTHENTICATION.md)

## Support

For issues, questions, or contributions:
- **GitHub Issues**: [Report bugs or request features](https://github.com/a-cube-io/ereceipts-js-sdk/issues)
- **Documentation**: [Complete SDK documentation](https://docs.acubeapi.com)
- **Community**: [Developer community and discussions](https://community.acubeapi.com)

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**License**: MIT