import { createHandler } from './handler.mjs';
function list(name: string): string[] {
  try { const value = JSON.parse(Deno.env.get(name) || '[]'); return Array.isArray(value) && value.every(v => typeof v === 'string') ? value : []; }
  catch { return []; }
}
const base = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
Deno.serve(createHandler({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
  model: Deno.env.get('OPENAI_MODEL'),
  allowedRooms: list('FOOD_ALLOWED_ROOMS'),
  allowedOrigins: list('FOOD_ALLOWED_ORIGINS'),
  consumeQuota: base && serviceKey ? async (roomHash: string, signal: AbortSignal) => {
    const response = await fetch(base + '/rest/v1/rpc/consume_food_recommendation', {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', apikey: serviceKey, Authorization: 'Bearer ' + serviceKey },
      body: JSON.stringify({room_hash: roomHash})
    });
    if (!response.ok) throw Error('quota_unavailable');
    return (await response.json()) === true;
  } : undefined
}));
