const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const names=['futari-shell-v1','futari-shell-%2Ffutari%2F-v3','another-app','futari-shell-%2Fother%2F-v4'];
const stores=new Map(names.map(name=>[name,new Map([['old','preserve']])]));
const storage=new Map([['futari_room_code','room'],['futari_identity_room','me'],['futari_cache_room',JSON.stringify({pending:false,data:{memories:['our memory']}})]]);
const initialStorage=JSON.stringify([...storage]);let fetches=0,puts=0,fail=false,oldBuild=false;
const elements={recover:{addEventListener(){}},status:{},'open-app':{hidden:true}};
const context={URL,console,window:{location:{href:'https://example.com/futari/recover.html'}},document:{getElementById:id=>elements[id]},localStorage:{getItem:key=>storage.get(key)||null},caches:{keys:async()=>[...stores.keys()],open:async name=>{if(!stores.has(name))stores.set(name,new Map());return{put:async(key,response)=>{puts++;stores.get(name).set(key,await response.text());}};}},fetch:async(url,options)=>{
 fetches++;assert.equal(options.cache,'no-store');assert(new URL(url).searchParams.has('futari_recovery'),'fresh files must bypass old worker cache keys');
 const file=new URL(url).pathname.split('/').pop();
 if(fail&&file==='board-games.js')return new Response('missing',{status:404});
 return new Response(file==='index.html'&&!oldBuild?'<meta name="futari-build" content="test">':'fresh:'+file,{headers:{'content-type':file.endsWith('.html')?'text/html':'application/octet-stream'}});
}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../recovery.js'),'utf8'),context);
(async()=>{
 const api=context.window.FutariRecovery;
 assert(api.belongsToApp(names[0]));assert(api.belongsToApp(names[1]));assert(!api.belongsToApp(names[2]));assert(!api.belongsToApp(names[3]));
 storage.set('futari_cache_room',JSON.stringify({pending:true}));await assert.rejects(api.recover(),/저장/);assert.equal(fetches,0);assert.equal(puts,0);
 storage.set('futari_cache_room',JSON.parse(initialStorage).find(([key])=>key==='futari_cache_room')[1]);
 fail=true;await assert.rejects(api.recover(),/배포된 파일/);assert.equal(puts,0);assert.equal(stores.get(names[0]).get('old'),'preserve');
 fail=false;oldBuild=true;await assert.rejects(api.recover(),/최신 버전/);assert.equal(puts,0);
 oldBuild=false;await api.recover();assert(puts>0);
 for(const name of names.slice(0,2))assert(stores.get(name).get('https://example.com/futari/board-games.js').startsWith('fresh:'));
 assert.equal(stores.get(names[2]).size,1);assert.equal(stores.get(names[3]).size,1);
 assert.equal(JSON.stringify([...storage]),initialStorage,'room, identity and game records must not change');
 for(const store of stores.values())for(const key of store.keys())assert(!key.includes('futari_recovery'),'only canonical URLs enter app caches');
 console.log('PASS: stale-worker bypass, pending-write guard, failed/old deployments preserve caches, old/new shell repair, unrelated cache isolation, room/data preservation');
})().catch(error=>{console.error(error);process.exitCode=1;});
