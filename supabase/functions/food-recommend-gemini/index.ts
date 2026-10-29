import { quotaDenial } from './quota.mjs';
import { createHandler } from './handler.mjs';
function list(name: string): string[] {
  try { const value = JSON.parse(Deno.env.get(name) || '[]'); return Array.isArray(value) && value.every(v => typeof v === 'string') ? value : []; }
  catch { return []; }
}
const base = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
Deno.serve(createHandler({
  apiKey: Deno.env.get('GEMINI_API_KEY'),
  model: Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash-lite',
  allowedRooms: list('FOOD_ALLOWED_ROOMS'),
  allowedOrigins: list('FOOD_ALLOWED_ORIGINS'),
  consumeQuota: base && serviceKey ? async (roomHash: string, signal: AbortSignal) => {
    const response = await fetch(base + '/rest/v1/rpc/consume_food_recommendation', {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', apikey: serviceKey, Authorization: 'Bearer ' + serviceKey },
      body: JSON.stringify({room_hash: roomHash})
    });
    if (!response.ok) throw Error('quota_unavailable');
    if ((await response.json()) === true) return true;
    // The existing atomic quota RPC returns false for both cooldown and daily caps.
    // Read only the two usage rows with the server key to explain the rejection.
    const usage = await fetch(base + '/rest/v1/food_recommendation_usage?select=scope,usage_day,requests,last_request&scope=in.(global,room:' + roomHash + ')', {
      signal, headers:{apikey:serviceKey,Authorization:'Bearer ' + serviceKey}
    });
    if (!usage.ok) return {allowed:false,error:'request_limit'};
    return quotaDenial(await usage.json(),roomHash);
  } : undefined
}));
