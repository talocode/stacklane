#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const STACKLANE_DIR = '.stacklane';
const CONFIG_FILE = path.join(STACKLANE_DIR, 'config.json');
const DB_FILE = path.join(STACKLANE_DIR, 'stacklane.db');

function ensureStacklaneDir() {
  if (!fs.existsSync(STACKLANE_DIR)) {
    fs.mkdirSync(STACKLANE_DIR, { recursive: true });
  }
}

function loadConfig(): Record<string, unknown> {
  if (!fs.existsSync(CONFIG_FILE)) return {};
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
}

function saveConfig(config: Record<string, unknown>) {
  ensureStacklaneDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function generateToken(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(48).toString('base64url')}`;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const program = new Command();

program
  .name('stacklane')
  .description('Stacklane - lightweight backend/database layer')
  .version('0.2.0');

program
  .command('init')
  .description('Initialize Stacklane in current directory')
  .action(() => {
    ensureStacklaneDir();
    const config = loadConfig();
    if (!config.projectId) {
      config.projectId = generateId('proj');
      config.createdAt = new Date().toISOString();
      saveConfig(config);
      console.log(`✓ Initialized Stacklane in .stacklane/`);
      console.log(`  Project ID: ${config.projectId}`);
    } else {
      console.log(`✓ Stacklane already initialized`);
      console.log(`  Project ID: ${config.projectId}`);
    }
  });

program
  .command('project create')
  .description('Create a new project')
  .option('-n, --name <name>', 'Project name', 'My Project')
  .action((opts) => {
    ensureStacklaneDir();
    const config = loadConfig();
    config.projectId = generateId('proj');
    config.projectName = opts.name;
    config.createdAt = new Date().toISOString();
    saveConfig(config);
    console.log(`✓ Project created: ${opts.name}`);
    console.log(`  ID: ${config.projectId}`);
  });

program
  .command('token create')
  .description('Create an access token')
  .option('-n, --name <name>', 'Token name', 'default')
  .option('--dev', 'Create dev token instead of live token')
  .action((opts) => {
    ensureStacklaneDir();
    const config = loadConfig();
    if (!config.projectId) {
      console.error('✗ No project initialized. Run: stacklane init');
      process.exit(1);
    }

    const rawToken = generateToken(opts.dev ? 'sk_lane_dev' : 'sk_lane_live');
    const tokenHash = hashToken(rawToken);
    const tokenPrefix = rawToken.slice(0, 12) + '...';

    const tokens = config.tokens || [];
    tokens.push({
      id: generateId('tok'),
      projectId: config.projectId,
      name: opts.name,
      prefix: tokenPrefix,
      hash: tokenHash,
      createdAt: new Date().toISOString(),
    });
    config.tokens = tokens;
    config.accessToken = rawToken;
    saveConfig(config);

    console.log(`✓ Access token created: ${opts.name}`);
    console.log(`  Token: ${rawToken}`);
    console.log(`  Prefix: ${tokenPrefix}`);
    console.log(`\n⚠ Store this token securely. It will not be shown again.`);
  });

program
  .command('token verify')
  .description('Verify an access token')
  .argument('[token]', 'Token to verify')
  .action((tokenArg) => {
    const config = loadConfig();
    const token = tokenArg || config.accessToken;
    if (!token) {
      console.error('✗ No token provided. Run: stacklane token create');
      process.exit(1);
    }

    const tokenHash = hashToken(token);
    const tokens = config.tokens || [];
    const found = tokens.find((t: any) => t.hash === tokenHash && !t.revokedAt);
    if (found) {
      console.log(`✓ Token is valid`);
      console.log(`  Name: ${found.name}`);
      console.log(`  Project: ${found.projectId}`);
    } else {
      console.log(`✗ Token is invalid or revoked`);
    }
  });

program
  .command('db set')
  .description('Set hosted database URL and password')
  .option('-u, --url <url>', 'Database URL')
  .option('-p, --password <password>', 'Database password')
  .action((opts) => {
    ensureStacklaneDir();
    const config = loadConfig();
    if (!config.projectId) {
      console.error('✗ No project initialized. Run: stacklane init');
      process.exit(1);
    }

    if (opts.url) config.databaseUrl = opts.url;
    if (opts.password) config.databasePassword = opts.password;
    config.databaseConfiguredAt = new Date().toISOString();
    saveConfig(config);

    console.log(`✓ Database configured`);
    console.log(`  URL: ${config.databaseUrl ? '(set)' : '(not set)'}`);
    console.log(`  Password: ${config.databasePassword ? '(set)' : '(not set)'}`);
    console.log(`\n⚠ Database credentials are stored in .stacklane/config.json`);
  });

program
  .command('db show')
  .description('Show database configuration (passwords masked)')
  .action(() => {
    const config = loadConfig();
    console.log(`  Project ID: ${config.projectId || '(not set)'}`);
    console.log(`  Database URL: ${config.databaseUrl || '(not set)'}`);
    console.log(`  Password: ${config.databasePassword ? '***' : '(not set)'}`);
    console.log(`  Configured: ${config.databaseConfiguredAt || '(not set)'}`);
  });

program
  .command('env generate')
  .description('Generate .env.stacklane file')
  .option('--safe', 'Write placeholders only (default)', true)
  .option('--confirm', 'Write actual values (requires confirmation)')
  .action((opts) => {
    const config = loadConfig();
    const safe = !opts.confirm;

    const lines = [
      '# Stacklane Environment',
      `STACKLANE_PROJECT_ID=${config.projectId || ''}`,
      `STACKLANE_PROJECT_URL=${config.projectUrl || ''}`,
      `STACKLANE_DATABASE_URL=${safe ? '' : (config.databaseUrl || '')}`,
      `STACKLANE_DATABASE_PASSWORD=${safe ? '' : (config.databasePassword || '')}`,
      `STACKLANE_ACCESS_TOKEN=${safe ? '' : (config.accessToken || '')}`,
      '',
      '# Generated by: stacklane env generate',
    ];

    fs.writeFileSync('.env.stacklane', lines.join('\n'));
    console.log(`✓ Generated .env.stacklane`);
    if (safe) {
      console.log(`  Used safe mode (placeholders only). Use --confirm to write actual values.`);
    }
  });

program
  .command('audit')
  .description('Show recent audit events')
  .action(() => {
    const config = loadConfig();
    const tokens = config.tokens || [];
    console.log(`  Project: ${config.projectId || '(not set)'}`);
    console.log(`  Tokens: ${tokens.length}`);
    for (const t of tokens) {
      console.log(`    - ${t.name} (${t.prefix}) created ${t.createdAt}`);
    }
  });

program
  .command('backup')
  .description('Export project config as JSON backup')
  .action(() => {
    const config = loadConfig();
    const backup = {
      ...config,
      accessToken: config.accessToken ? '(redacted)' : undefined,
      databasePassword: config.databasePassword ? '(redacted)' : undefined,
      backedUpAt: new Date().toISOString(),
    };
    const backupFile = `stacklane-backup-${Date.now()}.json`;
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`✓ Backup created: ${backupFile}`);
    console.log(`  Sensitive values redacted in backup.`);
  });

program
  .command('customer create')
  .description('Create an API customer')
  .option('-n, --name <name>', 'Customer name')
  .option('-e, --email <email>', 'Customer email')
  .action((opts) => {
    ensureStacklaneDir();
    const config = loadConfig();
    const id = generateId('cust');
    const customers = config.customers || [];
    customers.push({ id, name: opts.name || 'Customer', email: opts.email, projectId: config.projectId, createdAt: new Date().toISOString() });
    config.customers = customers;
    saveConfig(config);
    console.log(`✓ Customer created: ${opts.name || 'Customer'}`);
    console.log(`  ID: ${id}`);
  });

program
  .command('customer list')
  .description('List API customers')
  .action(() => {
    const config = loadConfig();
    const customers = config.customers || [];
    if (customers.length === 0) { console.log('  No customers found.'); return; }
    for (const c of customers) console.log(`  - ${c.name} (${c.id})`);
  });

program
  .command('customer key create')
  .description('Create a customer API key')
  .option('-c, --customer <id>', 'Customer ID')
  .option('-n, --name <name>', 'Key name', 'default')
  .action((opts) => {
    ensureStacklaneDir();
    const config = loadConfig();
    const rawKey = 'sk_lane_customer_' + crypto.randomBytes(48).toString('base64url');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keys = config.customerKeys || [];
    keys.push({ id: generateId('ckey'), customerId: opts.customer, name: opts.name, hash: keyHash, createdAt: new Date().toISOString() });
    config.customerKeys = keys;
    saveConfig(config);
    console.log(`✓ Customer API key created: ${opts.name}`);
    console.log(`  Key: ${rawKey}`);
    console.log(`\n⚠ Store this key securely. It will not be shown again.`);
  });

program
  .command('usage summary')
  .description('Show usage summary')
  .action(() => {
    const config = loadConfig();
    const events = config.usageEvents || [];
    console.log(`  Total events: ${events.length}`);
    const byType: Record<string, number> = {};
    for (const e of events) { byType[e.eventType] = (byType[e.eventType] || 0) + 1; }
    for (const [type, count] of Object.entries(byType)) console.log(`  ${type}: ${count}`);
  });

program
  .command('file upload')
  .description('Upload a file')
  .option('-f, --file <path>', 'File to upload')
  .option('-n, --name <name>', 'File name')
  .action((opts) => {
    ensureStacklaneDir();
    if (!opts.file || !fs.existsSync(opts.file)) { console.error('✗ File not found'); process.exit(1); }
    const buffer = fs.readFileSync(opts.file);
    const filename = opts.name || path.basename(opts.file);
    const id = generateId('file');
    const storageKey = `${Date.now()}-${id}-${filename}`;
    const storageDir = path.join(STACKLANE_DIR, 'files');
    fs.mkdirSync(storageDir, { recursive: true });
    fs.writeFileSync(path.join(storageDir, storageKey), buffer);
    console.log(`✓ File uploaded: ${filename}`);
    console.log(`  ID: ${id}`);
    console.log(`  Size: ${buffer.length} bytes`);
    console.log(`  Storage key: ${storageKey}`);
  });

program
  .command('file list')
  .description('List uploaded files')
  .action(() => {
    const storageDir = path.join(STACKLANE_DIR, 'files');
    if (!fs.existsSync(storageDir)) { console.log('  No files uploaded.'); return; }
    const files = fs.readdirSync(storageDir);
    for (const f of files) console.log(`  - ${f}`);
  });

program
  .command('asset list')
  .description('List assets')
  .action(() => {
    console.log('  No assets yet. Create assets via API: POST /v1/projects/:id/assets');
  });

program.parse();
