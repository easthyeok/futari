const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const ctx={window:{React:{createElement(){},useState(){},useEffect(){},useRef(){},useMemo(){}},ReactDOM:{createRoot:()=>({render(){}})},FutariToday:{},FutariHome:{balance:()=>0},FutariGames:{},FutariBoardGames:{},FUTARI_CONFIG:{SUPABASE_URL:'mock',SUPABASE_KEY:'public'}},document:{getElementById:()=>({})},localStorage:{getItem:()=>null},setTimeout,clearTimeout,console};
for(const name of ['data.js','activity.js','sync-engine.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),ctx);
const D=ctx.window.FutariData,S=ctx.window.FutariSync.Session;
let row=D.migrate({memories:[{id:'photo',photo:'A'.repeat(1024*1024)}]}),version='v1',columns=[],error=null;
const client={from(){let selected;const q={select(value){selected=value;columns.push(value);return q;},eq(){return q;},async maybeSingle(){return error?{error}:{data:selected==='updated_at'?{updated_at:version}:{data:D.copy(row),updated_at:version}};}};return q;}};
ctx.window.supabase={createClient:()=>client};
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8').replace('  try {\n    ReactDOM.createRoot','  window.egressTest={cloudLoad};\n  try {\n    ReactDOM.createRoot');
vm.runInNewContext(source,ctx);const load=ctx.window.egressTest.cloudLoad;
(async()=>{
 let v;const base=await load('room',value=>{v=value;return true;});assert.equal(v,'v1');
 columns=[];const same=await load('room',()=>true,{data:base,version:v});assert.equal(same,base);assert.deepEqual(columns,['updated_at']);
 row.settings.me='remote';version='v2';columns=[];const changed=await load('room',value=>{v=value;return true;},{data:base,version:'v1'});assert.equal(changed.settings.me,'remote');assert.equal(v,'v2');assert.deepEqual(columns,['updated_at','data,updated_at']);
 error={message:'service restricted: exceed_egress_quota'};let message;const session=new S({load:()=>load('room'),persist(){},onChange(d,a,m){message=m;}});await session.open();assert(message.includes('서버 데이터 전송량 한도'));assert(!message.includes('exceed_egress_quota'));session.close();
 await assert.rejects(load('room',()=>true,{data:base,version:v}),e=>e===error);
 console.log('PASS: unchanged photo snapshots use version-only reads, changed versions fetch data, quota errors are explained and preserved');
})().catch(e=>{console.error(e);process.exitCode=1;});
