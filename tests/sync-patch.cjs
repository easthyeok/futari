const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const ctx={window:{React:{createElement(){},useState(){},useEffect(){},useRef(){},useMemo(){}},ReactDOM:{createRoot:()=>({render(){}})},FutariToday:{},FutariHome:{balance:()=>0},FutariGames:{},FutariBoardGames:{},FUTARI_CONFIG:{SUPABASE_URL:'mock',SUPABASE_KEY:'public'}},document:{getElementById:()=>({})},localStorage:{getItem:()=>null},setTimeout,clearTimeout,console};
for(const name of ['data.js','activity.js','sync-engine.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),ctx);
const D=ctx.window.FutariData,S=ctx.window.FutariSync.Session;
let row=D.migrate({memories:[{id:'photo',title:'before',photo:'data:image/jpeg;base64,'+'A'.repeat(8*1024*1024)}],unknown:{preserve:true}}),version='v1',serial=1,calls=[],offline=false,lost=false;
const get=(d,p)=>p.reduce((v,k)=>v===undefined?undefined:typeof k==='object'?v.find(x=>x.id===k.id):v[k],d);
const client={
 from(){const q={select(){return q;},eq(){return q;},maybeSingle:async()=>({data:{data:D.copy(row),updated_at:version}}),update(){throw Error('Full document writes must never be used');}};return q;},
 async rpc(name,args){assert.equal(name,'commit_room_patch');calls.push(JSON.parse(JSON.stringify(args)));if(offline)return{error:{message:'offline'}};if(args.expected_version!==version)return{data:{conflict:true,version}};
  row=D.apply(row,args.patches.map(op=>({...op,base:get(row,op.path)})));version='v'+(++serial);if(lost)return{error:{message:'lost response'}};return{data:{version}};
 }
};
ctx.window.supabase={createClient:()=>client};
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8').replace('  try {\n    ReactDOM.createRoot','  window.patchTest={cloudLoad,cloudCommit};\n  try {\n    ReactDOM.createRoot');vm.runInNewContext(source,ctx);const api=ctx.window.patchTest;
function adapter(cached){let persisted;const s=new S({cached,load:async()=>{let v;const data=await api.cloudLoad('room',value=>{v=value;return true;});return{data,version:v};},save:(d,v,b)=>api.cloudCommit('room',d,v,b),persist:value=>{persisted=D.copy(value);},onChange(){}});return{s,get cached(){return persisted;}};}
(async()=>{
 await assert.rejects(api.cloudCommit('room',row,version),/서버 기준/);assert.equal(calls.length,0);
 let base=D.copy(row),next=D.copy(base);next.memories[0].title='after';await api.cloudCommit('room',next,version,base);assert.equal(row.memories[0].title,'after');assert.equal(row.memories[0].photo,base.memories[0].photo);assert(JSON.stringify(calls.at(-1)).length<1024);assert(!JSON.stringify(calls.at(-1)).includes('base'));
 // Removing a photo-bearing record sends only its id, never the old image/base.
 next=D.copy(row);next.memories=[];const deletion=D.patch(row,next);assert(JSON.stringify(deletion).length<200);assert(deletion[0].removed);
 // Two clients with the same base preserve independent changes via CAS/rebase.
 const x=adapter(),y=adapter();await x.s.open();await y.s.open();x.s.change(d=>d.foodWishes.push({id:'food',name:'떡볶이',done:false}),'me');y.s.change(d=>d.buckets.push({id:'wish',text:'전시',done:false}),'you');await Promise.all([x.s.flush(),y.s.flush()]);assert.equal(row.foodWishes.length,1);assert.equal(row.buckets.length,1);assert(!x.s.dirty&&!y.s.dirty);assert(row.unknown.preserve);assert(row.memories[0].photo===base.memories[0].photo);
 // An older durable cache reopens and saves only the unconfirmed delta.
 const z=adapter();await z.s.open();offline=true;z.s.change(d=>d.memories[0].title='recovered','me');await z.s.flush();const pending=z.cached;assert(pending.pending);z.s.close();offline=false;const reopened=adapter(pending);await reopened.s.open();await new Promise(r=>setImmediate(r));assert.equal(row.memories[0].title,'recovered');assert(!reopened.s.dirty);assert(!reopened.cached.pending);assert(JSON.stringify(calls.at(-1)).length<4096);
 // Lost responses are acknowledged from commit markers without replaying twice.
 lost=true;reopened.s.change(d=>d.foodWishes.push({id:'second-food',name:'샤브샤브',done:false}),'me');await reopened.s.flush();assert(reopened.s.dirty);lost=false;reopened.s.retryAt=0;let before=calls.length;await reopened.s.refresh();assert(!reopened.s.dirty);assert.equal(calls.length,before);assert.equal(row.foodWishes.filter(x=>x.id==='second-food').length,1);
 assert(calls.every(call=>!('data' in call)&&!('base' in call)));assert(calls.every(call=>JSON.stringify(call).length<8192),'ordinary writes stay below 8 KB even with an 8 MB photo');
 x.s.close();y.s.close();reopened.s.close();console.log('PASS: 8 MB photo stays off wire, id-only deletions, CAS/rebase, pending-cache recovery, exact version pairing and lost-response acknowledgement through patch RPC');
})().catch(e=>{console.error(e);process.exitCode=1;});
