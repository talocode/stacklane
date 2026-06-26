#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const STACKLANE_DIR = '.stacklane';
const CONFIG_FILE = path.join(STACKLANE_DIR, 'config.json');
const CUSTOMERS_FILE = path.join(STACKLANE_DIR, 'customers.json');
const API_KEYS_FILE = path.join(STACKLANE_DIR, 'api-keys.json');
const USAGE_EVENTS_FILE = path.join(STACKLANE_DIR, 'usage-events.json');
const ASSETS_FILE = path.join(STACKLANE_DIR, 'assets.json');
const FILES_DIR = path.join(STACKLANE_DIR, 'files');

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

function readList<T>(filePath: string): T[] {
  ensureStacklaneDir()
  if (!fs.existsSync(filePath)) return []
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T[]
}

function writeList<T>(filePath: string, data: T[]) {
  ensureStacklaneDir()
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
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
  .version('0.4.0');

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

    const tokens = (config.tokens as any[]) || [];
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
    const tokens = (config.tokens as any[]) || [];
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
    const tokens = (config.tokens as any[]) || [];
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
  .command('customers create')
  .description('Create an API customer')
  .option('-n, --name <name>', 'Customer name')
  .option('-e, --email <email>', 'Customer email')
  .action((opts) => {
    ensureStacklaneDir();
    const id = generateId('cust');
    const customers = readList<any>(CUSTOMERS_FILE)
    customers.push({ id, name: opts.name || 'Customer', email: opts.email, status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    writeList(CUSTOMERS_FILE, customers)
    console.log(`✓ Customer created: ${opts.name || 'Customer'}`);
    console.log(`  ID: ${id}`);
  });

program
  .command('customers list')
  .description('List API customers')
  .action(() => {
    const customers = readList<any>(CUSTOMERS_FILE)
    if (customers.length === 0) { console.log('  No customers found.'); return; }
    for (const c of customers) console.log(`  - ${c.name} (${c.id})`);
  });

program
  .command('keys create')
  .description('Create a customer API key')
  .option('-c, --customer <id>', 'Customer ID')
  .option('-n, --name <name>', 'Key name', 'default')
  .option('--live', 'Create a live key instead of dev')
  .action((opts) => {
    ensureStacklaneDir();
    const rawKey = generateToken(opts.live ? 'sk_lane_live' : 'sk_lane_dev');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keys = readList<any>(API_KEYS_FILE)
    keys.push({ id: generateId('key'), customerId: opts.customer, name: opts.name, keyHash, keyPrefix: rawKey.slice(0, 16), status: 'active', scopes: ['*'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    writeList(API_KEYS_FILE, keys)
    console.log(`✓ API key created: ${opts.name}`);
    console.log(`  Key: ${rawKey}`);
    console.log(`\n⚠ Store this key securely. It will not be shown again.`);
  });

program
  .command('keys list')
  .description('List API keys')
  .action(() => {
    const keys = readList<any>(API_KEYS_FILE)
    if (keys.length === 0) { console.log('  No API keys found.'); return }
    for (const key of keys) console.log(`  - ${key.name} (${key.id}) ${key.keyPrefix} ${key.status}`)
  })

program
  .command('keys revoke')
  .description('Revoke an API key')
  .requiredOption('-i, --id <id>', 'API key ID')
  .action((opts) => {
    const keys = readList<any>(API_KEYS_FILE)
    const next = keys.map((key) => key.id === opts.id ? { ...key, status: 'revoked', updatedAt: new Date().toISOString() } : key)
    writeList(API_KEYS_FILE, next)
    console.log(`✓ Revoked API key: ${opts.id}`)
  })

program
  .command('usage record')
  .description('Record a usage event')
  .requiredOption('-p, --product <product>', 'Product name')
  .requiredOption('-a, --action <action>', 'Usage action')
  .option('-u, --units <units>', 'Units', '1')
  .option('-c, --customer <id>', 'Customer ID')
  .action((opts) => {
    const events = readList<any>(USAGE_EVENTS_FILE)
    events.push({ id: generateId('usage'), customerId: opts.customer, product: opts.product, action: opts.action, units: Number(opts.units), createdAt: new Date().toISOString() })
    writeList(USAGE_EVENTS_FILE, events)
    console.log(`✓ Usage event recorded: ${opts.product}/${opts.action}`)
  })

program
  .command('usage list')
  .description('List usage events')
  .action(() => {
    const events = readList<any>(USAGE_EVENTS_FILE)
    if (events.length === 0) { console.log('  No usage events found.'); return }
    for (const event of events) console.log(`  - ${event.product}/${event.action} units=${event.units}`)
  })

program
  .command('usage summary')
  .description('Show usage summary')
  .action(() => {
    const events = readList<any>(USAGE_EVENTS_FILE)
    console.log(`  Total events: ${events.length}`);
    const byType: Record<string, number> = {};
    for (const e of events) { const key = `${e.product}:${e.action}`; byType[key] = (byType[key] || 0) + Number(e.units || 0); }
    for (const [type, count] of Object.entries(byType)) console.log(`  ${type}: ${count}`);
  });

program
  .command('assets create')
  .description('Create an asset record')
  .requiredOption('-p, --product <product>', 'Product name')
  .requiredOption('-f, --filename <filename>', 'Asset filename')
  .option('-t, --content-type <type>', 'Content type', 'application/octet-stream')
  .option('--file <path>', 'Local file path to store')
  .action((opts) => {
    ensureStacklaneDir();
    const assets = readList<any>(ASSETS_FILE)
    let storagePath = ''
    let sizeBytes = 0
    if (opts.file) {
      if (!fs.existsSync(opts.file)) { console.error('✗ File not found'); process.exit(1) }
      fs.mkdirSync(FILES_DIR, { recursive: true })
      const output = `${generateId('file')}-${path.basename(opts.filename)}`
      const destination = path.join(FILES_DIR, output)
      fs.copyFileSync(opts.file, destination)
      storagePath = destination
      sizeBytes = fs.statSync(destination).size
    }
    const asset = { id: generateId('asset'), product: opts.product, filename: opts.filename, contentType: opts.contentType, sizeBytes, storagePath, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    assets.push(asset)
    writeList(ASSETS_FILE, assets)
    console.log(`✓ Asset created: ${asset.id}`)
  })

program
  .command('assets list')
  .description('List assets')
  .action(() => {
    const assets = readList<any>(ASSETS_FILE)
    if (assets.length === 0) { console.log('  No assets found.'); return }
    for (const asset of assets) console.log(`  - ${asset.id} ${asset.product} ${asset.filename}`)
  })

program
  .command('assets get')
  .description('Get an asset')
  .requiredOption('-i, --id <id>', 'Asset ID')
  .action((opts) => {
    const assets = readList<any>(ASSETS_FILE)
    const asset = assets.find((entry) => entry.id === opts.id)
    if (!asset) { console.log('  Asset not found.'); return }
    console.log(JSON.stringify(asset, null, 2))
  })

program
  .command('assets delete')
  .description('Delete an asset')
  .requiredOption('-i, --id <id>', 'Asset ID')
  .action((opts) => {
    const assets = readList<any>(ASSETS_FILE)
    writeList(ASSETS_FILE, assets.filter((asset) => asset.id !== opts.id))
    console.log(`✓ Deleted asset: ${opts.id}`)
  })

program
  .command('doctor')
  .description('Show local Stacklane config status')
  .action(() => {
    console.log(`  .stacklane/: ${fs.existsSync(STACKLANE_DIR) ? 'present' : 'missing'}`)
    console.log(`  customers.json: ${fs.existsSync(CUSTOMERS_FILE) ? 'present' : 'missing'}`)
    console.log(`  api-keys.json: ${fs.existsSync(API_KEYS_FILE) ? 'present' : 'missing'}`)
    console.log(`  usage-events.json: ${fs.existsSync(USAGE_EVENTS_FILE) ? 'present' : 'missing'}`)
    console.log(`  assets.json: ${fs.existsSync(ASSETS_FILE) ? 'present' : 'missing'}`)
    console.log(`  STACKLANE_MAX_FILE_SIZE_BYTES: ${process.env.STACKLANE_MAX_FILE_SIZE_BYTES ? 'present' : 'missing'}`)
    console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? 'present' : 'missing'}`)
  })

program.parse();
