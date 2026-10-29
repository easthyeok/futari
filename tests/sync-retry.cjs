const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const ctx={window:{React:{createElement(){}}},setTimeout,clearTimeout,console};
for(const f of ['data.js','activity.js','sync-engine.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),ctx);
const D=ctx.window.FutariData,S=ctx.window.FutariSync.Session;
(async()=>{
 let row=D.migrate({}),version=1,writes=0,mode='lost',messages=[];
 const opts={load:async()=>({data:D.copy(row),version}),save:async(d,v)=>{writes++;if(mode==='offline')throw Error('offline');row=D.copy(d);version++;if(mode==='lost')throw Error('response lost');return{version};},persist(){},onChange(d,a,m){messages.push(m);}};
 const s=new S(opts);await s.open();s.change(d=>d.buckets.push({id:'wish',text:'산책'}),'me');await s.flush();assert(s.dirty);assert.equal(writes,1);await s.refresh();assert.equal(writes,1,'backoff avoids immediate retry');s.retryAt=0;await s.refresh();assert(!s.dirty,'acknowledged commit clears pending after lost response');assert.equal(writes,1,'already stored commit needs no second write');assert.equal(s.outbox.length,0);
 mode='offline';s.change(d=>d.buckets.push({id:'two',text:'전시'}),'me');await s.flush();const count=writes;await s.refresh();await s.refresh();assert.equal(writes,count);assert(s.dirty);assert(!messages.includes('미저장 변경 복구 중…'));
 // Reopening after a lost response also clears pending without another save.
 const cached={data:D.copy(row),base:D.migrate({}),version:1,pending:true,outbox:[{id:Object.keys(row.commits)[0],ops:[]}]};
 const reopened=new S({...opts,cached});await reopened.open();assert(!reopened.dirty);assert.equal(writes,count);
 // Same-field conflicts remain durable, without a retry on every poll.
 mode='ok';s.retryAt=0;s.base=D.copy(row);s.version=version;s.data=D.copy(row);s.dirty=false;s.outbox=[];s.change(d=>d.buckets[0].text='local','me');row.buckets[0].text='remote';version++;await s.refresh();const first=messages.length;await s.refresh();await s.refresh();assert.equal(messages.length,first);assert(s.dirty);assert.equal(s.data.buckets[0].text,'local');
 s.close();reopened.close();console.log('PASS: lost response acknowledgement, reopen acknowledgement, retry backoff and durable conflict without repeated status');
})().catch(e=>{console.error(e);process.exitCode=1;});
