import pg from 'pg'
import { randomBytes, scryptSync } from 'node:crypto'

const { Client } = pg
const databaseUrl = process.env.DATABASE_URL || 'postgres://stacklane:stacklane@localhost:5432/stacklane'

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derived}`
}

const client = new Client({ connectionString: databaseUrl })

try {
  await client.connect()

  await client.query(`INSERT INTO regions (id, code, name, market_scope, deployment_target, metadata)
    VALUES
    ('region_af_west_1', 'af-west-1', 'Lagos Core', 'Nigeria/West Africa', 'primary', '{"country":"NG"}'::jsonb),
    ('region_af_south_1', 'af-south-1', 'Cape Town Edge', 'Southern Africa', 'secondary', '{"country":"ZA"}'::jsonb)
    ON CONFLICT (code) DO NOTHING`)

  const userId = 'usr_admin_01'
  const orgId = 'org_stacklane_internal'
  const passwordHash = hashPassword('stacklane-admin')

  await client.query(
    `INSERT INTO users (id, email, name, status, password_hash)
      VALUES ($1, $2, $3, 'active', $4)
      ON CONFLICT (id) DO NOTHING`,
    [userId, 'admin@stacklane.local', 'Stacklane Admin', passwordHash]
  )

  await client.query(
    `INSERT INTO organizations (id, name, slug, status)
      VALUES ($1, $2, $3, 'active')
      ON CONFLICT (id) DO NOTHING`,
    [orgId, 'Stacklane Internal', 'stacklane-internal']
  )

  await client.query(
    `INSERT INTO organization_members (id, organization_id, user_id, role, status)
      VALUES ('org_member_owner_01', $1, $2, 'owner', 'active')
      ON CONFLICT (organization_id, user_id) DO NOTHING`,
    [orgId, userId]
  )

  await client.query(
    `INSERT INTO projects (id, organization_id, name, slug, status, region, description)
      VALUES
      ('prj_payflow_api', $1, 'payflow-api', 'payflow-api', 'ready', 'af-west-1', 'Payment orchestration control-plane APIs'),
      ('prj_clinic_core', $1, 'clinic-core', 'clinic-core', 'provisioning', 'af-west-1', 'Healthcare records and gateway APIs')
      ON CONFLICT (id) DO NOTHING`,
    [orgId]
  )

  await client.query(
    `INSERT INTO environments (id, project_id, name, slug, status, region, deployment_target)
      VALUES
      ('env_payflow_prod', 'prj_payflow_api', 'Production', 'production', 'active', 'af-west-1', 'primary'),
      ('env_payflow_dev', 'prj_payflow_api', 'Development', 'development', 'active', 'af-west-1', 'primary')
      ON CONFLICT (project_id, slug) DO NOTHING`
  )

  console.log('seed complete')
  console.log('admin login: admin@stacklane.local / stacklane-admin')
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  await client.end()
}
