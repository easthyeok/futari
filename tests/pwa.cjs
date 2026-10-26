const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
assert(manifest.name && manifest.short_name);
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.prefer_related_applications, false);
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(html.includes('rel="manifest" href="./manifest.webmanifest"'));
assert(html.includes('src="pwa.js"'));
for (const size of [192,512]) {
  const icon = manifest.icons.find(i=>i.sizes===`${size}x${size}` && i.purpose==='any');
  assert(icon); const png = fs.readFileSync(path.join(root, icon.src));
  assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.equal(png.readUInt32BE(16),size); assert.equal(png.readUInt32BE(20),size);
}
assert(manifest.icons.some(i=>i.purpose==='maskable'));
async function worker(base) {
  const prefix = 'futari-shell-' + encodeURIComponent(new URL(base).pathname) + '-';
  const handlers = {}, stores = new Map([['unrelated-cache',new Map()], ['futari-shell-other-app-v1',new Map()], [prefix + 'old',new Map()]]);
  let networkCalls=0, claimed=false, activations=0, offline=true;
  const caches = {
    open:async name=>{
      if (!stores.has(name)) stores.set(name,new Map());
      const values=stores.get(name);
      return {addAll:async urls=>{for(let url of urls){
        url = typeof url === 'string' ? url : url.url;
        const relative = new URL(url).pathname.slice(new URL(base).pathname.length);
        assert(fs.existsSync(path.join(root,relative)), `missing shell asset: ${relative}`);
        values.set(url, {asset:relative});
      }}, match:async key=>values.get(key), put:async(key,response)=>values.set(key,response)};
    }, keys:async()=>Array.from(stores.keys()), delete:async key=>stores.delete(key)
  };
  const ctx = {URL, Request, AbortController, setTimeout, clearTimeout, caches, self:{location:{href:new URL('sw.js',base).href}, clients:{claim:async()=>{claimed=true;}}, skipWaiting:async()=>{activations++;}, addEventListener:(type,fn)=>handlers[type]=fn}, fetch:(request,options)=>{networkCalls++;assert.equal(options.cache,'no-cache');return offline ? Promise.reject(new Error('offline')) : Promise.resolve({ok:true,asset:'fresh',clone(){return this;}});}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),ctx);
  let pending; handlers.install({waitUntil:p=>pending=p}); await pending;
  assert.equal(activations,0,'updates must not force activation during install');
  handlers.message({data:{type:'IGNORE'},waitUntil:p=>pending=p});assert.equal(activations,0);
  handlers.message({data:{type:'ACTIVATE_UPDATE'},waitUntil:p=>pending=p});await pending;assert.equal(activations,1);
  handlers.activate({waitUntil:p=>pending=p}); await pending;
  assert(claimed); assert(stores.has('unrelated-cache')); assert(!stores.has(prefix + 'old')); assert(stores.has('futari-shell-other-app-v1')); 
  const trigger=request=>{let result; handlers.fetch({request,respondWith:p=>result=p});return result;};
  for(const suffix of ['', '?room=private', 'index.html?room=private']) {
    const response=await trigger({url:new URL(suffix,base).href,method:'GET',mode:'navigate'});
    assert.equal(response.asset,'index.html');
  }
  assert.equal((await trigger({url:new URL('home.js',base).href,method:'GET',mode:'cors'})).asset,'home.js');
  assert.equal(trigger({url:'https://example.supabase.co/rest/v1/rooms',method:'GET',mode:'cors'}),undefined);
  assert.equal(trigger({url:new URL('app.js',base).href,method:'POST',mode:'cors'}),undefined);
  assert.equal(trigger({url:new URL('unknown',base).href,method:'GET',mode:'navigate'}),undefined);
  assert.equal(networkCalls,4, 'failed online checks must fall back to cached shell');
  offline=false;assert.equal((await trigger({url:new URL('home.js',base).href,method:'GET',mode:'cors'})).asset,'fresh');
  offline=true;assert.equal((await trigger({url:new URL('home.js',base).href,method:'GET',mode:'cors'})).asset,'fresh','offline fallback must retain the latest online file');
  for(const key of stores.get(prefix + 'v24').keys()) assert(!new URL(key).search,'room links must not enter cache');
  const start=new URL(manifest.start_url,new URL('manifest.webmanifest',base));
  assert.equal(start.href,base); assert.equal(new URL(manifest.scope,base).href,base);
}
async function installUI() {
  const handlers={}, elements={
    'pwa-install':{hidden:true}, 'pwa-install-button':{addEventListener:(type,fn)=>handlers.click=fn}, 'pwa-install-message':{}, 'pwa-update':{hidden:true}, 'pwa-update-button':{addEventListener:(type,fn)=>handlers.updateClick=fn}, 'pwa-update-message':{}
  };
  let registration, prompts=0;
  const navigator={onLine:true,serviceWorker:{addEventListener:(type,fn)=>handlers[type]=fn,register:async(url,options)=>{registration={url,options};return {addEventListener(){},waiting:null};}}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'pwa.js'),'utf8'),{
    document:{getElementById:id=>elements[id],addEventListener(){}},navigator,console,localStorage:{getItem:()=>null},
    window:{navigator,isSecureContext:true,matchMedia:()=>({matches:false}),addEventListener:(type,fn)=>handlers[type]=fn}
  });
  handlers.load(); await Promise.resolve(); assert.equal(registration.url,'./sw.js'); assert.equal(registration.options.scope,'./');
  let prevented=false;
  handlers.beforeinstallprompt({preventDefault:()=>prevented=true,prompt:async()=>{prompts++;},userChoice:Promise.resolve({outcome:'accepted'})});
  assert(prevented); assert.equal(elements['pwa-install'].hidden,false); assert.equal(prompts,0,'installation needs a user click');
  handlers.click(); await new Promise(resolve=>setImmediate(resolve)); assert.equal(prompts,1); assert.equal(elements['pwa-install'].hidden,true);
  handlers.appinstalled(); assert.equal(elements['pwa-install'].hidden,true);
}
async function updateUI() {
  const listeners={}, clicks={}, elements={};
  for(const name of ['pwa-install','pwa-install-button','pwa-install-message','pwa-update','pwa-update-button','pwa-update-message']) elements[name]={hidden:true,addEventListener:(type,fn)=>clicks[name]=fn};
  let pending=true, messages=[], reloads=0, checks=0, consent=false;
  const reg={waiting:{postMessage:m=>messages.push(m)},addEventListener(){},update:async()=>{checks++;}};
  const navigator={onLine:true,serviceWorker:{addEventListener:(type,fn)=>listeners[type]=fn,register:async()=>reg}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'pwa.js'),'utf8'),{
    document:{getElementById:id=>elements[id],addEventListener(){}},console,navigator,
    localStorage:{getItem:key=>key==='futari_room_code'?'test':JSON.stringify({pending})},
    window:{navigator,isSecureContext:true,confirm:()=>consent,location:{reload:()=>reloads++},matchMedia:()=>({matches:false}),addEventListener:(type,fn)=>listeners[type]=fn}
  });
  listeners.load();await new Promise(resolve=>setImmediate(resolve));assert.equal(elements['pwa-update'].hidden,false);
  listeners.controllerchange();assert.equal(reloads,0,'first activation or another tab update must not reload');
  clicks['pwa-update-button']();assert.equal(messages.length,0,'unsaved edits block update');
  pending=false;clicks['pwa-update-button']();assert.equal(messages.length,0,'declined confirmation must not apply update');
  consent=true;clicks['pwa-update-button']();clicks['pwa-update-button']();assert.equal(messages.length,1);assert.equal(messages[0].type,'ACTIVATE_UPDATE');
  listeners.controllerchange();listeners.controllerchange();assert.equal(reloads,1);
  listeners.focus();await Promise.resolve();assert.equal(checks,1);
}
(async()=>{
  await worker('https://example.com/'); await worker('https://example.com/futari/'); await installUI(); await updateUI();
  console.log('PASS: manifest/icon dimensions, root/subpath scopes, offline shell and invite links, API exclusion, cache lifecycle, user-triggered installation, pending-edit/consent update guards');
})().catch(error=>{console.error(error);process.exitCode=1;});
