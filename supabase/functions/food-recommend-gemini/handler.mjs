import { recommendationPrompt } from './prompts.mjs';
// Send only validated preferences and a bounded selection of record titles/places.
const MODES = ['pair', 'meal'];
const CATEGORIES = ['고기', '해산물', '면·밥', '분식', '채소·두부', '세계요리', '상관없음'];
const DRINKS = ['없음', '막걸리', '맥주', '소주', '와인', '하이볼'];
const METHODS = ['직접 요리', '배달·포장'];
const TASTES = ['상관없음', '국물', '매콤', '담백', '가벼운 메뉴'];
function resultSchema(properties, required) {
  return {type:'object', additionalProperties:false, properties:{items:{type:'array', minItems:3, maxItems:3,
    items:{type:'object', additionalProperties:false, properties, required}}}, required:['items']};
}
export const schema = resultSchema({name:{type:'string'}}, ['name']);
export const dateSchema = resultSchema({name:{type:'string'}, reason:{type:'string'},
  steps:{type:'array', minItems:2, maxItems:5, items:{type:'string'}}}, ['name','reason','steps']);
export function validateInput(body) {
  if (!body || typeof body !== 'object' || !body.form || typeof body.form !== 'object') return null;
  const f = body.form;
  if (typeof body.room !== 'string' || !body.room || body.room.length > 100 ||
      !MODES.includes(f.mode) || (f.category !== undefined && !CATEGORIES.includes(f.category)) || !DRINKS.includes(f.drink) || !METHODS.includes(f.method) ||
      !TASTES.includes(f.taste) || typeof f.simple !== 'boolean') return null;
  for (const [key, limit] of [['main', 80], ['exclude', 160], ['note', 400]]) {
    if (typeof f[key] !== 'string' || f[key].length > limit) return null;
  }
  const avoid = body.avoid === undefined ? [] : body.avoid;
  if (!Array.isArray(avoid) || avoid.length > 12 || avoid.some(v => typeof v !== 'string' || v.length > 80)) return null;
  const kind = body.kind === undefined ? 'meal' : body.kind;
  if (!['meal', 'date'].includes(kind)) return null;
  const history = {};
  if (body.history !== undefined) {
    if (!body.history || typeof body.history !== 'object' || Array.isArray(body.history)) return null;
    for (const key of ['foodWishes','memories','places','buckets','dates']) {
      const rows = body.history[key] || [];
      if (!Array.isArray(rows) || rows.length > 8) return null;
      history[key] = [];
      for (const row of rows) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
        const item = {};
        for (const field of ['name','title','text','place','category','date']) {
          if (row[field] !== undefined) {
            if (typeof row[field] !== 'string' || row[field].length > 80) return null;
            item[field] = row[field];
          }
        }
        if (typeof row.done === 'boolean') item.done = row.done;
        history[key].push(item);
      }
    }
  }
  return { room: body.room, kind, history, form: {
    mode: f.mode, category: f.category || '상관없음', main: f.mode === 'pair' ? f.main.trim() : '', drink: f.drink,
    method: f.method, taste: f.taste, simple: f.simple, exclude: f.exclude.trim(), note: f.note.trim()
  }, avoid };
}
export function validOutput(value, kind = 'meal') {
  const short = (v, max) => typeof v === 'string' && !!v.trim() && v.length <= max;
  return !!value && Array.isArray(value.items) && value.items.length === 3 &&
    value.items.every(item => item && short(item.name,80) && (kind !== 'date' ||
      short(item.reason,400) && Array.isArray(item.steps) && item.steps.length >= 2 && item.steps.length <= 5 && item.steps.every(step=>short(step,160)))) &&
    new Set(value.items.map(item=>item.name.trim())).size === 3;
}
async function readBody(request) {
  if (!request.body) throw Error('body');
  const reader = request.body.getReader(), chunks = []; let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 65536) { await reader.cancel(); throw Error('size'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let position = 0;
  for (const chunk of chunks) { bytes.set(chunk, position); position += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
export function createHandler({ apiKey, model, allowedRooms = [], allowedOrigins = [], consumeQuota, fetcher = fetch }) {
  return async request => {
    const origin = request.headers.get('origin');
    const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', Vary: 'Origin' };
    const reply = (status, message) => new Response(JSON.stringify(message), {status, headers});
    if (!origin || !allowedOrigins.includes(origin)) return reply(403, {error: 'origin_not_allowed'});
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'content-type, apikey, authorization, x-client-info';
    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers});
    if (request.method !== 'POST') return reply(405, {error: 'method_not_allowed'});
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return reply(415, {error: 'json_required'});
    let body; try { body = await readBody(request); } catch { return reply(400, {error: 'invalid_body'}); }
    const input = validateInput(body);
    if (!input) return reply(400, {error: 'invalid_preferences'});
    // This app currently uses a shared room code, not Supabase Auth. Explicitly opt rooms in.
    if (!allowedRooms.includes(input.room)) return reply(403, {error: 'room_not_enabled'});
    if (!apiKey || model !== 'gemini-3.5-flash-lite' || typeof consumeQuota !== 'function') return reply(503, {error: 'not_configured'});
    const controller = new AbortController();
    const abort = () => controller.abort(); request.signal.addEventListener('abort', abort, {once: true});
    if (request.signal.aborted) abort();
    const timer = setTimeout(abort, 20000);
    try {
      const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input.room)));
      const roomHash = Array.from(hash, byte => byte.toString(16).padStart(2, '0')).join('');
      let permitted;
      try { permitted = await consumeQuota(roomHash, controller.signal); }
      catch { return reply(503, {error: 'quota_unavailable'}); }
      if (permitted !== true && !(permitted && permitted.allowed === true)) {
        const code = permitted && ['request_cooldown','daily_limit','request_limit'].includes(permitted.error) ? permitted.error : 'request_limit';
        return reply(429, {error:code, ...(code === 'request_cooldown' ? {retryAfter:Math.max(1,Math.min(10,Number(permitted.retryAfter)||10))} : {})});
      }
      // A dedicated Gemini endpoint: no paid-provider fallback, search tools or retries.
      const response = await fetcher('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
        method: 'POST', signal: controller.signal,
        headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {parts:[{text:recommendationPrompt(input.kind)}]},
          contents: [{role:'user', parts:[{text:JSON.stringify({kind:input.kind, history:input.history,
            ...(input.kind === 'meal' ? {preferences:input.form} : {}), avoid:input.avoid})}]}],
          generationConfig: {maxOutputTokens: 1400, responseFormat: {text: {mimeType: 'APPLICATION_JSON', schema:input.kind === 'date' ? dateSchema : schema}}}
        })
      });
      if (!response.ok) return reply(response.status === 429 ? 429 : 502, {error: response.status === 429 ? 'provider_rate_limit' : 'recommendation_unavailable'});
      const data = await response.json();
      if (data.promptFeedback?.blockReason) return reply(502, {error: 'recommendation_unavailable'});
      const candidate = data.candidates?.[0];
      if (!candidate || candidate.finishReason !== 'STOP') return reply(502, {error: 'incomplete_recommendation'});
      const text = (candidate.content?.parts || []).filter(part => !part.thought && typeof part.text === 'string').map(part => part.text).join('');
      let result; try { result = JSON.parse(text); } catch { return reply(502, {error: 'invalid_recommendation'}); }
      if (!validOutput(result,input.kind)) return reply(502, {error: 'invalid_recommendation'});
      const items = result.items.map(item=>input.kind === 'date' ? {name:item.name.trim(),reason:item.reason.trim(),steps:item.steps.map(step=>step.trim())} : {name:item.name.trim()});
      // Older app shells still expect the old fields; never send recipes to them.
      const legacyItems = input.kind === 'date' ? items.map(item=>({...item,preparation:item.steps.join(' → ')})) : items.map(item=>({...item,reason:'둘이 먹을 음식 후보예요.',preparation:'음식 이름만 골랐어요.'}));
      return reply(200, {provider:'gemini',kind:input.kind,recommendationVersion:2,items:body.recommendationVersion === 2 ? items : legacyItems});
    } catch (error) {
      return reply(controller.signal.aborted ? 504 : 502, {error: 'recommendation_unavailable'});
    } finally {
      clearTimeout(timer); request.signal.removeEventListener('abort', abort);
    }
  };
}
