import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateTalocodeApiKey } from '../../services/cloud-billing';

const workflowSchema = z.object({
  name: z.string().min(1),
  nodes: z.array(z.object({
    id: z.string(),
    type: z.enum(['input', 'prompt', 'transform', 'condition', 'output', 'api', 'skill']),
    label: z.string().optional(),
    config: z.record(z.string(), z.unknown()).optional(),
    x: z.number().optional(),
    y: z.number().optional(),
  })),
  edges: z.array(z.object({
    from: z.string(),
    to: z.string(),
  })),
});

const generateSchema = z.object({
  workflow: workflowSchema,
  format: z.enum(['claude', 'cursor', 'codra']).optional(),
});

async function requireAuth(request: any) {
  const auth = request.headers.authorization;
  const apiKey = request.headers['x-api-key'];
  const rawKey = auth?.replace('Bearer ', '') || apiKey;
  if (!rawKey) {
    throw { statusCode: 401, code: 'MISSING_API_KEY', message: 'Missing API key. Provide Authorization: Bearer <key> or X-Api-Key header.' };
  }
  return authenticateTalocodeApiKey(rawKey);
}

export async function flowlaneRoutes(app: FastifyInstance) {
  // Create workflow
  app.post('/v1/flowlane/workflows', async (request, reply) => {
    try {
      await requireAuth(request);
    } catch (err: any) {
      return reply.status(err.statusCode || 401).send({ error: { code: err.code || 'UNAUTHORIZED', message: err.message } });
    }

    const parsed = workflowSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message } });
    }

    const workflow = {
      id: crypto.randomUUID(),
      ...parsed.data,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    return reply.status(201).send({ ok: true, workflow });
  });

  // Generate SKILL.md from workflow
  app.post('/v1/flowlane/generate', async (request, reply) => {
    try {
      await requireAuth(request);
    } catch (err: any) {
      return reply.status(err.statusCode || 401).send({ error: { code: err.code || 'UNAUTHORIZED', message: err.message } });
    }

    const parsed = generateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message } });
    }

    const { workflow, format } = parsed.data;
    const skill = generateSkill(workflow, format);

    return reply.send({ ok: true, skill, format: format || 'claude' });
  });

  // Validate workflow
  app.post('/v1/flowlane/validate', async (request, reply) => {
    try {
      await requireAuth(request);
    } catch (err: any) {
      return reply.status(err.statusCode || 401).send({ error: { code: err.code || 'UNAUTHORIZED', message: err.message } });
    }

    const parsed = workflowSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message } });
    }

    const validation = validateWorkflow(parsed.data);
    return reply.send({ ok: true, ...validation });
  });

  // Get workflow templates (public)
  app.get('/v1/flowlane/templates', async (request, reply) => {
    const templates = getTemplates();
    return reply.send({ ok: true, templates });
  });

  // Health check (public)
  app.get('/v1/flowlane/health', async (request, reply) => {
    return reply.send({ ok: true, product: 'flowlane', version: '0.1.0' });
  });
}

function generateSkill(workflow: any, format?: string): string {
  const lines = [
    '---',
    `name: ${workflow.name}`,
    `description: Auto-generated from FlowLane visual builder`,
    'steps:',
  ];

  workflow.nodes.forEach((node: any, i: number) => {
    const label = node.label || node.type;
    lines.push(`  - ${node.type}: ${label}`);
  });

  lines.push('---');
  lines.push('');
  lines.push(`# ${workflow.name}`);
  lines.push('');

  workflow.nodes.forEach((node: any, i: number) => {
    lines.push(`## Step ${i + 1}: ${node.label || node.type}`);
    lines.push('');
    lines.push(`- Type: ${node.type}`);
    if (node.config) {
      Object.entries(node.config).forEach(([k, v]) => {
        lines.push(`- ${k}: ${v}`);
      });
    }
    lines.push('');
  });

  return lines.join('\n');
}

function validateWorkflow(workflow: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (workflow.nodes.length === 0) {
    errors.push('Workflow has no nodes');
  }

  const nodeIds = new Set(workflow.nodes.map((n: any) => n.id));
  workflow.edges.forEach((edge: any) => {
    if (!nodeIds.has(edge.from)) errors.push(`Edge references missing node: ${edge.from}`);
    if (!nodeIds.has(edge.to)) errors.push(`Edge references missing node: ${edge.to}`);
  });

  const hasInput = workflow.nodes.some((n: any) => n.type === 'input');
  const hasOutput = workflow.nodes.some((n: any) => n.type === 'output');
  if (!hasInput) errors.push('Workflow has no input node');
  if (!hasOutput) errors.push('Workflow has no output node');

  return { valid: errors.length === 0, errors };
}

function getTemplates() {
  return [
    {
      id: 'chatbot',
      name: 'Chatbot',
      description: 'Basic chatbot with input → prompt → output',
      nodes: [
        { id: 'input', type: 'input', label: 'User Input', x: 100, y: 200 },
        { id: 'prompt', type: 'prompt', label: 'AI Prompt', x: 300, y: 200 },
        { id: 'output', type: 'output', label: 'Response', x: 500, y: 200 },
      ],
      edges: [{ from: 'input', to: 'prompt' }, { from: 'prompt', to: 'output' }],
    },
    {
      id: 'data-pipeline',
      name: 'Data Pipeline',
      description: 'Transform data through multiple steps',
      nodes: [
        { id: 'input', type: 'input', label: 'Data Input', x: 100, y: 200 },
        { id: 'transform1', type: 'transform', label: 'Clean', x: 300, y: 200 },
        { id: 'transform2', type: 'transform', label: 'Enrich', x: 500, y: 200 },
        { id: 'output', type: 'output', label: 'Export', x: 700, y: 200 },
      ],
      edges: [
        { from: 'input', to: 'transform1' },
        { from: 'transform1', to: 'transform2' },
        { from: 'transform2', to: 'output' },
      ],
    },
  ];
}
