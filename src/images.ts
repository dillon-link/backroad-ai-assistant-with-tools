import OpenAI from 'openai';
import { lastToolCalls } from './ai';
import { MOVIES } from './movies';

const TITLE_TOOLS = new Set(['get_ticket_price', 'get_showtimes']);

/** Exact MOVIES title resolved by the most recent successful title tool call, or null. */
export function lastResolvedMovieTitle(): string | null {
  for (let i = lastToolCalls.length - 1; i >= 0; i--) {
    const call = lastToolCalls[i];
    if (!TITLE_TOOLS.has(call.name)) continue;
    if (!isSuccessfulResult(call.result)) continue;
    const requested = parseTitle(call.args);
    if (!requested) continue;
    const movie = MOVIES.find((m) => m.title.toLowerCase() === requested.toLowerCase());
    if (movie) return movie.title;
  }
  return null;
}

/** Exact MOVIES title mentioned in the assistant's final text, or null. Prefers the earliest mention. */
export function titleFromAnswer(text: string): string | null {
  const hay = (text ?? '').toLowerCase();
  if (!hay.trim()) return null;
  let best: string | null = null;
  let bestIndex = Infinity;
  for (const m of MOVIES) {
    const idx = hay.indexOf(m.title.toLowerCase());
    if (idx === -1) continue;
    if (idx < bestIndex || (idx === bestIndex && (best === null || m.title.length > best.length))) {
      best = m.title;
      bestIndex = idx;
    }
  }
  return best;
}

/** Last image-generation failure message, if any. Null on success or when skipped (no key). */
export let lastImageError: string | null = null;

/** Generates a cheap cinema doodle that shows the resolved movie title as text in the image. */
export async function generatePosterImage(title: string): Promise<string | null> {
  lastImageError = null;
  if (!process.env.OPENAI_API_KEY) return null;
  if (!title?.trim()) {
    lastImageError = 'missing title';
    return null;
  }
  try {
    const client = new OpenAI();
    const response = await client.images.generate({
      model: 'gpt-image-1-mini',
      prompt: `Minimal flat doodle of a cozy empty cinema room with popcorn and tickets, with the exact text "${title.trim()}" written large and centered. Only that text, no other words, no logos, no real people, no celebrities, no copyrighted characters, not a movie poster.`,
      size: '1024x1024',
      quality: 'low',
    });
    const b64 = response.data?.[0]?.b64_json;
    if (!b64) {
      lastImageError = 'empty image response (no b64_json)';
      return null;
    }
    return `data:image/png;base64,${b64}`;
  } catch (err) {
    lastImageError = err instanceof Error ? err.message : 'unknown error';
    console.error(`Poster image failed: ${lastImageError}`);
    return null;
  }
}

function isSuccessfulResult(result: string): boolean {
  const text = (result ?? '').trim();
  if (!text) return false;
  if (text.startsWith('Movie "')) return false;
  const lower = text.toLowerCase();
  if (lower.includes('not found')) return false;
  if (lower.includes('no movies found')) return false;
  return true;
}

function parseTitle(args: string): string | null {
  try {
    const parsed = JSON.parse(args ?? '{}');
    const title = parsed?.title;
    return typeof title === 'string' && title.trim() ? title.trim() : null;
  } catch {
    return null;
  }
}
