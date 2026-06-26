"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = require("node:http");
const node_crypto_1 = require("node:crypto");
const config_1 = require("./config");
const db_1 = require("./db");
const local_store_1 = require("./local-store");
const http_1 = require("./http");
const seed_1 = require("./bootstrap/seed");
const utils_1 = require("./utils");
const organization_repo_1 = require("./repositories/organization-repo");
const project_repo_1 = require("./repositories/project-repo");
const audit_repo_1 = require("./repositories/audit-repo");
const validation_1 = require("./validation");
const formatters_1 = require("./services/formatters");
const user_repo_1 = require("./repositories/user-repo");
const session_repo_1 = require("./repositories/session-repo");
const api_key_repo_1 = require("./repositories/api-key-repo");
const region_repo_1 = require("./repositories/region-repo");
const provisioning_repo_1 = require("./repositories/provisioning-repo");
const orchestrator_1 = require("./services/provisioning/orchestrator");
const mock_adapter_1 = require("./services/provisioning/mock-adapter");
const policy_1 = require("./policy");
const SESSION_TTL_DAYS = 7;
const WORKER_INTERVAL_MS = Number(process.env.PROVISIONING_WORKER_INTERVAL_MS || 3000);
const adapter = new mock_adapter_1.MockProvisioningAdapter();
const workerId = `worker-${(0, node_crypto_1.randomUUID)().slice(0, 8)}`;
function requireLocalApiKey(req) {
    const authHeader = req.headers.authorization;
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const headerKey = typeof req.headers['x-api-key'] === 'string' ? req.headers['x-api-key'] : undefined;
    const rawKey = bearer || headerKey;
    if (!rawKey)
        throw new http_1.HttpError(401, 'MISSING_API_KEY', 'Missing API key.');
    const apiKey = (0, local_store_1.authenticateApiKey)(rawKey);
    if (!apiKey || apiKey.status !== 'active') {
        throw new http_1.HttpError(401, 'INVALID_API_KEY', 'Invalid or revoked API key.');
    }
    return apiKey;
}
async function getAuthUser(req) {
    const cookies = (0, http_1.parseCookies)(req);
    const token = cookies.sl_session;
    if (!token)
        return null;
    const session = await (0, session_repo_1.findSessionByHash)((0, utils_1.hashValue)(token));
    if (!session)
        return null;
    await (0, session_repo_1.touchSession)(session.id);
    const user = await (0, user_repo_1.findUserById)(session.user_id);
    if (!user)
        return null;
    return user;
}
async function requireUser(req) {
    const user = await getAuthUser(req);
    if (!user)
        throw new http_1.HttpError(401, 'UNAUTHORIZED', 'Authentication required.');
    return user;
}
async function enforceProjectPermission(projectId, userId, action) {
    const role = await (0, project_repo_1.findUserRoleForProject)(projectId, userId);
    (0, policy_1.requirePermission)(role, action);
    return role;
}
async function enforceOrganizationPermission(organizationId, userId, action) {
    const role = await (0, organization_repo_1.findUserRoleForOrganization)(organizationId, userId);
    (0, policy_1.requirePermission)(role, action);
    return role;
}
async function handler(req, res) {
    if (!req.url || !req.method)
        throw new http_1.HttpError(400, 'BAD_REQUEST', 'Malformed request metadata.');
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname;
    if (req.method === 'OPTIONS') {
        (0, http_1.sendJson)(res, 204, {});
        return;
    }
    if (req.method === 'GET' && path === '/health') {
        (0, http_1.sendJson)(res, 200, { ok: true, service: 'stacklane-api', now: new Date().toISOString(), adapter: adapter.name, workerId });
        return;
    }
    if (req.method === 'GET' && path === '/api/v1/health') {
        (0, http_1.sendJson)(res, 200, { ok: true, service: 'stacklane-api', version: '0.4.0', mode: 'local-first', timestamp: new Date().toISOString() });
        return;
    }
    if (req.method === 'GET' && path === '/api/v1/config/status') {
        (0, http_1.sendJson)(res, 200, { ok: true, config: (0, local_store_1.getConfigStatus)() });
        return;
    }
    if (req.method === 'POST' && path === '/api/v1/customers') {
        const body = await (0, http_1.parseBody)(req);
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        if (!name)
            throw new http_1.HttpError(422, 'VALIDATION_ERROR', 'name is required.');
        const customer = (0, local_store_1.createCustomer)({
            name,
            email: typeof body.email === 'string' ? body.email : undefined,
            externalRef: typeof body.externalRef === 'string' ? body.externalRef : undefined,
            status: body.status === 'suspended' || body.status === 'deleted' ? body.status : 'active'
        });
        (0, http_1.sendJson)(res, 201, { ok: true, customer });
        return;
    }
    if (req.method === 'GET' && path === '/api/v1/customers') {
        (0, http_1.sendJson)(res, 200, { ok: true, customers: (0, local_store_1.listCustomers)() });
        return;
    }
    if (path.startsWith('/api/v1/customers/')) {
        const customerId = decodeURIComponent(path.replace('/api/v1/customers/', ''));
        if (req.method === 'GET') {
            const customer = (0, local_store_1.getCustomer)(customerId);
            if (!customer)
                throw new http_1.HttpError(404, 'NOT_FOUND', 'Customer not found.');
            (0, http_1.sendJson)(res, 200, { ok: true, customer });
            return;
        }
        if (req.method === 'PATCH') {
            const body = await (0, http_1.parseBody)(req);
            const customer = (0, local_store_1.updateCustomer)(customerId, {
                name: typeof body.name === 'string' ? body.name.trim() : undefined,
                email: typeof body.email === 'string' ? body.email : undefined,
                externalRef: typeof body.externalRef === 'string' ? body.externalRef : undefined,
                status: body.status === 'active' || body.status === 'suspended' || body.status === 'deleted' ? body.status : undefined
            });
            if (!customer)
                throw new http_1.HttpError(404, 'NOT_FOUND', 'Customer not found.');
            (0, http_1.sendJson)(res, 200, { ok: true, customer });
            return;
        }
    }
    if (req.method === 'POST' && path === '/api/v1/api-keys') {
        const body = await (0, http_1.parseBody)(req);
        const customerId = typeof body.customerId === 'string' ? body.customerId : '';
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        if (!customerId || !(0, local_store_1.getCustomer)(customerId))
            throw new http_1.HttpError(422, 'VALIDATION_ERROR', 'customerId must reference an existing customer.');
        if (!name)
            throw new http_1.HttpError(422, 'VALIDATION_ERROR', 'name is required.');
        const result = (0, local_store_1.createApiKey)({
            customerId,
            name,
            scopes: Array.isArray(body.scopes) ? body.scopes.filter((value) => typeof value === 'string') : undefined,
            mode: body.mode === 'live' ? 'live' : 'dev'
        });
        (0, http_1.sendJson)(res, 201, {
            ok: true,
            apiKey: {
                ...result.apiKey,
                rawKey: result.rawKey
            },
            warning: 'Store this raw API key securely. It will not be shown again.'
        });
        return;
    }
    if (req.method === 'GET' && path === '/api/v1/api-keys') {
        const customerId = url.searchParams.get('customerId') || undefined;
        (0, http_1.sendJson)(res, 200, { ok: true, apiKeys: (0, local_store_1.listApiKeys)(customerId) });
        return;
    }
    if (req.method === 'POST' && path.startsWith('/api/v1/api-keys/') && path.endsWith('/revoke')) {
        const keyId = decodeURIComponent(path.replace('/api/v1/api-keys/', '').replace('/revoke', ''));
        const apiKey = (0, local_store_1.revokeApiKey)(keyId);
        if (!apiKey)
            throw new http_1.HttpError(404, 'NOT_FOUND', 'API key not found.');
        (0, http_1.sendJson)(res, 200, { ok: true, apiKey });
        return;
    }
    if (req.method === 'POST' && path === '/api/v1/usage/events') {
        const apiKey = requireLocalApiKey(req);
        const body = await (0, http_1.parseBody)(req);
        const product = typeof body.product === 'string' ? body.product.trim() : '';
        const action = typeof body.action === 'string' ? body.action.trim() : '';
        const units = typeof body.units === 'number' ? body.units : Number(body.units || 0);
        if (!product || !action || !Number.isFinite(units) || units <= 0) {
            throw new http_1.HttpError(422, 'VALIDATION_ERROR', 'product, action, and positive units are required.');
        }
        const event = (0, local_store_1.recordUsageEvent)({
            customerId: apiKey.customerId,
            apiKeyId: apiKey.id,
            product,
            action,
            units,
            metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : undefined
        });
        (0, http_1.sendJson)(res, 201, { ok: true, event });
        return;
    }
    if (req.method === 'GET' && path === '/api/v1/usage/events') {
        requireLocalApiKey(req);
        const events = (0, local_store_1.listUsageEvents)({
            customerId: url.searchParams.get('customerId') || undefined,
            product: url.searchParams.get('product') || undefined,
            action: url.searchParams.get('action') || undefined,
            from: url.searchParams.get('from') || undefined,
            to: url.searchParams.get('to') || undefined
        });
        (0, http_1.sendJson)(res, 200, { ok: true, events });
        return;
    }
    if (req.method === 'GET' && path === '/api/v1/usage/summary') {
        requireLocalApiKey(req);
        const filters = {
            customerId: url.searchParams.get('customerId') || undefined,
            product: url.searchParams.get('product') || undefined,
            action: url.searchParams.get('action') || undefined,
            from: url.searchParams.get('from') || undefined,
            to: url.searchParams.get('to') || undefined
        };
        (0, http_1.sendJson)(res, 200, {
            ok: true,
            summary: (0, local_store_1.summarizeUsage)(filters),
            byCustomer: (0, local_store_1.summarizeUsageByCustomer)(filters),
            byProduct: (0, local_store_1.summarizeUsageByProduct)(filters),
            byAction: (0, local_store_1.summarizeUsageByAction)(filters)
        });
        return;
    }
    if (req.method === 'POST' && path === '/api/v1/assets') {
        const apiKey = requireLocalApiKey(req);
        const body = await (0, http_1.parseBody)(req);
        const product = typeof body.product === 'string' ? body.product.trim() : '';
        const filename = typeof body.filename === 'string' ? body.filename.trim() : '';
        const contentType = typeof body.contentType === 'string' ? body.contentType.trim() : 'application/octet-stream';
        if (!product || !filename)
            throw new http_1.HttpError(422, 'VALIDATION_ERROR', 'product and filename are required.');
        const asset = (0, local_store_1.createAssetRecord)({
            customerId: apiKey.customerId,
            product,
            filename,
            contentType,
            publicUrl: typeof body.publicUrl === 'string' ? body.publicUrl : undefined,
            metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : undefined,
            bytesBase64: typeof body.bytesBase64 === 'string' ? body.bytesBase64 : undefined
        });
        (0, http_1.sendJson)(res, 201, { ok: true, asset });
        return;
    }
    if (req.method === 'GET' && path === '/api/v1/assets') {
        requireLocalApiKey(req);
        (0, http_1.sendJson)(res, 200, {
            ok: true,
            assets: (0, local_store_1.listAssets)({
                customerId: url.searchParams.get('customerId') || undefined,
                product: url.searchParams.get('product') || undefined
            })
        });
        return;
    }
    if (path.startsWith('/api/v1/assets/')) {
        requireLocalApiKey(req);
        const assetId = decodeURIComponent(path.replace('/api/v1/assets/', ''));
        if (req.method === 'GET') {
            const asset = (0, local_store_1.getAsset)(assetId);
            if (!asset)
                throw new http_1.HttpError(404, 'NOT_FOUND', 'Asset not found.');
            (0, http_1.sendJson)(res, 200, { ok: true, asset });
            return;
        }
        if (req.method === 'DELETE') {
            const asset = (0, local_store_1.deleteAssetRecord)(assetId);
            if (!asset)
                throw new http_1.HttpError(404, 'NOT_FOUND', 'Asset not found.');
            (0, http_1.sendJson)(res, 200, { ok: true, asset });
            return;
        }
    }
    if (req.method === 'POST' && path === '/auth/login') {
        const payload = validation_1.loginSchema.safeParse(await (0, http_1.parseBody)(req));
        if (!payload.success)
            throw new http_1.HttpError(422, 'VALIDATION_ERROR', 'Invalid login payload.');
        const user = await (0, user_repo_1.findUserByEmail)(payload.data.email);
        if (!user || !user.password_hash || !(0, utils_1.verifyPassword)(payload.data.password, user.password_hash)) {
            throw new http_1.HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email/password.');
        }
        const token = (0, utils_1.createSessionToken)();
        await (0, session_repo_1.createSession)({
            id: (0, utils_1.makeId)('sess'),
            userId: user.id,
            sessionHash: (0, utils_1.hashValue)(token),
            expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
        });
        await (0, user_repo_1.touchUserLogin)(user.id);
        (0, http_1.setSessionCookie)(res, token);
        await (0, audit_repo_1.recordAuditEvent)({
            id: (0, utils_1.makeId)('evt'),
            action: 'auth.login',
            targetType: 'user',
            targetId: user.id,
            actorUserId: user.id,
            metadata: { email: user.email }
        });
        (0, http_1.sendData)(res, 200, (0, formatters_1.toUserResponse)(user));
        return;
    }
    if (req.method === 'POST' && path === '/auth/logout') {
        const cookies = (0, http_1.parseCookies)(req);
        if (cookies.sl_session) {
            const hash = (0, utils_1.hashValue)(cookies.sl_session);
            const existingSession = await (0, session_repo_1.findSessionByHash)(hash);
            await (0, session_repo_1.revokeSessionByHash)(hash);
            if (existingSession) {
                await (0, audit_repo_1.recordAuditEvent)({
                    id: (0, utils_1.makeId)('evt'),
                    action: 'auth.logout',
                    targetType: 'user',
                    targetId: existingSession.user_id,
                    actorUserId: existingSession.user_id
                });
            }
        }
        (0, http_1.clearSessionCookie)(res);
        (0, http_1.sendData)(res, 200, { ok: true });
        return;
    }
    if (req.method === 'GET' && path === '/auth/me') {
        const user = await requireUser(req);
        (0, http_1.sendData)(res, 200, (0, formatters_1.toUserResponse)(user));
        return;
    }
    const user = await requireUser(req);
    if (req.method === 'GET' && path === '/regions') {
        const regions = await (0, region_repo_1.listRegions)();
        (0, http_1.sendData)(res, 200, regions.map(formatters_1.toRegionResponse));
        return;
    }
    if (req.method === 'GET' && path === '/organizations') {
        const organizations = await (0, organization_repo_1.listOrganizationsByUser)(user.id);
        (0, http_1.sendData)(res, 200, organizations.map(formatters_1.toOrganizationResponse));
        return;
    }
    if (req.method === 'POST' && path === '/organizations') {
        (0, policy_1.requirePermission)('owner', 'organization:create');
        const payload = validation_1.createOrganizationSchema.safeParse(await (0, http_1.parseBody)(req));
        if (!payload.success)
            throw new http_1.HttpError(422, 'VALIDATION_ERROR', payload.error.issues[0]?.message || 'Invalid payload');
        const created = await (0, organization_repo_1.createOrganization)({
            id: (0, utils_1.makeId)('org'),
            name: payload.data.name.trim(),
            slug: (0, utils_1.safeSlug)(payload.data.slug || payload.data.name)
        });
        await (0, organization_repo_1.addOrganizationMember)({ id: (0, utils_1.makeId)('om'), organizationId: created.id, userId: user.id, role: 'owner' });
        await (0, audit_repo_1.recordAuditEvent)({
            id: (0, utils_1.makeId)('evt'),
            action: 'organization.created',
            targetType: 'organization',
            targetId: created.id,
            organizationId: created.id,
            actorUserId: user.id,
            metadata: { slug: created.slug }
        });
        (0, http_1.sendData)(res, 201, (0, formatters_1.toOrganizationResponse)(created));
        return;
    }
    if (req.method === 'GET' && path.startsWith('/organizations/')) {
        const idOrSlug = decodeURIComponent(path.replace('/organizations/', ''));
        if (idOrSlug.endsWith('/operations')) {
            const orgRef = idOrSlug.replace('/operations', '');
            const organization = await (0, organization_repo_1.findOrganizationByIdOrSlugForUser)(orgRef, user.id);
            if (!organization)
                throw new http_1.HttpError(404, 'NOT_FOUND', 'Organization was not found.', { id: orgRef });
            const projects = await (0, project_repo_1.listProjectsByOrganizationForUser)(organization.id, user.id);
            const rows = await Promise.all(projects.map(async (project) => {
                const latestTask = await (0, provisioning_repo_1.findLatestProvisioningTask)(project.id);
                const region = latestTask?.region_id ? await (0, region_repo_1.findRegionById)(latestTask.region_id) : null;
                return {
                    project: (0, formatters_1.toProjectResponse)(project, (0, formatters_1.toOrganizationResponse)(organization)),
                    provisioning: latestTask ? (0, formatters_1.toProvisioningTaskResponse)(latestTask, region ? (0, formatters_1.toRegionResponse)(region) : null) : null,
                    capabilities: (0, policy_1.projectCapabilities)(await (0, project_repo_1.findUserRoleForProject)(project.id, user.id))
                };
            }));
            (0, http_1.sendData)(res, 200, rows);
            return;
        }
        if (idOrSlug.endsWith('/projects')) {
            const orgRef = idOrSlug.replace('/projects', '');
            const organization = await (0, organization_repo_1.findOrganizationByIdOrSlugForUser)(orgRef, user.id);
            if (!organization)
                throw new http_1.HttpError(404, 'NOT_FOUND', 'Organization was not found.', { id: orgRef });
            const projects = await (0, project_repo_1.listProjectsByOrganizationForUser)(organization.id, user.id);
            (0, http_1.sendData)(res, 200, projects.map((project) => (0, formatters_1.toProjectResponse)(project, (0, formatters_1.toOrganizationResponse)(organization))));
            return;
        }
        if (idOrSlug.endsWith('/events')) {
            const orgRef = idOrSlug.replace('/events', '');
            const organization = await (0, organization_repo_1.findOrganizationByIdOrSlugForUser)(orgRef, user.id);
            if (!organization)
                throw new http_1.HttpError(404, 'NOT_FOUND', 'Organization was not found.', { id: orgRef });
            const events = await (0, audit_repo_1.listOrganizationEvents)(organization.id);
            (0, http_1.sendData)(res, 200, events.map(formatters_1.toAuditResponse));
            return;
        }
        const organization = await (0, organization_repo_1.findOrganizationByIdOrSlugForUser)(idOrSlug, user.id);
        if (!organization)
            throw new http_1.HttpError(404, 'NOT_FOUND', 'Organization was not found.', { id: idOrSlug });
        (0, http_1.sendData)(res, 200, (0, formatters_1.toOrganizationResponse)(organization));
        return;
    }
    if (req.method === 'GET' && path === '/projects') {
        const projects = await (0, project_repo_1.listProjectsByUser)(user.id);
        const organizations = await (0, organization_repo_1.listOrganizationsByUser)(user.id);
        const data = await Promise.all(projects.map(async (project) => {
            const org = organizations.find((entry) => entry.id === project.organization_id) || null;
            const role = await (0, project_repo_1.findUserRoleForProject)(project.id, user.id);
            return { ...(0, formatters_1.toProjectResponse)(project, org ? (0, formatters_1.toOrganizationResponse)(org) : null), capabilities: (0, policy_1.projectCapabilities)(role) };
        }));
        (0, http_1.sendData)(res, 200, data);
        return;
    }
    if (req.method === 'POST' && path === '/projects') {
        const payload = validation_1.createProjectSchema.safeParse(await (0, http_1.parseBody)(req));
        if (!payload.success)
            throw new http_1.HttpError(422, 'VALIDATION_ERROR', payload.error.issues[0]?.message || 'Invalid payload');
        const organization = await (0, organization_repo_1.findOrganizationByIdOrSlugForUser)(payload.data.organizationId, user.id);
        if (!organization)
            throw new http_1.HttpError(404, 'NOT_FOUND', 'Organization was not found.', { id: payload.data.organizationId });
        await enforceOrganizationPermission(organization.id, user.id, 'project:create');
        const created = await (0, project_repo_1.createProject)({
            id: (0, utils_1.makeId)('prj'),
            organizationId: organization.id,
            name: payload.data.name,
            slug: (0, utils_1.safeSlug)(payload.data.slug || payload.data.name),
            status: payload.data.status,
            region: payload.data.region,
            description: payload.data.description || ''
        });
        await (0, audit_repo_1.recordAuditEvent)({
            id: (0, utils_1.makeId)('evt'),
            action: 'project.created',
            targetType: 'project',
            targetId: created.id,
            organizationId: created.organization_id,
            projectId: created.id,
            actorUserId: user.id,
            metadata: { status: created.status }
        });
        (0, http_1.sendData)(res, 201, (0, formatters_1.toProjectResponse)(created, (0, formatters_1.toOrganizationResponse)(organization)));
        return;
    }
    if (path.startsWith('/projects/')) {
        const ref = decodeURIComponent(path.replace('/projects/', ''));
        if (req.method === 'POST' && ref.endsWith('/provision')) {
            const projectRef = ref.replace('/provision', '');
            const project = await (0, project_repo_1.findProjectByIdOrSlugForUser)(projectRef, user.id);
            if (!project)
                throw new http_1.HttpError(404, 'NOT_FOUND', 'Project not found.', { id: projectRef });
            await enforceProjectPermission(project.id, user.id, 'provisioning:request');
            const payload = validation_1.provisionProjectSchema.safeParse(await (0, http_1.parseBody)(req));
            if (!payload.success)
                throw new http_1.HttpError(422, 'VALIDATION_ERROR', 'Invalid provision payload');
            const result = await (0, orchestrator_1.requestProjectProvisioning)({ projectRef, user, regionCode: payload.data.regionCode });
            if (!result)
                throw new http_1.HttpError(404, 'NOT_FOUND', 'Project was not found.', { id: projectRef });
            const region = result.task.region_id ? await (0, region_repo_1.findRegionById)(result.task.region_id) : null;
            (0, http_1.sendData)(res, 202, (0, formatters_1.toProvisioningTaskResponse)(result.task, region ? (0, formatters_1.toRegionResponse)(region) : null));
            return;
        }
        if (req.method === 'POST' && ref.endsWith('/provisioning/retry')) {
            const projectRef = ref.replace('/provisioning/retry', '');
            const project = await (0, project_repo_1.findProjectByIdOrSlugForUser)(projectRef, user.id);
            if (!project)
                throw new http_1.HttpError(404, 'NOT_FOUND', 'Project not found.', { id: projectRef });
            await enforceProjectPermission(project.id, user.id, 'provisioning:retry');
            const result = await (0, orchestrator_1.retryLatestProvisioning)(projectRef, user);
            if (!result || !result.task)
                throw new http_1.HttpError(404, 'NOT_FOUND', 'No task to retry.', { id: projectRef });
            const region = result.task.region_id ? await (0, region_repo_1.findRegionById)(result.task.region_id) : null;
            (0, http_1.sendData)(res, 200, (0, formatters_1.toProvisioningTaskResponse)(result.task, region ? (0, formatters_1.toRegionResponse)(region) : null));
            return;
        }
        if (req.method === 'GET' && ref.endsWith('/provisioning')) {
            const projectRef = ref.replace('/provisioning', '');
            const project = await (0, project_repo_1.findProjectByIdOrSlugForUser)(projectRef, user.id);
            if (!project)
                throw new http_1.HttpError(404, 'NOT_FOUND', 'Project not found.', { id: projectRef });
            const snapshot = await (0, orchestrator_1.getProjectProvisioningSnapshot)(project.id);
            const role = await (0, project_repo_1.findUserRoleForProject)(project.id, user.id);
            if (!snapshot)
                return (0, http_1.sendData)(res, 200, { task: null, attempts: [], runtimeBinding: null, capabilities: (0, policy_1.projectCapabilities)(role) });
            const runtimeBinding = await (0, provisioning_repo_1.findRuntimeBindingByProject)(project.id);
            (0, http_1.sendData)(res, 200, {
                task: (0, formatters_1.toProvisioningTaskResponse)(snapshot.task, snapshot.region ? (0, formatters_1.toRegionResponse)(snapshot.region) : null),
                attempts: snapshot.attempts.map(formatters_1.toProvisioningAttemptResponse),
                runtimeBinding: runtimeBinding ? (0, formatters_1.toRuntimeBindingResponse)(runtimeBinding) : null,
                capabilities: (0, policy_1.projectCapabilities)(role)
            });
            return;
        }
        if (req.method === 'GET' && ref.endsWith('/provisioning/tasks')) {
            const projectRef = ref.replace('/provisioning/tasks', '');
            const project = await (0, project_repo_1.findProjectByIdOrSlugForUser)(projectRef, user.id);
            if (!project)
                throw new http_1.HttpError(404, 'NOT_FOUND', 'Project not found.', { id: projectRef });
            const tasks = await (0, provisioning_repo_1.listProvisioningTasks)(project.id);
            const data = await Promise.all(tasks.map(async (task) => {
                const region = task.region_id ? await (0, region_repo_1.findRegionById)(task.region_id) : null;
                return (0, formatters_1.toProvisioningTaskResponse)(task, region ? (0, formatters_1.toRegionResponse)(region) : null);
            }));
            (0, http_1.sendData)(res, 200, data);
            return;
        }
        if (req.method === 'GET' && ref.endsWith('/events')) {
            const projectRef = ref.replace('/events', '');
            const project = await (0, project_repo_1.findProjectByIdOrSlugForUser)(projectRef, user.id);
            if (!project)
                throw new http_1.HttpError(404, 'NOT_FOUND', 'Project not found.', { id: projectRef });
            const events = await (0, audit_repo_1.listProjectEvents)(project.id);
            (0, http_1.sendData)(res, 200, events.map(formatters_1.toAuditResponse));
            return;
        }
        if (req.method === 'GET' && ref.endsWith('/environments')) {
            const projectRef = ref.replace('/environments', '');
            const project = await (0, project_repo_1.findProjectByIdOrSlugForUser)(projectRef, user.id);
            if (!project)
                throw new http_1.HttpError(404, 'NOT_FOUND', 'Project not found.', { id: projectRef });
            const environments = await (0, project_repo_1.listProjectEnvironments)(project.id);
            (0, http_1.sendData)(res, 200, environments.map(formatters_1.toEnvironmentResponse));
            return;
        }
        if (req.method === 'POST' && ref.endsWith('/environments')) {
            const projectRef = ref.replace('/environments', '');
            const project = await (0, project_repo_1.findProjectByIdOrSlugForUser)(projectRef, user.id);
            if (!project)
                throw new http_1.HttpError(404, 'NOT_FOUND', 'Project not found.', { id: projectRef });
            await enforceProjectPermission(project.id, user.id, 'environment:create');
            const payload = validation_1.createEnvironmentSchema.safeParse(await (0, http_1.parseBody)(req));
            if (!payload.success)
                throw new http_1.HttpError(422, 'VALIDATION_ERROR', payload.error.issues[0]?.message || 'Invalid payload');
            const environment = await (0, project_repo_1.createProjectEnvironment)({
                id: (0, utils_1.makeId)('env'),
                projectId: project.id,
                name: payload.data.name,
                slug: (0, utils_1.safeSlug)(payload.data.slug || payload.data.name),
                status: payload.data.status,
                region: payload.data.region,
                deploymentTarget: payload.data.deploymentTarget
            });
            await (0, audit_repo_1.recordAuditEvent)({
                id: (0, utils_1.makeId)('evt'),
                action: 'environment.created',
                targetType: 'environment',
                targetId: environment.id,
                organizationId: project.organization_id,
                projectId: project.id,
                actorUserId: user.id,
                metadata: { slug: environment.slug, region: environment.region }
            });
            (0, http_1.sendData)(res, 201, (0, formatters_1.toEnvironmentResponse)(environment));
            return;
        }
        if (req.method === 'PATCH' && ref.includes('/environments/')) {
            const [projectRef, envId] = ref.split('/environments/');
            const project = await (0, project_repo_1.findProjectByIdOrSlugForUser)(projectRef, user.id);
            if (!project)
                throw new http_1.HttpError(404, 'NOT_FOUND', 'Project not found.', { id: projectRef });
            await enforceProjectPermission(project.id, user.id, 'environment:update');
            const payload = validation_1.updateEnvironmentSchema.safeParse(await (0, http_1.parseBody)(req));
            if (!payload.success)
                throw new http_1.HttpError(422, 'VALIDATION_ERROR', payload.error.issues[0]?.message || 'Invalid payload');
            const updated = await (0, project_repo_1.updateEnvironment)(envId, project.id, payload.data);
            if (!updated)
                throw new http_1.HttpError(404, 'NOT_FOUND', 'Environment not found.', { id: envId });
            await (0, audit_repo_1.recordAuditEvent)({
                id: (0, utils_1.makeId)('evt'),
                action: 'environment.updated',
                targetType: 'environment',
                targetId: updated.id,
                organizationId: project.organization_id,
                projectId: project.id,
                actorUserId: user.id,
                metadata: payload.data
            });
            (0, http_1.sendData)(res, 200, (0, formatters_1.toEnvironmentResponse)(updated));
            return;
        }
        if (req.method === 'GET' && ref.endsWith('/api-keys')) {
            const projectRef = ref.replace('/api-keys', '');
            const project = await (0, project_repo_1.findProjectByIdOrSlugForUser)(projectRef, user.id);
            if (!project)
                throw new http_1.HttpError(404, 'NOT_FOUND', 'Project not found.', { id: projectRef });
            const keys = await (0, api_key_repo_1.listProjectApiKeys)(project.id);
            (0, http_1.sendData)(res, 200, keys.map(formatters_1.toApiKeyResponse));
            return;
        }
        if (req.method === 'POST' && ref.endsWith('/api-keys')) {
            const projectRef = ref.replace('/api-keys', '');
            const project = await (0, project_repo_1.findProjectByIdOrSlugForUser)(projectRef, user.id);
            if (!project)
                throw new http_1.HttpError(404, 'NOT_FOUND', 'Project not found.', { id: projectRef });
            await enforceProjectPermission(project.id, user.id, 'apikey:create');
            const payload = validation_1.createApiKeySchema.safeParse(await (0, http_1.parseBody)(req));
            if (!payload.success)
                throw new http_1.HttpError(422, 'VALIDATION_ERROR', payload.error.issues[0]?.message || 'Invalid payload');
            const prefix = `sk_live_${Math.random().toString(36).slice(2, 8)}`;
            const secret = (0, utils_1.createApiSecret)(prefix);
            const created = await (0, api_key_repo_1.createApiKey)({ id: (0, utils_1.makeId)('key'), projectId: project.id, organizationId: project.organization_id, name: payload.data.name, keyPrefix: prefix, keyHash: (0, utils_1.hashValue)(secret) });
            await (0, audit_repo_1.recordAuditEvent)({
                id: (0, utils_1.makeId)('evt'), action: 'api_key.created', targetType: 'api_key', targetId: created.id,
                organizationId: project.organization_id, projectId: project.id, actorUserId: user.id, metadata: { prefix }
            });
            (0, http_1.sendData)(res, 201, { key: (0, formatters_1.toApiKeyResponse)(created), secret });
            return;
        }
        if (req.method === 'POST' && ref.includes('/api-keys/') && ref.endsWith('/revoke')) {
            const [projectRef, keyRef] = ref.split('/api-keys/');
            const keyId = keyRef.replace('/revoke', '');
            const project = await (0, project_repo_1.findProjectByIdOrSlugForUser)(projectRef, user.id);
            if (!project)
                throw new http_1.HttpError(404, 'NOT_FOUND', 'Project not found.', { id: projectRef });
            await enforceProjectPermission(project.id, user.id, 'apikey:revoke');
            const key = await (0, api_key_repo_1.findProjectApiKey)(project.id, keyId);
            if (!key)
                throw new http_1.HttpError(404, 'NOT_FOUND', 'API key not found.', { id: keyId });
            const revoked = await (0, api_key_repo_1.revokeApiKey)(key.id, project.id);
            if (!revoked)
                throw new http_1.HttpError(404, 'NOT_FOUND', 'API key not found.', { id: keyId });
            await (0, audit_repo_1.recordAuditEvent)({ id: (0, utils_1.makeId)('evt'), action: 'api_key.revoked', targetType: 'api_key', targetId: revoked.id, organizationId: project.organization_id, projectId: project.id, actorUserId: user.id, metadata: { prefix: revoked.key_prefix } });
            (0, http_1.sendData)(res, 200, (0, formatters_1.toApiKeyResponse)(revoked));
            return;
        }
        if (req.method === 'GET') {
            const project = await (0, project_repo_1.findProjectByIdOrSlugForUser)(ref, user.id);
            if (!project)
                throw new http_1.HttpError(404, 'NOT_FOUND', 'Project not found.', { id: ref });
            const organizations = await (0, organization_repo_1.listOrganizationsByUser)(user.id);
            const organization = organizations.find((entry) => entry.id === project.organization_id) || null;
            const environments = await (0, project_repo_1.listProjectEnvironments)(project.id);
            const role = await (0, project_repo_1.findUserRoleForProject)(project.id, user.id);
            (0, http_1.sendData)(res, 200, {
                ...(0, formatters_1.toProjectResponse)(project, organization ? (0, formatters_1.toOrganizationResponse)(organization) : null),
                environments: environments.map(formatters_1.toEnvironmentResponse),
                capabilities: (0, policy_1.projectCapabilities)(role)
            });
            return;
        }
        if (req.method === 'PATCH') {
            const project = await (0, project_repo_1.findProjectByIdOrSlugForUser)(ref, user.id);
            if (!project)
                throw new http_1.HttpError(404, 'NOT_FOUND', 'Project not found.', { id: ref });
            await enforceProjectPermission(project.id, user.id, 'project:update');
            const payload = validation_1.updateProjectSchema.safeParse(await (0, http_1.parseBody)(req));
            if (!payload.success)
                throw new http_1.HttpError(422, 'VALIDATION_ERROR', payload.error.issues[0]?.message || 'Invalid payload');
            const updated = await (0, project_repo_1.updateProject)(project.id, payload.data);
            if (!updated)
                throw new http_1.HttpError(404, 'NOT_FOUND', 'Project not found.', { id: ref });
            const organizations = await (0, organization_repo_1.listOrganizationsByUser)(user.id);
            const organization = organizations.find((entry) => entry.id === updated.organization_id) || null;
            await (0, audit_repo_1.recordAuditEvent)({ id: (0, utils_1.makeId)('evt'), action: 'project.updated', targetType: 'project', targetId: updated.id, organizationId: updated.organization_id, projectId: updated.id, actorUserId: user.id, metadata: payload.data });
            (0, http_1.sendData)(res, 200, (0, formatters_1.toProjectResponse)(updated, organization ? (0, formatters_1.toOrganizationResponse)(organization) : null));
            return;
        }
    }
    throw new http_1.HttpError(404, 'NOT_FOUND', 'Route not found.', { method: req.method, path });
}
const server = (0, node_http_1.createServer)(async (req, res) => {
    try {
        await handler(req, res);
    }
    catch (error) {
        if (error instanceof http_1.HttpError)
            return (0, http_1.sendError)(res, error);
        if (error.code === '23505')
            return (0, http_1.sendError)(res, new http_1.HttpError(409, 'DUPLICATE_RESOURCE', 'A uniqueness constraint was violated.'));
        console.error(error);
        (0, http_1.sendError)(res, new http_1.HttpError(500, 'INTERNAL_ERROR', 'Unexpected server error.'));
    }
});
async function start() {
    await db_1.db.query('SELECT 1');
    await (0, seed_1.ensureBootstrapData)();
    setInterval(() => {
        (0, orchestrator_1.runProvisioningWorkerTick)(adapter, workerId).catch((error) => {
            console.error('Provisioning worker tick failed', error);
        });
    }, WORKER_INTERVAL_MS);
    server.listen(config_1.config.port, () => {
        console.log(`Stacklane API running on http://localhost:${config_1.config.port}`);
    });
}
start().catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=server.js.map