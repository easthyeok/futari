// Keep the existing atomic quota enforcement; classify only its rejected result.
export function quotaDenial(rows, roomHash, now = Date.now()) {
  if (!Array.isArray(rows)) return {allowed:false,error:'request_limit'};
  const today = new Date(now).toISOString().slice(0,10);
  if (rows.some(row=>row.usage_day === today && row.requests >= (row.scope === 'global' ? 100 : 20))) return {allowed:false,error:'daily_limit'};
  const room = rows.find(row=>row.scope === 'room:' + roomHash);
  const remaining = room?.last_request ? 10 - (now - Date.parse(room.last_request))/1000 : 0;
  return remaining > 0 ? {allowed:false,error:'request_cooldown',retryAfter:Math.min(10,Math.ceil(remaining))} : {allowed:false,error:'request_limit'};
}
