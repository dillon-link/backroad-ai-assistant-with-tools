import { type Msg } from './ai';

type ToolEntry = { name: string; args: string; result: string };

function toolEntriesFromPayload(payload: object[]): ToolEntry[] {
  const entries: ToolEntry[] = [];
  const byId = new Map<string, string>();
  for (const item of payload as any[]) {
    if (item?.role === 'tool' && item?.tool_call_id) {
      byId.set(item.tool_call_id, String(item.content ?? ''));
    }
  }
  for (const item of payload as any[]) {
    if (Array.isArray(item?.tool_calls)) {
      for (const tc of item.tool_calls) {
        const name = tc?.function?.name ?? 'unknown';
        const args = tc?.function?.arguments ?? '{}';
        const result = (tc?.id && byId.get(tc.id)) ?? '(no result)';
        entries.push({ name, args, result });
      }
    }
  }
  return entries;
}

export function Inspector(sb: any, history: Msg[], payload: object[], system: string) {
  sb.write({ body: `**Inspector** · ${history.length} messages` });

  const calls = toolEntriesFromPayload(payload);
  sb.collapse({ label: `Tool calls · ${calls.length}` }).write({
    body: calls.length > 0 ? calls.map((c) => `${c.name} ${c.args} → ${c.result}`).join('\n') : 'none — model answered without calling a tool',
  });

  sb.collapse({ label: '0. system (base)' }).write({ body: system });

  for (let i = 0; i < history.length; i++) {
    const m = history[i];
    const box = sb.collapse({ label: `${i + 1}. ${m.by} · ${m.content.length} chars` });
    box.write({ body: m.content });
  }

  if (payload.length > 0) {
    const box = sb.collapse({ label: `LLM payload · ${payload.length} (item 0 = system)` });
    payload.forEach((item: any, i: number) => {
      const role = item?.role ?? '?';
      if (role === 'assistant' && Array.isArray(item?.tool_calls)) {
        box.collapse({ label: `${i}. assistant · ${item.tool_calls.length} tool call(s)` }).json({ src: item, id: `llm-payload-${i}` });
      } else if (role === 'tool') {
        const preview = String(item?.content ?? '').slice(0, 80);
        box.collapse({ label: `${i}. tool → ${preview}` }).json({ src: item, id: `llm-payload-${i}` });
      } else {
        const preview = String(item?.content ?? '').slice(0, 80);
        box.collapse({ label: `${i}. ${role} · ${preview}` }).json({ src: item, id: `llm-payload-${i}` });
      }
    });
  }
}
