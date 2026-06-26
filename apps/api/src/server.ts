import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import { config } from './config'
import { db } from './db'
import {
  authenticateApiKey,
  createApiKey as createLocalApiKey,
  createAssetRecord,
  createCustomer as createLocalCustomer,
  deleteAssetRecord,
  getAsset,
  getConfigStatus,
  getCustomer,
  listApiKeys as listLocalApiKeys,
  listAssets,
  listCustomers as listLocalCustomers,
  listUsageEvents,
  recordUsageEvent as recordLocalUsageEvent,
  revokeApiKey as revokeLocalApiKey,
  summarizeUsage,
  summarizeUsageByAction,
  summarizeUsageByCustomer,
  summarizeUsageByProduct,
  updateCustomer as updateLocalCustomer
} from './local-store'
import {
  HttpError,
  clearSessionCookie,
  parseBody,
  parseCookies,
  sendData,
  sendError,
  sendJson,
  setSessionCookie
} from './http'
import { ensureBootstrapData } from './bootstrap/seed'
import { createApiSecret, createSessionToken, hashValue, makeId, safeSlug, verifyPassword } from './utils'
import {
  addOrganizationMember,
  createOrganization,
  findOrganizationByIdOrSlugForUser,
  findUserRoleForOrganization,
  listOrganizationsByUser
} from './repositories/organization-repo'
import {
  createProject,
  createProjectEnvironment,
  findProjectByIdOrSlugForUser,
  findUserRoleForProject,
  listProjectEnvironments,
  listProjectsByOrganizationForUser,
  listProjectsByUser,
  updateEnvironment,
  updateProject
} from './repositories/project-repo'
import { listOrganizationEvents, listProjectEvents, recordAuditEvent } from './repositories/audit-repo'
import {
  createApiKeySchema,
  createEnvironmentSchema,
  createOrganizationSchema,
  createProjectSchema,
  loginSchema,
  provisionProjectSchema,
  updateEnvironmentSchema,
  updateProjectSchema
} from './validation'
import {
  toApiKeyResponse,
  toAuditResponse,
  toEnvironmentResponse,
  toOrganizationResponse,
  toProjectResponse,
  toProvisioningAttemptResponse,
  toProvisioningTaskResponse,
  toRegionResponse,
  toRuntimeBindingResponse,
  toUserResponse
} from './services/formatters'
import { findUserByEmail, findUserById, touchUserLogin } from './repositories/user-repo'
import { createSession, findSessionByHash, revokeSessionByHash, touchSession } from './repositories/session-repo'
import { createApiKey, findProjectApiKey, listProjectApiKeys, revokeApiKey } from './repositories/api-key-repo'
import { findRegionById, listRegions } from './repositories/region-repo'
import {
  findLatestProvisioningTask,
  findRuntimeBindingByProject,
  listProvisioningTasks
} from './repositories/provisioning-repo'
import {
  getProjectProvisioningSnapshot,
  requestProjectProvisioning,
  retryLatestProvisioning,
  runProvisioningWorkerTick
} from './services/provisioning/orchestrator'
import { MockProvisioningAdapter } from './services/provisioning/mock-adapter'
import { projectCapabilities, requirePermission, type PolicyAction } from './policy'

const SESSION_TTL_DAYS = 7
const WORKER_INTERVAL_MS = Number(process.env.PROVISIONING_WORKER_INTERVAL_MS || 3000)
const adapter = new MockProvisioningAdapter()
const workerId = `worker-${randomUUID().slice(0, 8)}`

export { handler }

function requireLocalApiKey(req: IncomingMessage) {
  const authHeader = req.headers.authorization
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  const headerKey = typeof req.headers['x-api-key'] === 'string' ? req.headers['x-api-key'] : undefined
  const rawKey = bearer || headerKey
  if (!rawKey) throw new HttpError(401, 'MISSING_API_KEY', 'Missing API key.')
  const apiKey = authenticateApiKey(rawKey)
  if (!apiKey || apiKey.status !== 'active') {
    throw new HttpError(401, 'INVALID_API_KEY', 'Invalid or revoked API key.')
  }
  return apiKey
}

async function getAuthUser(req: IncomingMessage) {
  const cookies = parseCookies(req)
  const token = cookies.sl_session
  if (!token) return null

  const session = await findSessionByHash(hashValue(token))
  if (!session) return null

  await touchSession(session.id)
  const user = await findUserById(session.user_id)
  if (!user) return null
  return user
}

