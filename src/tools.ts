import { MOVIES } from './movies';

export function search_movies(query: string): string {
  const q = (query ?? '').toLowerCase();
  const hits = MOVIES.filter((m) => m.title.toLowerCase().includes(q));
  if (hits.length === 0) return 'No movies found.';
  return hits.map((m) => `${m.title} (${m.price}, ${m.format})`).join('; ');
}

export function get_ticket_price(title: string): string {
  const movie = find_movie(title);
  if (!movie) return `Movie "${title}" not found. Available: ${MOVIES.map((m) => m.title).join(', ')}.`;
  return `${movie.title}: ${movie.price} (${movie.format}).`;
}

export function get_showtimes(title: string): string {
  const movie = find_movie(title);
  if (!movie) return `Movie "${title}" not found. Available: ${MOVIES.map((m) => m.title).join(', ')}.`;
  return `${movie.title} showtimes: ${movie.showtimes.join(', ')}.`;
}

function find_movie(title: string) {
  const t = (title ?? '').toLowerCase().trim();
  return (
    MOVIES.find((m) => m.title.toLowerCase() === t) ??
    MOVIES.find((m) => m.title.toLowerCase().includes(t)) ??
    MOVIES.find((m) => t.includes(m.title.toLowerCase()))
  );
}

export const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_movies',
      description: 'Search movies by title keyword',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_ticket_price',
      description: 'Get ticket price for an exact movie title',
      parameters: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_showtimes',
      description: 'Get showtimes for an exact movie title',
      parameters: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] },
    },
  },
] as const;

export function handle_tool_calls(message: any): any[] {
  const responses: any[] = [];
  for (const tool_call of message.tool_calls ?? []) {
    const args = JSON.parse(tool_call.function?.arguments ?? '{}');
    let result: string;
    if (tool_call.function.name === 'search_movies') {
      console.log(`Tool called: search_movies(${args.query})`);
      result = search_movies(args.query);
    } else if (tool_call.function.name === 'get_ticket_price') {
      console.log(`Tool called: get_ticket_price(${args.title})`);
      result = get_ticket_price(args.title);
    } else if (tool_call.function.name === 'get_showtimes') {
      console.log(`Tool called: get_showtimes(${args.title})`);
      result = get_showtimes(args.title);
    } else {
      result = `Unknown tool: ${tool_call.function.name}.`;
    }
    responses.push({ role: 'tool', content: result, tool_call_id: tool_call.id });
  }
  return responses;
}
