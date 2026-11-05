import { run } from '@backroad/backroad';
import 'dotenv/config';
import { DEFAULT_SYSTEM, answer, buildMessages, lastMessages, type Msg } from './ai';
import { Inspector } from './inspector';
import { MOVIES } from './movies';

run(
  async (br) => {
    let history = br.getOrDefault<Msg[]>('history', []);
    let payload = br.getOrDefault<object[]>('payload', []);

    const [chat, side] = br.columns({ columns: [2, 1] });

    chat.title({ label: 'Movie ticket assistant' });
    chat.write({ body: 'Ask for ticket prices or showtimes.' });

    const settings = chat.collapse({ label: 'Settings & Movies' });
    const system = settings.textArea({ id: 'system', label: 'System prompt', defaultValue: DEFAULT_SYSTEM, rows: 4 }) || DEFAULT_SYSTEM;
    settings.write({ body: '**Movies**' });
    settings.table({
      data: MOVIES.map((m) => ({ ...m, showtimes: m.showtimes.join(', ') })),
      columns: { title: { header: 'Movie' }, price: { header: 'Price' }, format: { header: 'Format' }, showtimes: { header: 'Showtimes' } },
    });

    for (const m of history) chat.chatMessage({ by: m.by }).write({ body: m.content });

    if (chat.button({ id: 'clear', label: 'Clear chat' })) {
      history = [];
      payload = [];
      br.setValue('history', history);
      br.setValue('payload', payload);
    }
    if (!process.env.OPENAI_API_KEY) chat.write({ body: '_Demo mode: set `OPENAI_API_KEY` for real answers._' });

    const next = chat.chatInput({ id: 'chat', placeholder: 'How much is a ticket for Dune?…' });
    if (next) {
      const req = buildMessages(history, next, system);
      br.setValue('payload', req);
      chat.chatMessage({ by: 'human' }).write({ body: next });
      const text = await chat.chatMessage({ by: 'ai' }).writeStream(answer(history, next, system));
      //payload = messy full LLM log with tool calls
      payload = lastMessages.length > 0 ? [...lastMessages] : [...req, { role: 'assistant', content: text }];
      //history = clean UI chat
      history = [...history, { by: 'human', content: next }, { by: 'ai', content: text }];
      br.setValue('payload', payload);
      br.setValue('history', history);
    }

    Inspector(side, history, payload, system);
  },
  { server: { port: 3335 } },
);