async function requireUser(req: IncomingMessage) {
  const user = await getAuthUser(req)
  if (!user) throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required.')
  return user
}

async function enforceProjectPermission(projectId: string, userId: string, action: PolicyAction) {
  const role = await findUserRoleForProject(projectId, userId)
  requirePermission(role, action)
  return role
}

async function enforceOrganizationPermission(organizationId: string, userId: string, action: PolicyAction) {
  const role = await findUserRoleForOrganization(organizationId, userId)
  requirePermission(role, action)
  return role
}

async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!req.url || !req.method) throw new HttpError(400, 'BAD_REQUEST', 'Malformed request metadata.')

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const path = url.pathname

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {})
    return
  }

  if (req.method === 'GET' && path === '/health') {
    sendJson(res, 200, { ok: true, service: 'stacklane-api', now: new Date().toISOString(), adapter: adapter.name, workerId })
    return
  }

  if (req.method === 'GET' && path === '/api/v1/health') {
    sendJson(res, 200, { ok: true, service: 'stacklane-api', version: '0.4.0', mode: 'local-first', timestamp: new Date().toISOString() })
    return
  }

  if (req.method === 'GET' && path === '/api/v1/config/status') {
    sendJson(res, 200, { ok: true, config: getConfigStatus() })
    return
  }

  if (req.method === 'POST' && path === '/api/v1/customers') {
    const body = await parseBody(req)
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) throw new HttpError(422, 'VALIDATION_ERROR', 'name is required.')
    const customer = createLocalCustomer({
      name,
      email: typeof body.email === 'string' ? body.email : undefined,
      externalRef: typeof body.externalRef === 'string' ? body.externalRef : undefined,
      status: body.status === 'suspended' || body.status === 'deleted' ? body.status : 'active'
    })
    sendJson(res, 201, { ok: true, customer })
    return
  }

  if (req.method === 'GET' && path === '/api/v1/customers') {
    sendJson(res, 200, { ok: true, customers: listLocalCustomers() })
    return
  }

  if (path.startsWith('/api/v1/customers/')) {
    const customerId = decodeURIComponent(path.replace('/api/v1/customers/', ''))
    if (req.method === 'GET') {
      const customer = getCustomer(customerId)
      if (!customer) throw new HttpError(404, 'NOT_FOUND', 'Customer not found.')
      sendJson(res, 200, { ok: true, customer })
      return
    }
    if (req.method === 'PATCH') {
      const body = await parseBody(req)
      const customer = updateLocalCustomer(customerId, {
        name: typeof body.name === 'string' ? body.name.trim() : undefined,
        email: typeof body.email === 'string' ? body.email : undefined,
        externalRef: typeof body.externalRef === 'string' ? body.externalRef : undefined,
        status: body.status === 'active' || body.status === 'suspended' || body.status === 'deleted' ? body.status : undefined
      })
      if (!customer) throw new HttpError(404, 'NOT_FOUND', 'Customer not found.')
      sendJson(res, 200, { ok: true, customer })
      return
    }
  }

  if (req.method === 'POST' && path === '/api/v1/api-keys') {
    const body = await parseBody(req)
    const customerId = typeof body.customerId === 'string' ? body.customerId : ''
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!customerId || !getCustomer(customerId)) throw new HttpError(422, 'VALIDATION_ERROR', 'customerId must reference an existing customer.')
    if (!name) throw new HttpError(422, 'VALIDATION_ERROR', 'name is required.')
    const result = createLocalApiKey({
      customerId,
      name,
      scopes: Array.isArray(body.scopes) ? body.scopes.filter((value): value is string => typeof value === 'string') : undefined,
      mode: body.mode === 'live' ? 'live' : 'dev'
    })
    sendJson(res, 201, {
      ok: true,
      apiKey: result.apiKey,
      rawKey: result.rawKey,
      warning: 'Store this raw API key securely. It will not be shown again.'
    })
    return
  }

  if (req.method === 'GET' && path === '/api/v1/api-keys') {
    const customerId = url.searchParams.get('customerId') || undefined
    sendJson(res, 200, { ok: true, apiKeys: listLocalApiKeys(customerId) })
    return
  }

  if (req.method === 'POST' && path === '/api/v1/api-keys/verify') {
    const body = await parseBody(req)
    const key = typeof body.key === 'string' ? body.key : ''
    if (!key) throw new HttpError(422, 'VALIDATION_ERROR', 'key is required.')
    const apiKey = authenticateApiKey(key)
    if (!apiKey) throw new HttpError(401, 'INVALID_API_KEY', 'Invalid or revoked API key.')
    sendJson(res, 200, { ok: true, valid: true, apiKeyId: apiKey.id, customerId: apiKey.customerId, scopes: apiKey.scopes })
    return
  }

  if (req.method === 'POST' && path.startsWith('/api/v1/api-keys/') && path.endsWith('/revoke')) {
    const keyId = decodeURIComponent(path.replace('/api/v1/api-keys/', '').replace('/revoke', ''))
    const apiKey = revokeLocalApiKey(keyId)
    if (!apiKey) throw new HttpError(404, 'NOT_FOUND', 'API key not found.')
    sendJson(res, 200, { ok: true, apiKey })
    return
  }

  if (req.method === 'POST' && path === '/api/v1/usage/events') {
    const apiKey = requireLocalApiKey(req)
    const body = await parseBody(req)
    const product = typeof body.product === 'string' ? body.product.trim() : ''
    const action = typeof body.action === 'string' ? body.action.trim() : ''
    const units = typeof body.units === 'number' ? body.units : Number(body.units || 0)
    if (!product || !action || !Number.isFinite(units) || units <= 0) {
      throw new HttpError(422, 'VALIDATION_ERROR', 'product, action, and positive units are required.')
    }
    const event = recordLocalUsageEvent({
      customerId: apiKey.customerId,
      apiKeyId: apiKey.id,
      product,
      action,
      units,
      metadata: typeof body.metadata === 'object' && body.metadata ? (body.metadata as Record<string, unknown>) : undefined
    })
    sendJson(res, 201, { ok: true, event })
    return
  }

  if (req.method === 'GET' && path === '/api/v1/usage/events') {
    requireLocalApiKey(req)
    const events = listUsageEvents({
      customerId: url.searchParams.get('customerId') || undefined,
      product: url.searchParams.get('product') || undefined,
      action: url.searchParams.get('action') || undefined,
      from: url.searchParams.get('from') || undefined,
      to: url.searchParams.get('to') || undefined
    })
    sendJson(res, 200, { ok: true, events })
    return
  }

  if (req.method === 'GET' && path === '/api/v1/usage/summary') {
    requireLocalApiKey(req)
    const filters = {
      customerId: url.searchParams.get('customerId') || undefined,
      product: url.searchParams.get('product') || undefined,
      action: url.searchParams.get('action') || undefined,
      from: url.searchParams.get('from') || undefined,
      to: url.searchParams.get('to') || undefined
    }
    sendJson(res, 200, {
      ok: true,
      summary: summarizeUsage(filters),
      byCustomer: summarizeUsageByCustomer(filters),
      byProduct: summarizeUsageByProduct(filters),
      byAction: summarizeUsageByAction(filters)
    })
    return
  }

  if (req.method === 'POST' && path === '/api/v1/files') {
    const apiKey = requireLocalApiKey(req)
    const body = await parseBody(req)
    const product = typeof body.product === 'string' ? body.product.trim() : ''
    const filename = typeof body.filename === 'string' ? body.filename.trim() : ''
    const contentType = typeof body.contentType === 'string' ? body.contentType.trim() : 'application/octet-stream'
    const bytesBase64 = typeof body.bytesBase64 === 'string' ? body.bytesBase64 : ''
    if (!product || !filename || !bytesBase64) {
      throw new HttpError(422, 'VALIDATION_ERROR', 'product, filename, and bytesBase64 are required.')
    }
    const file = createAssetRecord({
      customerId: apiKey.customerId,
      product,
      filename,
      contentType,
      metadata: typeof body.metadata === 'object' && body.metadata ? (body.metadata as Record<string, unknown>) : undefined,
      bytesBase64
    })
    sendJson(res, 201, { ok: true, file })
    return
  }

  if (req.method === 'POST' && path === '/api/v1/assets') {
    const apiKey = requireLocalApiKey(req)
    const body = await parseBody(req)
    const product = typeof body.product === 'string' ? body.product.trim() : ''
    const filename = typeof body.filename === 'string' ? body.filename.trim() : ''
    const contentType = typeof body.contentType === 'string' ? body.contentType.trim() : 'application/octet-stream'
    if (!product || !filename) throw new HttpError(422, 'VALIDATION_ERROR', 'product and filename are required.')
    const asset = createAssetRecord({
      customerId: apiKey.customerId,
      product,
      filename,
      contentType,
      publicUrl: typeof body.publicUrl === 'string' ? body.publicUrl : undefined,
      metadata: typeof body.metadata === 'object' && body.metadata ? (body.metadata as Record<string, unknown>) : undefined,
      bytesBase64: typeof body.bytesBase64 === 'string' ? body.bytesBase64 : undefined
    })
    sendJson(res, 201, { ok: true, asset })
    return
  }

  if (req.method === 'GET' && path === '/api/v1/assets') {
    requireLocalApiKey(req)
    sendJson(res, 200, {
      ok: true,
      assets: listAssets({
        customerId: url.searchParams.get('customerId') || undefined,
        product: url.searchParams.get('product') || undefined
      })
    })
    return
  }

  if (path.startsWith('/api/v1/assets/')) {
    requireLocalApiKey(req)
    const assetId = decodeURIComponent(path.replace('/api/v1/assets/', ''))
    if (req.method === 'GET') {
      const asset = getAsset(assetId)
      if (!asset) throw new HttpError(404, 'NOT_FOUND', 'Asset not found.')
      sendJson(res, 200, { ok: true, asset })
      return
    }
    if (req.method === 'DELETE') {
      const asset = deleteAssetRecord(assetId)
      if (!asset) throw new HttpError(404, 'NOT_FOUND', 'Asset not found.')
      sendJson(res, 200, { ok: true, asset })
      return
    }
  }

  if (req.method === 'POST' && path === '/auth/login') {
    const payload = loginSchema.safeParse(await parseBody(req))
    if (!payload.success) throw new HttpError(422, 'VALIDATION_ERROR', 'Invalid login payload.')

    const user = await findUserByEmail(payload.data.email)
    if (!user || !user.password_hash || !verifyPassword(payload.data.password, user.password_hash)) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email/password.')
    }

    const token = createSessionToken()
    await createSession({
      id: makeId('sess'),
      userId: user.id,
      sessionHash: hashValue(token),
      expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
    })

    await touchUserLogin(user.id)
    setSessionCookie(res, token)

    await recordAuditEvent({
      id: makeId('evt'),
      action: 'auth.login',
      targetType: 'user',
      targetId: user.id,
      actorUserId: user.id,
      metadata: { email: user.email }
    })

    sendData(res, 200, toUserResponse(user))
    return
  }

  if (req.method === 'POST' && path === '/auth/logout') {
    const cookies = parseCookies(req)
    if (cookies.sl_session) {
      const hash = hashValue(cookies.sl_session)
      const existingSession = await findSessionByHash(hash)
      await revokeSessionByHash(hash)
      if (existingSession) {
        await recordAuditEvent({
          id: makeId('evt'),
          action: 'auth.logout',
          targetType: 'user',
          targetId: existingSession.user_id,
          actorUserId: existingSession.user_id
        })
      }
    }
    clearSessionCookie(res)
    sendData(res, 200, { ok: true })
    return
  }

  if (req.method === 'GET' && path === '/auth/me') {
    const user = await requireUser(req)
    sendData(res, 200, toUserResponse(user))
    return
  }

  const user = await requireUser(req)

  if (req.method === 'GET' && path === '/regions') {
    const regions = await listRegions()
    sendData(res, 200, regions.map(toRegionResponse))
    return
  }

  if (req.method === 'GET' && path === '/organizations') {
    const organizations = await listOrganizationsByUser(user.id)
    sendData(res, 200, organizations.map(toOrganizationResponse))
    return
  }

  if (req.method === 'POST' && path === '/organizations') {
    requirePermission('owner', 'organization:create')
    const payload = createOrganizationSchema.safeParse(await parseBody(req))
    if (!payload.success) throw new HttpError(422, 'VALIDATION_ERROR', payload.error.issues[0]?.message || 'Invalid payload')

    const created = await createOrganization({
      id: makeId('org'),
      name: payload.data.name.trim(),
      slug: safeSlug(payload.data.slug || payload.data.name)
    })

    await addOrganizationMember({ id: makeId('om'), organizationId: created.id, userId: user.id, role: 'owner' })
    await recordAuditEvent({
      id: makeId('evt'),
      action: 'organization.created',
      targetType: 'organization',
      targetId: created.id,
      organizationId: created.id,
      actorUserId: user.id,
      metadata: { slug: created.slug }
    })
    sendData(res, 201, toOrganizationResponse(created))
    return
  }

  if (req.method === 'GET' && path.startsWith('/organizations/')) {
    const idOrSlug = decodeURIComponent(path.replace('/organizations/', ''))

    if (idOrSlug.endsWith('/operations')) {
      const orgRef = idOrSlug.replace('/operations', '')
      const organization = await findOrganizationByIdOrSlugForUser(orgRef, user.id)
      if (!organization) throw new HttpError(404, 'NOT_FOUND', 'Organization was not found.', { id: orgRef })
      const projects = await listProjectsByOrganizationForUser(organization.id, user.id)
      const rows = await Promise.all(projects.map(async (project) => {
        const latestTask = await findLatestProvisioningTask(project.id)
        const region = latestTask?.region_id ? await findRegionById(latestTask.region_id) : null
        return {
          project: toProjectResponse(project, toOrganizationResponse(organization)),
          provisioning: latestTask ? toProvisioningTaskResponse(latestTask, region ? toRegionResponse(region) : null) : null,
          capabilities: projectCapabilities(await findUserRoleForProject(project.id, user.id))
        }
      }))
      sendData(res, 200, rows)
      return
    }

    if (idOrSlug.endsWith('/projects')) {
      const orgRef = idOrSlug.replace('/projects', '')
      const organization = await findOrganizationByIdOrSlugForUser(orgRef, user.id)
      if (!organization) throw new HttpError(404, 'NOT_FOUND', 'Organization was not found.', { id: orgRef })
      const projects = await listProjectsByOrganizationForUser(organization.id, user.id)
      sendData(res, 200, projects.map((project) => toProjectResponse(project, toOrganizationResponse(organization))))
      return
    }

    if (idOrSlug.endsWith('/events')) {
      const orgRef = idOrSlug.replace('/events', '')
      const organization = await findOrganizationByIdOrSlugForUser(orgRef, user.id)
      if (!organization) throw new HttpError(404, 'NOT_FOUND', 'Organization was not found.', { id: orgRef })
      const events = await listOrganizationEvents(organization.id)
      sendData(res, 200, events.map(toAuditResponse))
      return
    }

    const organization = await findOrganizationByIdOrSlugForUser(idOrSlug, user.id)
    if (!organization) throw new HttpError(404, 'NOT_FOUND', 'Organization was not found.', { id: idOrSlug })
    sendData(res, 200, toOrganizationResponse(organization))
    return
  }

  if (req.method === 'GET' && path === '/projects') {
    const projects = await listProjectsByUser(user.id)
    const organizations = await listOrganizationsByUser(user.id)
    const data = await Promise.all(projects.map(async (project) => {
      const org = organizations.find((entry) => entry.id === project.organization_id) || null
      const role = await findUserRoleForProject(project.id, user.id)
      return { ...toProjectResponse(project, org ? toOrganizationResponse(org) : null), capabilities: projectCapabilities(role) }
    }))
    sendData(res, 200, data)
    return
  }

  if (req.method === 'POST' && path === '/projects') {
    const payload = createProjectSchema.safeParse(await parseBody(req))
    if (!payload.success) throw new HttpError(422, 'VALIDATION_ERROR', payload.error.issues[0]?.message || 'Invalid payload')

    const organization = await findOrganizationByIdOrSlugForUser(payload.data.organizationId, user.id)
    if (!organization) throw new HttpError(404, 'NOT_FOUND', 'Organization was not found.', { id: payload.data.organizationId })

    await enforceOrganizationPermission(organization.id, user.id, 'project:create')

    const created = await createProject({
      id: makeId('prj'),
      organizationId: organization.id,
      name: payload.data.name,
      slug: safeSlug(payload.data.slug || payload.data.name),
      status: payload.data.status,
      region: payload.data.region,
      description: payload.data.description || ''
    })

    await recordAuditEvent({
      id: makeId('evt'),
      action: 'project.created',
      targetType: 'project',
      targetId: created.id,
      organizationId: created.organization_id,
      projectId: created.id,
      actorUserId: user.id,
      metadata: { status: created.status }
    })

    sendData(res, 201, toProjectResponse(created, toOrganizationResponse(organization)))
    return
  }

  if (path.startsWith('/projects/')) {
    const ref = decodeURIComponent(path.replace('/projects/', ''))

    if (req.method === 'POST' && ref.endsWith('/provision')) {
      const projectRef = ref.replace('/provision', '')
      const project = await findProjectByIdOrSlugForUser(projectRef, user.id)
      if (!project) throw new HttpError(404, 'NOT_FOUND', 'Project not found.', { id: projectRef })
      await enforceProjectPermission(project.id, user.id, 'provisioning:request')
      const payload = provisionProjectSchema.safeParse(await parseBody(req))
      if (!payload.success) throw new HttpError(422, 'VALIDATION_ERROR', 'Invalid provision payload')
      const result = await requestProjectProvisioning({ projectRef, user, regionCode: payload.data.regionCode })
      if (!result) throw new HttpError(404, 'NOT_FOUND', 'Project was not found.', { id: projectRef })
      const region = result.task.region_id ? await findRegionById(result.task.region_id) : null
      sendData(res, 202, toProvisioningTaskResponse(result.task, region ? toRegionResponse(region) : null))
      return
    }

    if (req.method === 'POST' && ref.endsWith('/provisioning/retry')) {
      const projectRef = ref.replace('/provisioning/retry', '')
      const project = await findProjectByIdOrSlugForUser(projectRef, user.id)
      if (!project) throw new HttpError(404, 'NOT_FOUND', 'Project not found.', { id: projectRef })
      await enforceProjectPermission(project.id, user.id, 'provisioning:retry')
      const result = await retryLatestProvisioning(projectRef, user)
      if (!result || !result.task) throw new HttpError(404, 'NOT_FOUND', 'No task to retry.', { id: projectRef })
      const region = result.task.region_id ? await findRegionById(result.task.region_id) : null
      sendData(res, 200, toProvisioningTaskResponse(result.task, region ? toRegionResponse(region) : null))
      return
    }

    if (req.method === 'GET' && ref.endsWith('/provisioning')) {
      const projectRef = ref.replace('/provisioning', '')
      const project = await findProjectByIdOrSlugForUser(projectRef, user.id)
      if (!project) throw new HttpError(404, 'NOT_FOUND', 'Project not found.', { id: projectRef })
      const snapshot = await getProjectProvisioningSnapshot(project.id)
      const role = await findUserRoleForProject(project.id, user.id)
      if (!snapshot) return sendData(res, 200, { task: null, attempts: [], runtimeBinding: null, capabilities: projectCapabilities(role) })
      const runtimeBinding = await findRuntimeBindingByProject(project.id)
      sendData(res, 200, {
        task: toProvisioningTaskResponse(snapshot.task, snapshot.region ? toRegionResponse(snapshot.region) : null),
        attempts: snapshot.attempts.map(toProvisioningAttemptResponse),
        runtimeBinding: runtimeBinding ? toRuntimeBindingResponse(runtimeBinding) : null,
        capabilities: projectCapabilities(role)
      })
      return
    }

    if (req.method === 'GET' && ref.endsWith('/provisioning/tasks')) {
      const projectRef = ref.replace('/provisioning/tasks', '')
      const project = await findProjectByIdOrSlugForUser(projectRef, user.id)
      if (!project) throw new HttpError(404, 'NOT_FOUND', 'Project not found.', { id: projectRef })
      const tasks = await listProvisioningTasks(project.id)
      const data = await Promise.all(tasks.map(async (task) => {
        const region = task.region_id ? await findRegionById(task.region_id) : null
        return toProvisioningTaskResponse(task, region ? toRegionResponse(region) : null)
      }))
      sendData(res, 200, data)
      return
    }

    if (req.method === 'GET' && ref.endsWith('/events')) {
      const projectRef = ref.replace('/events', '')
      const project = await findProjectByIdOrSlugForUser(projectRef, user.id)
      if (!project) throw new HttpError(404, 'NOT_FOUND', 'Project not found.', { id: projectRef })
      const events = await listProjectEvents(project.id)
      sendData(res, 200, events.map(toAuditResponse))
      return
    }

    if (req.method === 'GET' && ref.endsWith('/environments')) {
      const projectRef = ref.replace('/environments', '')
      const project = await findProjectByIdOrSlugForUser(projectRef, user.id)
      if (!project) throw new HttpError(404, 'NOT_FOUND', 'Project not found.', { id: projectRef })
      const environments = await listProjectEnvironments(project.id)
      sendData(res, 200, environments.map(toEnvironmentResponse))
      return
    }

    if (req.method === 'POST' && ref.endsWith('/environments')) {
      const projectRef = ref.replace('/environments', '')
      const project = await findProjectByIdOrSlugForUser(projectRef, user.id)
      if (!project) throw new HttpError(404, 'NOT_FOUND', 'Project not found.', { id: projectRef })
      await enforceProjectPermission(project.id, user.id, 'environment:create')
      const payload = createEnvironmentSchema.safeParse(await parseBody(req))
      if (!payload.success) throw new HttpError(422, 'VALIDATION_ERROR', payload.error.issues[0]?.message || 'Invalid payload')
      const environment = await createProjectEnvironment({
        id: makeId('env'),
        projectId: project.id,
        name: payload.data.name,
        slug: safeSlug(payload.data.slug || payload.data.name),
        status: payload.data.status,
        region: payload.data.region,
        deploymentTarget: payload.data.deploymentTarget
      })
      await recordAuditEvent({
        id: makeId('evt'),
        action: 'environment.created',
        targetType: 'environment',
        targetId: environment.id,
        organizationId: project.organization_id,
        projectId: project.id,
        actorUserId: user.id,
        metadata: { slug: environment.slug, region: environment.region }
      })
      sendData(res, 201, toEnvironmentResponse(environment))
      return
    }

    if (req.method === 'PATCH' && ref.includes('/environments/')) {
      const [projectRef, envId] = ref.split('/environments/')
      const project = await findProjectByIdOrSlugForUser(projectRef, user.id)
      if (!project) throw new HttpError(404, 'NOT_FOUND', 'Project not found.', { id: projectRef })
      await enforceProjectPermission(project.id, user.id, 'environment:update')
      const payload = updateEnvironmentSchema.safeParse(await parseBody(req))
      if (!payload.success) throw new HttpError(422, 'VALIDATION_ERROR', payload.error.issues[0]?.message || 'Invalid payload')
      const updated = await updateEnvironment(envId, project.id, payload.data)
      if (!updated) throw new HttpError(404, 'NOT_FOUND', 'Environment not found.', { id: envId })
      await recordAuditEvent({
        id: makeId('evt'),
        action: 'environment.updated',
        targetType: 'environment',
        targetId: updated.id,
        organizationId: project.organization_id,
        projectId: project.id,
        actorUserId: user.id,
        metadata: payload.data
      })
      sendData(res, 200, toEnvironmentResponse(updated))
      return
    }

    if (req.method === 'GET' && ref.endsWith('/api-keys')) {
      const projectRef = ref.replace('/api-keys', '')
      const project = await findProjectByIdOrSlugForUser(projectRef, user.id)
      if (!project) throw new HttpError(404, 'NOT_FOUND', 'Project not found.', { id: projectRef })
      const keys = await listProjectApiKeys(project.id)
      sendData(res, 200, keys.map(toApiKeyResponse))
      return
    }

    if (req.method === 'POST' && ref.endsWith('/api-keys')) {
      const projectRef = ref.replace('/api-keys', '')
      const project = await findProjectByIdOrSlugForUser(projectRef, user.id)
      if (!project) throw new HttpError(404, 'NOT_FOUND', 'Project not found.', { id: projectRef })
      await enforceProjectPermission(project.id, user.id, 'apikey:create')
      const payload = createApiKeySchema.safeParse(await parseBody(req))
      if (!payload.success) throw new HttpError(422, 'VALIDATION_ERROR', payload.error.issues[0]?.message || 'Invalid payload')
      const prefix = `sk_live_${Math.random().toString(36).slice(2, 8)}`
      const secret = createApiSecret(prefix)
      const created = await createApiKey({ id: makeId('key'), projectId: project.id, organizationId: project.organization_id, name: payload.data.name, keyPrefix: prefix, keyHash: hashValue(secret) })
      await recordAuditEvent({
        id: makeId('evt'), action: 'api_key.created', targetType: 'api_key', targetId: created.id,
        organizationId: project.organization_id, projectId: project.id, actorUserId: user.id, metadata: { prefix }
      })
      sendData(res, 201, { key: toApiKeyResponse(created), secret })
      return
    }

    if (req.method === 'POST' && ref.includes('/api-keys/') && ref.endsWith('/revoke')) {
      const [projectRef, keyRef] = ref.split('/api-keys/')
      const keyId = keyRef.replace('/revoke', '')
      const project = await findProjectByIdOrSlugForUser(projectRef, user.id)
      if (!project) throw new HttpError(404, 'NOT_FOUND', 'Project not found.', { id: projectRef })
      await enforceProjectPermission(project.id, user.id, 'apikey:revoke')
      const key = await findProjectApiKey(project.id, keyId)
      if (!key) throw new HttpError(404, 'NOT_FOUND', 'API key not found.', { id: keyId })
      const revoked = await revokeApiKey(key.id, project.id)
      if (!revoked) throw new HttpError(404, 'NOT_FOUND', 'API key not found.', { id: keyId })
      await recordAuditEvent({ id: makeId('evt'), action: 'api_key.revoked', targetType: 'api_key', targetId: revoked.id, organizationId: project.organization_id, projectId: project.id, actorUserId: user.id, metadata: { prefix: revoked.key_prefix } })
      sendData(res, 200, toApiKeyResponse(revoked))
      return
    }

    if (req.method === 'GET') {
      const project = await findProjectByIdOrSlugForUser(ref, user.id)
      if (!project) throw new HttpError(404, 'NOT_FOUND', 'Project not found.', { id: ref })
      const organizations = await listOrganizationsByUser(user.id)
      const organization = organizations.find((entry) => entry.id === project.organization_id) || null
      const environments = await listProjectEnvironments(project.id)
      const role = await findUserRoleForProject(project.id, user.id)
      sendData(res, 200, {
        ...toProjectResponse(project, organization ? toOrganizationResponse(organization) : null),
        environments: environments.map(toEnvironmentResponse),
        capabilities: projectCapabilities(role)
      })
      return
    }

    if (req.method === 'PATCH') {
      const project = await findProjectByIdOrSlugForUser(ref, user.id)
      if (!project) throw new HttpError(404, 'NOT_FOUND', 'Project not found.', { id: ref })
      await enforceProjectPermission(project.id, user.id, 'project:update')
      const payload = updateProjectSchema.safeParse(await parseBody(req))
      if (!payload.success) throw new HttpError(422, 'VALIDATION_ERROR', payload.error.issues[0]?.message || 'Invalid payload')
      const updated = await updateProject(project.id, payload.data)
      if (!updated) throw new HttpError(404, 'NOT_FOUND', 'Project not found.', { id: ref })
      const organizations = await listOrganizationsByUser(user.id)
      const organization = organizations.find((entry) => entry.id === updated.organization_id) || null
      await recordAuditEvent({ id: makeId('evt'), action: 'project.updated', targetType: 'project', targetId: updated.id, organizationId: updated.organization_id, projectId: updated.id, actorUserId: user.id, metadata: payload.data })
      sendData(res, 200, toProjectResponse(updated, organization ? toOrganizationResponse(organization) : null))
      return
    }
  }

  throw new HttpError(404, 'NOT_FOUND', 'Route not found.', { method: req.method, path })
}

