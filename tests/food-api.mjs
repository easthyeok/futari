import assert from 'node:assert/strict';
import { createHandler, validateInput, validOutput } from '../supabase/functions/food-recommend/handler.mjs';
const form={mode:'pair',category:'상관없음',main:'과메기',drink:'막걸리',method:'직접 요리',taste:'국물',simple:true,exclude:'오이',note:'따뜻한 국물도 하나'};
const items=[{name:'바지락 술찜',reason:'따뜻하게 곁들여요',preparation:'약 20분'}, {name:'어묵탕',reason:'맑은 국물',preparation:'약 15분'}, {name:'콩나물국',reason:'가벼운 국물',preparation:'약 15분'}];
let calls=[],quotas=[],permitted=true,quotaThrows=false,kind='ok';
const config={apiKey:'server-only-test-key',model:'configured-model',allowedRooms:['room'],allowedOrigins:['https://example.com'],consumeQuota:async hash=>{quotas.push(hash);if(quotaThrows)throw Error('secret diagnostics');return permitted;},fetcher:async(url,options)=>{
  calls.push({url,options});if(kind==='throw')throw Error('secret diagnostics');if(kind==='abort'){const e=Error('timeout');e.name='AbortError';throw e;}
  if(kind==='rate')return new Response('private upstream diagnostics',{status:429});if(kind==='error')return new Response('private upstream diagnostics',{status:401});
  if(kind==='malformed')return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:'not JSON'}]}]}));
  if(kind==='refusal')return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'refusal',refusal:'no'}]}]}));
  return new Response(JSON.stringify({status:kind==='incomplete'?'incomplete':'completed',output:[{type:'reasoning',summary:[]},{type:'message',content:[{type:'output_text',text:JSON.stringify({items:kind==='short'?items.slice(0,1):items})}]}]}));
}};
const handler=createHandler(config);
function request(body={room:'room',form,avoid:['골뱅이소면']},options={}){return new Request('https://edge.example/food-recommend',{method:options.method||'POST',headers:{Origin:options.origin===undefined?'https://example.com':options.origin,'Content-Type':options.type||'application/json'},body:options.method==='GET'||options.method==='OPTIONS'?undefined:typeof body==='string'?body:JSON.stringify(body)});}
assert(validateInput({room:'room',form}));assert.equal(validateInput({room:'room',form:{...form,note:'x'.repeat(401)}}),null);assert.equal(validateInput({room:'room',form:{...form,drink:'arbitrary'}}),null);assert.equal(validateInput({room:'room',form,avoid:['x'.repeat(81)]}),null);assert.equal(validateInput({room:'room',form:{...form,simple:'yes'}}),null);assert(validateInput({room:'room',form:{...form,main:'부야베스와 뇨키',category:'세계요리'}}));assert.equal(validateInput({room:'room',form:{...form,category:'invalid'}}),null);assert.equal(validateInput({room:'room',form,avoid:Array(13).fill('menu')}),null);assert(validOutput({items}));assert(!validOutput({items:[items[0],items[0],items[0]]}));
assert.equal((await handler(request({}, {method:'OPTIONS'}))).status,204);
assert.equal((await handler(request({}, {method:'GET'}))).status,405);
assert.equal((await handler(request(undefined,{origin:'https://evil.example'}))).status,403);
assert.equal((await handler(request({room:'other',form}))).status,403);
assert.equal((await handler(request('{broken'))).status,400);
assert.equal((await handler(request(' '.repeat(9000)))).status,400);
assert.equal((await handler(request({}, {type:'text/plain'}))).status,415);assert.equal(calls.length,0);assert.equal(quotas.length,0);
assert.equal((await createHandler({...config,apiKey:''})(request())).status,503);
permitted=false;assert.equal((await handler(request())).status,429);assert.equal(calls.length,0);permitted=true;
quotaThrows=true;let response=await handler(request());assert.equal(response.status,503);assert(!(await response.text()).includes('secret'));quotaThrows=false;
response=await handler(request());assert.equal(response.status,200);assert.deepEqual((await response.json()).items,items);assert.equal(response.headers.get('access-control-allow-origin'),'https://example.com');assert.equal(response.headers.get('cache-control'),'no-store');assert.match(quotas.at(-1),/^[a-f0-9]{64}$/);assert.notEqual(quotas.at(-1),'room');
const call=calls.at(-1),payload=JSON.parse(call.options.body);assert.equal(call.url,'https://api.openai.com/v1/responses');assert.equal(payload.model,'configured-model');assert.equal(payload.store,false);assert.equal(payload.text.format.strict,true);assert.equal(payload.text.format.type,'json_schema');assert.equal(payload.max_output_tokens,1400);assert(!payload.input.includes('room'));assert(!payload.input.includes('server-only-test-key'));assert.deepEqual(JSON.parse(payload.input).preferences,form);assert.deepEqual(JSON.parse(payload.input).avoid,['골뱅이소면']);
for(const value of ['error','throw','malformed','refusal','incomplete','short']){kind=value;response=await handler(request());assert.equal(response.status,502,value);const text=await response.text();assert(!text.includes('diagnostics'));assert(!text.includes('server-only-test-key'));}kind='rate';assert.equal((await handler(request())).status,429);
console.log('PASS: bounded input/schema validation, strict origins/room allowlist, fail-closed persistent quota, server-only key, Responses structured output, data minimization, upstream refusal/incomplete/error handling and CORS');
