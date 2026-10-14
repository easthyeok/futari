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
  let networkCalls=0, claimed=false;
  const caches = {
    open:async name=>{
      if (!stores.has(name)) stores.set(name,new Map());
      const values=stores.get(name);
      return {addAll:async urls=>{for(const url of urls){
        const relative = new URL(url).pathname.slice(new URL(base).pathname.length);
        assert(fs.existsSync(path.join(root,relative)), `missing shell asset: ${relative}`);
        values.set(url, {asset:relative});
      }}, match:async key=>values.get(key)};
    }, keys:async()=>Array.from(stores.keys()), delete:async key=>stores.delete(key)
  };
  const ctx = {URL, caches, self:{location:{href:new URL('sw.js',base).href}, clients:{claim:async()=>{claimed=true;}}, addEventListener:(type,fn)=>handlers[type]=fn}, fetch:()=>{networkCalls++; return Promise.reject(new Error('offline'));}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),ctx);
  let pending; handlers.install({waitUntil:p=>pending=p}); await pending;
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
  assert.equal(networkCalls,0, 'offline shell should not need the network');
  for(const key of stores.get(prefix + 'v2').keys()) assert(!new URL(key).search,'room links must not enter cache');
  const start=new URL(manifest.start_url,new URL('manifest.webmanifest',base));
  assert.equal(start.href,base); assert.equal(new URL(manifest.scope,base).href,base);
}
async function installUI() {
  const handlers={}, elements={
    'pwa-install':{hidden:true}, 'pwa-install-button':{addEventListener:(type,fn)=>handlers.click=fn}, 'pwa-install-message':{}
  };
  let registration, prompts=0;
  const navigator={serviceWorker:{register:async(url,options)=>{registration={url,options};}}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'pwa.js'),'utf8'),{
    document:{getElementById:id=>elements[id]},navigator,console,
    window:{navigator,isSecureContext:true,matchMedia:()=>({matches:false}),addEventListener:(type,fn)=>handlers[type]=fn}
  });
  handlers.load(); await Promise.resolve(); assert.equal(registration.url,'./sw.js'); assert.equal(registration.options.scope,'./');
  let prevented=false;
  handlers.beforeinstallprompt({preventDefault:()=>prevented=true,prompt:async()=>{prompts++;},userChoice:Promise.resolve({outcome:'accepted'})});
  assert(prevented); assert.equal(elements['pwa-install'].hidden,false); assert.equal(prompts,0,'installation needs a user click');
  handlers.click(); await new Promise(resolve=>setImmediate(resolve)); assert.equal(prompts,1); assert.equal(elements['pwa-install'].hidden,true);
  handlers.appinstalled(); assert.equal(elements['pwa-install'].hidden,true);
}
(async()=>{
  await worker('https://example.com/'); await worker('https://example.com/futari/'); await installUI();
  console.log('PASS: manifest/icon dimensions, root/subpath scopes, offline shell and invite links, API exclusion, cache lifecycle, user-triggered installation');
})().catch(error=>{console.error(error);process.exitCode=1;});