export function createApiServer() {
  return createServer(async (req, res) => {
    try {
      await handler(req, res)
    } catch (error) {
      if (error instanceof HttpError) return sendError(res, error)
      if ((error as { code?: string }).code === '23505') return sendError(res, new HttpError(409, 'DUPLICATE_RESOURCE', 'A uniqueness constraint was violated.'))
      console.error(error)
      sendError(res, new HttpError(500, 'INTERNAL_ERROR', 'Unexpected server error.'))
    }
  })
}

const server = createApiServer()

export async function startServer(options?: { skipBootstrap?: boolean; port?: number; startWorker?: boolean }) {
  const port = options?.port ?? config.port
  const skipBootstrap = options?.skipBootstrap ?? process.env.STACKLANE_SKIP_BOOTSTRAP === '1'
  const startWorker = options?.startWorker ?? process.env.STACKLANE_SKIP_WORKER !== '1'
  if (!skipBootstrap) {
    await db.query('SELECT 1')
    await ensureBootstrapData()
  }

  let interval: NodeJS.Timeout | undefined
  if (startWorker) {
    interval = setInterval(() => {
      runProvisioningWorkerTick(adapter, workerId).catch((error) => {
        console.error('Provisioning worker tick failed', error)
      })
    }, WORKER_INTERVAL_MS)
  }

  await new Promise<void>((resolve) => {
    server.listen(port, () => resolve())
  })

  return {
    server,
    port,
    close: async () => {
      if (interval) clearInterval(interval)
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error)
          else resolve()
        })
      })
    }
  }
}

async function start() {
  const started = await startServer()
  console.log(`Stacklane API running on http://localhost:${started.port}`)
}

if (require.main === module) {
  start().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
