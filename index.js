import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

const app = express();
const PORT = Number(process.env.PORT || 3000);
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Demo-only in-memory storage. Tasks reset when the Render instance restarts.
const tasks = [];

function createMcpServer() {
  const server = new McpServer({ name: 'smart-task-weather-buddy', version: '1.1.0' });

  server.tool('get_weather', 'Get the demo weather information for a city. This is sample data, not a live weather feed.', {
    city: z.string().min(1).describe('City to look up')
  }, async ({ city }) => {
    const normalized = city.trim().toLowerCase();
    let result;
    if (normalized.includes('mumbai')) result = { city: 'Mumbai', temp: '30°C', status: 'Humid & Sunny', data_type: 'demo' };
    else if (normalized.includes('delhi')) result = { city: 'Delhi', temp: '18°C', status: 'Foggy', data_type: 'demo' };
    else result = { city: city.trim(), temp: '22°C', status: 'Clear Sky', data_type: 'demo' };
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('add_task', 'Add a task to the current in-memory task list. The list is temporary and resets when the server restarts.', {
    task: z.string().trim().min(1).max(500).describe('Task to add')
  }, async ({ task }) => {
    const item = { id: randomUUID(), task, created_at: new Date().toISOString(), completed: false };
    tasks.push(item);
    return { content: [{ type: 'text', text: JSON.stringify({ message: 'Task added successfully', task: item, total_tasks: tasks.length }, null, 2) }] };
  });

  server.tool('list_tasks', 'List tasks currently stored in the in-memory task list.', {}, async () => ({
    content: [{ type: 'text', text: JSON.stringify({ total_tasks: tasks.length, tasks }, null, 2) }]
  }));

  return server;
}

// MCP Streamable HTTP endpoint. Stateless mode makes requests compatible with hosted services.
app.post('/mcp', async (req, res) => {
  try {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    const server = createMcpServer();
    res.on('close', () => { transport.close(); server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP POST error:', error);
    if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal MCP server error' }, id: null });
  }
});
app.get('/mcp', (_req, res) => res.status(405).set('Allow', 'POST, DELETE').json({ error: 'Use POST for stateless MCP requests.' }));
app.delete('/mcp', (_req, res) => res.status(405).json({ error: 'Stateless MCP sessions are not supported.' }));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'smart-task-weather-buddy', mcp_endpoint: '/mcp' }));

// Keep REST endpoints available for existing integrations.
app.get('/api/weather', (req, res) => {
  const city = String(req.query.city || '').trim();
  if (!city) return res.status(400).json({ error: 'Query parameter city is required' });
  const normalized = city.toLowerCase();
  if (normalized.includes('mumbai')) return res.json({ city: 'Mumbai', temp: '30°C', status: 'Humid & Sunny', data_type: 'demo' });
  if (normalized.includes('delhi')) return res.json({ city: 'Delhi', temp: '18°C', status: 'Foggy', data_type: 'demo' });
  return res.json({ city, temp: '22°C', status: 'Clear Sky', data_type: 'demo' });
});
app.post('/api/tasks', (req, res) => {
  const task = typeof req.body?.task === 'string' ? req.body.task.trim() : '';
  if (!task) return res.status(400).json({ error: 'Task content is required' });
  if (task.length > 500) return res.status(400).json({ error: 'Task must be 500 characters or fewer' });
  const item = { id: randomUUID(), task, created_at: new Date().toISOString(), completed: false };
  tasks.push(item);
  return res.status(201).json({ message: 'Task added successfully', task: item, total_tasks: tasks.length });
});
app.get('/api/tasks', (_req, res) => res.json({ total_tasks: tasks.length, list: tasks }));

app.get('/openapi.json', (req, res) => res.json({
  openapi: '3.1.0',
  info: { title: 'Smart Task & Weather Buddy API', version: '1.1.0', description: 'Demo weather and in-memory task management API.' },
  servers: [{ url: `https://${req.get('host')}` }],
  paths: {
    '/health': { get: { operationId: 'healthCheck', summary: 'Check service health', responses: { '200': { description: 'Service status' } } } },
    '/api/weather': { get: { operationId: 'getWeatherRest', summary: 'Get demo weather for a city', parameters: [{ name: 'city', in: 'query', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Demo weather' } } } },
    '/api/tasks': {
      get: { operationId: 'listTasksRest', summary: 'List tasks', responses: { '200': { description: 'Task list' } } },
      post: { operationId: 'addTaskRest', summary: 'Add a task', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['task'], properties: { task: { type: 'string', maxLength: 500 } } } } } }, responses: { '201': { description: 'Task added' }, '400': { description: 'Invalid input' } } }
    }
  }
}));

app.listen(PORT, '0.0.0.0', () => console.log(`Smart Task & Weather Buddy listening on port ${PORT}`));
