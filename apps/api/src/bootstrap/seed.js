"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureBootstrapData = ensureBootstrapData;
const db_1 = require("../db");
const utils_1 = require("../utils");
const region_repo_1 = require("../repositories/region-repo");
async function ensureBootstrapData() {
    await (0, region_repo_1.upsertRegion)({
        id: 'region_af_west_1',
        code: 'af-west-1',
        name: 'Lagos Core',
        marketScope: 'Nigeria/West Africa',
        deploymentTarget: 'primary',
        metadata: { country: 'NG' }
    });
    await (0, region_repo_1.upsertRegion)({
        id: 'region_af_south_1',
        code: 'af-south-1',
        name: 'Cape Town Edge',
        marketScope: 'Southern Africa',
        deploymentTarget: 'secondary',
        metadata: { country: 'ZA' }
    });
    const organizationCount = await db_1.db.query('SELECT COUNT(*)::text AS count FROM organizations');
    if (Number(organizationCount.rows[0]?.count || '0') > 0) {
        return;
    }
    const userId = 'usr_admin_01';
    const orgId = 'org_stacklane_internal';
    const passwordHash = (0, utils_1.hashPassword)('stacklane-admin');
    await db_1.db.query(`INSERT INTO users (id, email, name, status, password_hash)
      VALUES ($1, $2, $3, 'active', $4)
      ON CONFLICT (id) DO NOTHING`, [userId, 'admin@stacklane.local', 'Stacklane Admin', passwordHash]);
    await db_1.db.query(`INSERT INTO organizations (id, name, slug, status)
      VALUES ($1, $2, $3, 'active')
      ON CONFLICT (id) DO NOTHING`, [orgId, 'Stacklane Internal', 'stacklane-internal']);
    await db_1.db.query(`INSERT INTO organization_members (id, organization_id, user_id, role, status)
      VALUES ('org_member_owner_01', $1, $2, 'owner', 'active')
      ON CONFLICT (organization_id, user_id) DO NOTHING`, [orgId, userId]);
    await db_1.db.query(`INSERT INTO projects (id, organization_id, name, slug, status, region, description)
      VALUES
      ('prj_payflow_api', $1, 'payflow-api', 'payflow-api', 'ready', 'af-west-1', 'Payment orchestration control-plane APIs'),
      ('prj_clinic_core', $1, 'clinic-core', 'clinic-core', 'provisioning', 'af-west-1', 'Healthcare records and gateway APIs')
      ON CONFLICT (id) DO NOTHING`, [orgId]);
    await db_1.db.query(`INSERT INTO environments (id, project_id, name, slug, status, region, deployment_target)
      VALUES
      ('env_payflow_prod', 'prj_payflow_api', 'Production', 'production', 'active', 'af-west-1', 'primary'),
      ('env_payflow_dev', 'prj_payflow_api', 'Development', 'development', 'active', 'af-west-1', 'primary'),
      ('env_clinic_prod', 'prj_clinic_core', 'Production', 'production', 'active', 'af-west-1', 'primary')
      ON CONFLICT (project_id, slug) DO NOTHING`);
    await db_1.db.query(`INSERT INTO project_runtime_bindings (
      id, project_id, region_id, database_ref, storage_ref, auth_namespace_ref, functions_namespace_ref, status, diagnostics
    ) VALUES ($1, 'prj_payflow_api', 'region_af_west_1', 'db://af-west-1/payflow-api', 's3://af-west-1/payflow-api',
             'auth://payflow-api', 'fn://payflow-api', 'ready', '{"seeded":true}'::jsonb)
      ON CONFLICT (project_id) DO NOTHING`, [(0, utils_1.makeId)('bind')]);
    await db_1.db.query(`INSERT INTO audit_events (id, organization_id, project_id, actor_user_id, action, target_type, target_id, metadata)
      VALUES
      ('evt_org_created', $1, null, $2, 'organization.created', 'organization', $1, '{"seeded":true}'::jsonb),
      ('evt_prj_created_1', $1, 'prj_payflow_api', $2, 'project.created', 'project', 'prj_payflow_api', '{"seeded":true}'::jsonb),
      ('evt_prv_succeeded_1', $1, 'prj_payflow_api', $2, 'provisioning.succeeded', 'provisioning_task', 'seed-task', '{"seeded":true}'::jsonb)
      ON CONFLICT (id) DO NOTHING`, [orgId, userId]);
}
//# sourceMappingURL=seed.js.map