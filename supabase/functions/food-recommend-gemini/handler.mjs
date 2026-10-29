// Retired endpoint: old installed app shells must not trigger external AI calls.
export function createHandler() {
  return async request => {
    const headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin'};
    if (request.headers.get('origin') === 'https://easthyeok.github.io') {
      headers['Access-Control-Allow-Origin'] = 'https://easthyeok.github.io';
      headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'content-type, apikey, authorization, x-client-info';
    }
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers});
    return new Response(JSON.stringify({error:'ai_removed'}),{status:410,headers});
  };
}
