import { run } from '@backroad/backroad';
import 'dotenv/config';
import { DEFAULT_SYSTEM, answer, buildMessages, lastMessages, type Msg } from './ai';
import { generatePosterImage, lastImageError, lastResolvedMovieTitle, titleFromAnswer } from './images';
import { Inspector } from './inspector';
import { MOVIES } from './movies';

run(
  async (br) => {
    let history = br.getOrDefault<Msg[]>('history', []);
    let payload = br.getOrDefault<object[]>('payload', []);
    let lastImage = br.getOrDefault<string | null>('lastImage', null);
    let lastImageTitle = br.getOrDefault<string | null>('lastImageTitle', null);
    let lastImageErrorMsg = br.getOrDefault<string | null>('lastImageError', null);

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

    if (!process.env.OPENAI_API_KEY) chat.write({ body: '_Demo mode: set `OPENAI_API_KEY` for real answers._' });

    const showDoodle = () => {
      if (lastImage && lastImageTitle) {
        chat.write({ body: `**${lastImageTitle}** — enjoy the show! 🍿` });
        chat.image({
          src: lastImage,
          alt: 'Fun generic cinema doodle',
          width: 256,
          style: { display: 'block', marginLeft: 'auto', marginRight: 'auto' },
        });
      } else if (lastImageTitle) {
        if (!process.env.OPENAI_API_KEY) {
          chat.write({ body: `_No doodle for **${lastImageTitle}** (demo mode: set \`OPENAI_API_KEY\` for images)._` });
        } else if (lastImageErrorMsg) {
          chat.write({ body: `_Doodle failed for **${lastImageTitle}**: ${lastImageErrorMsg}_` });
        } else {
          chat.write({ body: `_No doodle for **${lastImageTitle}**._` });
        }
      }
    };

    const pending = br.getOrDefault<string | null>('chat', null);
    if (pending) {
      const req = buildMessages(history, pending, system);
      br.setValue('payload', req);
      chat.chatMessage({ by: 'human' }).write({ body: pending });
      const text = await chat.chatMessage({ by: 'ai' }).writeStream(answer(history, pending, system));
      const toolTitle = lastResolvedMovieTitle();
      const title = titleFromAnswer(text) ?? toolTitle;
      if (title) {
        lastImageTitle = title;
        br.setValue('lastImageTitle', lastImageTitle);
        lastImage = await generatePosterImage(lastImageTitle);
        br.setValue('lastImage', lastImage);
        lastImageErrorMsg = lastImageError;
        br.setValue('lastImageError', lastImageErrorMsg);
      } else {
        lastImage = null;
        lastImageTitle = null;
        lastImageErrorMsg = null;
        br.setValue('lastImage', lastImage);
        br.setValue('lastImageTitle', lastImageTitle);
        br.setValue('lastImageError', lastImageErrorMsg);
      }
      payload = lastMessages.length > 0 ? [...lastMessages] : [...req, { role: 'assistant', content: text }];
      history = [...history, { by: 'human', content: pending }, { by: 'ai', content: text }];
      br.setValue('payload', payload);
      br.setValue('history', history);
      showDoodle();
    } else {
      showDoodle();
    }

    if (chat.button({ id: 'clear', label: 'Clear chat' })) {
      history = [];
      payload = [];
      lastImage = null;
      lastImageTitle = null;
      lastImageErrorMsg = null;
      br.setValue('history', history);
      br.setValue('payload', payload);
      br.setValue('lastImage', lastImage);
      br.setValue('lastImageTitle', lastImageTitle);
      br.setValue('lastImageError', lastImageErrorMsg);
    }

    const dock = chat.bottom();
    dock.chatInput({ id: 'chat', placeholder: 'How much is a ticket for Dune?…' });

    Inspector(side, history, payload, system);
  },
  { server: { port: 3335 } },
);
