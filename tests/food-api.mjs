import assert from 'node:assert/strict';
import {createHandler} from '../supabase/functions/food-recommend-gemini/handler.mjs';
let externalCalls=0;
const handler=createHandler({fetcher:()=>{externalCalls++;throw Error('AI must not be called');},consumeQuota:()=>{externalCalls++;throw Error('quota must not be consumed');}});
for(const origin of ['https://easthyeok.github.io','https://other.example']){
 const response=await handler(new Request('https://edge.example/food-recommend-gemini',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({room:'old-client',kind:'date'})}));
 assert.equal(response.status,410);assert.deepEqual(await response.json(),{error:'ai_removed'});assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('access-control-allow-origin'),origin==='https://easthyeok.github.io'?origin:null);
}
assert.equal((await handler(new Request('https://edge.example/food-recommend-gemini',{method:'OPTIONS',headers:{origin:'https://easthyeok.github.io'}}))).status,204);
assert.equal(externalCalls,0);
console.log('PASS: retired endpoint returns 410 to stale clients, no AI calls or quota consumption, controlled CORS');
