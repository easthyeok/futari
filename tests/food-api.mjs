import assert from 'node:assert/strict';
import { createHandler, validateInput, validOutput } from '../supabase/functions/food-recommend-gemini/handler.mjs';
const form={mode:'pair',category:'상관없음',main:'과메기',drink:'막걸리',method:'직접 요리',taste:'국물',simple:true,exclude:'오이',note:'따뜻한 국물도 하나'};
const items=[{name:'바지락 술찜'},{name:'어묵탕'},{name:'콩나물국'}];
const dateItems=[{name:'전시와 산책',reason:'전시 기록을 참고했어요.',steps:['전시 관람','공원 산책']},{name:'공방 체험',reason:'함께 할 일에서 골랐어요.',steps:['도자기 공방','카페']},{name:'영화 데이트',reason:'실내 활동을 골랐어요.',steps:['영화 관람','산책']}];
let outputItems=items;
let calls=[],quotas=[],permitted=true,quotaThrows=false,kind='ok';
const config={apiKey:'server-only-test-key',model:'gemini-3.5-flash-lite',allowedRooms:['room'],allowedOrigins:['https://example.com'],consumeQuota:async hash=>{quotas.push(hash);if(quotaThrows)throw Error('secret diagnostics');return permitted;},fetcher:async(url,options)=>{
  calls.push({url,options});if(kind==='throw')throw Error('secret diagnostics');if(kind==='abort'){const e=Error('timeout');e.name='AbortError';throw e;}
  if(kind==='rate')return new Response('private upstream diagnostics',{status:429});if(kind==='error')return new Response('private upstream diagnostics',{status:401});
  if(kind==='malformed')return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:'not JSON'}]}}]}));
  if(kind==='refusal')return new Response(JSON.stringify({promptFeedback:{blockReason:'SAFETY'}}));
  return new Response(JSON.stringify({candidates:[{finishReason:kind==='incomplete'?'MAX_TOKENS':'STOP',content:{parts:[{thought:true,text:'private reasoning'},{text:JSON.stringify({items:kind==='short'?outputItems.slice(0,1):outputItems})}]}}]}));
}};
const handler=createHandler(config);
function request(body={room:'room',form,avoid:['골뱅이소면']},options={}){return new Request('https://edge.example/food-recommend',{method:options.method||'POST',headers:{Origin:options.origin===undefined?'https://example.com':options.origin,'Content-Type':options.type||'application/json'},body:options.method==='GET'||options.method==='OPTIONS'?undefined:typeof body==='string'?body:JSON.stringify({...body,recommendationVersion:2})});}
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
response=await handler(request());assert.equal(response.status,200);const success=await response.json();assert.equal(success.provider,'gemini');assert.deepEqual(success.items,items);assert.equal(response.headers.get('access-control-allow-origin'),'https://example.com');assert.equal(response.headers.get('cache-control'),'no-store');assert.match(quotas.at(-1),/^[a-f0-9]{64}$/);assert.notEqual(quotas.at(-1),'room');
const call=calls.at(-1),payload=JSON.parse(call.options.body);assert.equal(call.url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');assert.equal(call.options.headers['x-goog-api-key'],'server-only-test-key');assert(!call.url.includes('server-only-test-key'));assert(!('Authorization' in call.options.headers));assert.equal(payload.generationConfig.maxOutputTokens,1400);assert.equal(payload.generationConfig.responseFormat.text.mimeType,'APPLICATION_JSON');assert.equal(payload.generationConfig.responseFormat.text.schema.properties.items.minItems,3);assert.equal(payload.generationConfig.responseFormat.text.schema.properties.items.maxItems,3);assert(!('tools' in payload));assert(!JSON.stringify(payload.contents).includes('room'));assert(!JSON.stringify(payload).includes('server-only-test-key'));assert.deepEqual(JSON.parse(payload.contents[0].parts[0].text).preferences,form);assert.deepEqual(JSON.parse(payload.contents[0].parts[0].text).avoid,['골뱅이소면']);
assert.equal((await createHandler({...config,model:'paid-only-model'})(request())).status,503);
assert(calls.every(call=>!call.url.includes('openai.com')));
for(const value of ['error','throw','malformed','refusal','incomplete','short']){kind=value;response=await handler(request());assert.equal(response.status,502,value);const text=await response.text();assert(!text.includes('diagnostics'));assert(!text.includes('server-only-test-key'));}kind='rate';assert.equal((await handler(request())).status,429);
console.log('PASS: bounded input/schema validation, strict origins/room allowlist, fail-closed persistent quota, server-only key, Gemini structured output and no paid-provider fallback, data minimization, upstream refusal/incomplete/error handling and CORS');

// New proactive context is bounded and strips private fields before sending upstream.
const context={memories:[{title:'바다 여행',memo:'private',photos:['private']}],foodWishes:[{name:'우동',done:true}]};
const validated=validateInput({room:'room',form,kind:'date',history:context});
assert.equal(validated.kind,'date');assert.equal(validated.history.memories[0].title,'바다 여행');assert(!JSON.stringify(validated.history).includes('private'));
assert.equal(validateInput({room:'room',form,kind:'bad'}),null);assert.equal(validateInput({room:'room',form,history:{dates:Array(9).fill({})}}),null);
assert.equal(validateInput({room:'room',form,history:{memories:[{title:'x'.repeat(81)}]}}),null);
kind='ok';outputItems=dateItems;response=await handler(request({room:'room',form,kind:'date',history:context}));assert.equal(response.status,200);
const proactive=JSON.parse(JSON.parse(calls.at(-1).options.body).contents[0].parts[0].text);assert.equal(proactive.kind,'date');assert(!JSON.stringify(proactive).includes('private'));
console.log('PASS: date mode and bounded record context strip diary bodies and photos');

assert(!('preferences' in proactive),'date prompt is not supplied meal mode or cooking preferences');
assert.deepEqual((await response.json()).items,dateItems);
assert.equal(validOutput({items},'date'),false);
outputItems=items;response=await handler(request({room:'room',form,kind:'date'}));assert.equal(response.status,502,'menu-only response rejected for date request');
outputItems=dateItems.map(x=>({...x,steps:['single stop']}));assert(!validOutput({items:outputItems},'date'));
for(const [error,retryAfter] of [['request_cooldown',4],['daily_limit',undefined],['request_limit',undefined]]) {
 const throttled=createHandler({...config,consumeQuota:async()=>({allowed:false,error,retryAfter})});
 response=await throttled(request());assert.equal(response.status,429);const body=await response.json();assert.equal(body.error,error);if(retryAfter)assert.equal(body.retryAfter,retryAfter);
}
outputItems=items;kind='rate';response=await handler(request());assert.equal((await response.json()).error,'provider_rate_limit');
kind='ok';outputItems=items.map(x=>({...x,preparation:'recipe must be stripped',reason:'no extra text'}));response=await handler(request());assert.deepEqual((await response.json()).items,items);
const datePayload=JSON.parse(calls.findLast(call=>JSON.parse(call.options.body).generationConfig.responseFormat.text.schema.properties.items.items.properties.steps).options.body);
assert(!datePayload.systemInstruction.parts[0].text.includes('mode=meal'));
assert.deepEqual(datePayload.generationConfig.responseFormat.text.schema.properties.items.items.required,['name','reason','steps']);
console.log('PASS: separate prompts/schemas, date rejects menu-only response, meal strips recipes, provider/cooldown/daily errors');

const {quotaDenial}=await import('../supabase/functions/food-recommend-gemini/quota.mjs');
const now=Date.parse('2026-10-29T08:00:00Z'),row={scope:'room:hash',usage_day:'2026-10-29',requests:9,last_request:'2026-10-29T07:59:57Z'};
assert.deepEqual(quotaDenial([row],'hash',now),{allowed:false,error:'request_cooldown',retryAfter:7});
assert.equal(quotaDenial([{...row,requests:20}],'hash',now).error,'daily_limit');
assert.equal(quotaDenial([{...row,scope:'global',requests:100}],'hash',now).error,'daily_limit');
assert.equal(quotaDenial([{...row,usage_day:'2026-10-28',requests:20,last_request:'2026-10-28T08:00:00Z'}],'hash',now).error,'request_limit');
assert.equal(quotaDenial({},'hash',now).error,'request_limit');
console.log('PASS: quota rejection distinguishes 10-second cooldown and UTC daily room/global caps');
