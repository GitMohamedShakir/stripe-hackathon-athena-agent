type JsonRpcResponse = {
  id?: number;
  result?: Record<string, unknown>;
  error?: { message?: string };
};

type ToolDefinition = {
  name: string;
  inputSchema?: {
    properties?: Record<string, { type?: string }>;
    required?: string[];
  };
};

function parseMcpPayload(raw: string): JsonRpcResponse {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith('{')) return JSON.parse(trimmed) as JsonRpcResponse;

  const events = trimmed
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter((line) => line && line !== '[DONE]');
  if (!events.length) throw new Error('Athena returned an unreadable response.');
  return JSON.parse(events.at(-1)!) as JsonRpcResponse;
}

function createArguments(tool: ToolDefinition, message: string) {
  const properties = tool.inputSchema?.properties ?? {};
  const required = tool.inputSchema?.required ?? [];
  const preferredKeys = ['message', 'query', 'prompt', 'input', 'question', 'text'];
  const targetKey = preferredKeys.find((key) => key in properties) ?? required[0] ?? Object.keys(properties)[0];
  if (!targetKey) return { message };

  const args: Record<string, unknown> = { [targetKey]: message };
  for (const key of required) {
    if (key === targetKey || key in args) continue;
    const type = properties[key]?.type;
    args[key] = type === 'array' ? [] : type === 'object' ? {} : type === 'number' ? 0 : type === 'boolean' ? false : '';
  }
  return args;
}

function extractText(result: Record<string, unknown> | undefined) {
  const content = result?.content;
  if (Array.isArray(content)) {
    const text = content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'text' in item && typeof item.text === 'string') return item.text;
        return '';
      })
      .filter(Boolean)
      .join('\n\n');
    if (text) return text;
  }

  for (const key of ['answer', 'text', 'message', 'output', 'response']) {
    const value = result?.[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return result ? JSON.stringify(result, null, 2) : '';
}

function extractWidget(result: Record<string, unknown> | undefined) {
  const structured = result?.structuredContent;
  if (!structured || typeof structured !== 'object') return undefined;
  const rawResult = (structured as Record<string, unknown>).rawResult;
  if (!rawResult || typeof rawResult !== 'object') return undefined;
  const widget = (rawResult as Record<string, unknown>).widget;
  if (!widget || typeof widget !== 'object') return undefined;

  const record = widget as Record<string, unknown>;
  if (typeof record.html !== 'string' || !record.html.trim()) return undefined;
  return {
    html: record.html,
    toolOutput: record.toolOutput ?? null,
    outputTemplate:
      typeof record.outputTemplate === 'string' ? record.outputTemplate : undefined,
  };
}

export async function POST(request: Request) {
  try {
    const { message } = (await request.json()) as { message?: string };
    if (!message?.trim()) {
      return Response.json({ error: 'Please enter a weather question.' }, { status: 400 });
    }

    const endpoint = process.env.ATHENA_ATHENA_AGENT_MCP_URL;
    const apiKey = process.env.ATHENA_ATHENA_AGENT_API_KEY;
    if (!endpoint || !apiKey) {
      return Response.json({ error: 'Athena is not configured for this deployment.' }, { status: 503 });
    }

    let requestId = 1;
    let sessionId = '';
    const call = async (method: string, params?: Record<string, unknown>, notification = false) => {
      const body: Record<string, unknown> = { jsonrpc: '2.0', method };
      if (!notification) body.id = requestId++;
      if (params) body.params = params;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'x-api-key': apiKey,
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          ...(sessionId ? { 'mcp-session-id': sessionId } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`Athena request failed (${response.status}).`);
      sessionId = response.headers.get('mcp-session-id') ?? sessionId;
      return parseMcpPayload(await response.text());
    };

    const initialized = await call('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'weatherwise-web', version: '1.0.0' },
    });
    if (initialized.error) throw new Error(initialized.error.message || 'Athena initialization failed.');
    await call('notifications/initialized', undefined, true);

    const toolsResponse = await call('tools/list');
    if (toolsResponse.error) throw new Error(toolsResponse.error.message || 'Could not read Athena tools.');
    const tools = (toolsResponse.result?.tools ?? []) as ToolDefinition[];
    const tool = tools.find((candidate) => /weather|forecast|agent|chat|ask/i.test(candidate.name)) ?? tools[0];
    if (!tool) throw new Error('The Athena agent did not expose a callable tool.');

    const answerResponse = await call('tools/call', {
      name: tool.name,
      arguments: createArguments(tool, message.trim()),
    });
    if (answerResponse.error) throw new Error(answerResponse.error.message || 'Athena could not answer the question.');

    const answer = extractText(answerResponse.result);
    if (!answer) throw new Error('Athena returned an empty forecast.');
    return Response.json({ answer, widget: extractWidget(answerResponse.result) });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'The forecast service is unavailable.';
    console.error('Athena MCP error:', message);
    return Response.json({ error: message }, { status: 502 });
  }
}
