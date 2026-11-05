import OpenAI from 'openai';
import { TOOLS, handle_tool_calls } from './tools';

export type Msg = { by: 'human' | 'ai'; content: string };
export type ToolCall = { name: string; args: string; result: string };

export const system_message =
  'You are a helpful cinema assistant. Use the provided tools to answer questions about movies, ticket prices, and showtimes. If you are not sure of the exact title, call search_movies first, then use the exact title from its result for get_ticket_price or get_showtimes. Always answer in plain text after using tools.';

export const DEFAULT_SYSTEM = system_message;

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

export let lastToolCalls: ToolCall[] = [];
export let lastMessages: object[] = [];

export function buildMessages(history: Msg[], message: string, system: string) {
  return [
    { role: 'system', content: system },
    ...history.map((m) => ({ role: m.by === 'human' ? 'user' : 'assistant', content: m.content })),
    { role: 'user', content: message },
  ];
}

export async function chat(history: Msg[], message: string, system: string): Promise<{ text: string; messages: any[] }> {
  // API client
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  // Start with system + history + new message
  const messages: any[] = buildMessages(history, message, system) as any[];
  // Reset log for this turn
  lastToolCalls = [];

  // First ask, tools allowed
  let response: any = await client.chat.completions.create({ model: MODEL, messages, tools: TOOLS as any });

  // Loop while model wants tools
  while (response.choices[0].finish_reason === 'tool_calls') {
    // Model's tool request
    const assistantMsg = response.choices[0].message;
    // Keep request in history
    messages.push(assistantMsg);

    // Run tools
    const toolResponses = handle_tool_calls(assistantMsg);
    // Log each call
    for (const toolCall of assistantMsg.tool_calls ?? []) {
      // Match reply to call
      const match = toolResponses.find((r: any) => r.tool_call_id === toolCall.id);
      lastToolCalls.push({
        name: toolCall.function?.name ?? 'unknown',
        args: toolCall.function?.arguments ?? '{}',
        result: String(match?.content ?? ''),
      });
    }
    // Add tool results
    messages.push(...toolResponses);

    // Ask again with results
    response = await client.chat.completions.create({ model: MODEL, messages, tools: TOOLS as any });
  }

  // Final text answer
  const text = response.choices[0].message.content ?? '';
  // Keep answer in history
  messages.push({ role: 'assistant', content: text });
  // Save full trace for Inspector
  lastMessages = [...messages];
  // Return answer + trace
  return { text, messages };
}

export async function* answer(history: Msg[], message: string, system: string): AsyncGenerator<string> {
  if (!process.env.OPENAI_API_KEY) {
    lastToolCalls = [];
    lastMessages = buildMessages(history, message, system) as object[];
    yield* demoReply();
    return;
  }
  try {
    const { text } = await chat(history, message, system);
    const finalText = text || (lastToolCalls.length > 0 ? lastToolCalls[lastToolCalls.length - 1].result : 'Sorry, I could not get an answer.');
    for (const word of finalText.split(' ')) {
      await new Promise((r) => setTimeout(r, 20));
      yield word + ' ';
    }
  } catch (err) {
    const errText = `AI error: ${err instanceof Error ? err.message : 'request failed'}`;
    lastMessages = [...lastMessages, { role: 'assistant', content: errText }];
    yield errText;
  }
}

async function* demoReply(): AsyncGenerator<string> {
  const text =
    'Demo mode — no `OPENAI_API_KEY` set, so this is canned text. Copy `.env.example` to `.env`, set the key, and restart for real answers.';
  for (const word of text.split(' ')) {
    await new Promise((r) => setTimeout(r, 30));
    yield word + ' ';
  }
}
