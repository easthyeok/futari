const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../pwa.js'),'utf8');
const iPhone='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';
const iPad='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15';
function setup({ua=iPhone,platform='iPhone',touch=5,standalone=false,media=false,session=new Map(),storageFails=false}={}){
 const handlers={},events={},els={},doc={activeElement:null,getElementById:id=>els[id],addEventListener(){}},storage={getItem:k=>{if(storageFails)throw Error('blocked');return session.get(k)||null;},setItem:(k,v)=>{if(storageFails)throw Error('blocked');session.set(k,v);}};
 for(const id of ['pwa-install','pwa-install-button','pwa-install-message','pwa-install-guide','pwa-install-guide-close','pwa-install-guide-done','pwa-install-guide-steps','pwa-install-guide-note','pwa-update','pwa-update-button','pwa-update-message']){
  events[id]={};els[id]={hidden:['pwa-install','pwa-install-guide','pwa-update'].includes(id),textContent:'',innerHTML:'',addEventListener:(type,f)=>events[id][type]=f,focus(){doc.activeElement=els[id];}};
 }
 const navigator={userAgent:ua,platform,maxTouchPoints:touch,standalone};let installed=media;const mq={get matches(){return installed;},addEventListener:(type,f)=>handlers.displayMode=f};
 vm.runInNewContext(source,{window:{navigator,matchMedia:()=>mq,addEventListener:(t,f)=>handlers[t]=f},navigator,document:doc,sessionStorage:storage,localStorage:{getItem:()=>null},console});
 return{handlers,events,els,doc,setInstalled:v=>installed=v,session};
}
let ui=setup();assert(!ui.els['pwa-install'].hidden);assert(!ui.els['pwa-install-guide'].hidden,'iPhone Safari shows a guide without beforeinstallprompt');assert.equal(ui.els['pwa-install-button'].textContent,'앱 설치 안내');assert.equal(ui.doc.activeElement,ui.els['pwa-install-guide-close']);
let prevented=0;ui.events['pwa-install-guide'].keydown({key:'Tab',shiftKey:true,preventDefault(){prevented++;}});assert.equal(ui.doc.activeElement,ui.els['pwa-install-guide-done']);ui.events['pwa-install-guide'].keydown({key:'Tab',shiftKey:false,preventDefault(){prevented++;}});assert.equal(ui.doc.activeElement,ui.els['pwa-install-guide-close']);assert.equal(prevented,2,'keyboard focus stays in dialog');
ui.events['pwa-install-guide'].keydown({key:'Escape',preventDefault(){}});assert(ui.els['pwa-install-guide'].hidden);assert.equal(ui.session.get('futari_install_guide_dismissed'),'yes');
const next=setup({session:ui.session});assert(next.els['pwa-install-guide'].hidden,'dismissed guide stays hidden on reload');next.els['pwa-install-button'].focus();next.events['pwa-install-button'].click();assert(!next.els['pwa-install-guide'].hidden,'banner can reopen guide');next.events['pwa-install-guide'].click({target:next.els['pwa-install-guide']});assert(next.els['pwa-install-guide'].hidden);assert.equal(next.doc.activeElement,next.els['pwa-install-button'],'closing restores focus');
ui=setup({ua:iPad,platform:'MacIntel'});assert(!ui.els['pwa-install-guide'].hidden,'desktop-mode iPad is detected');assert(!ui.els['pwa-install-guide-steps'].innerHTML.includes('Dock'));
ui=setup({ua:iPad,platform:'MacIntel',touch:0});assert(!ui.els['pwa-install-guide'].hidden);assert(ui.els['pwa-install-guide-steps'].innerHTML.includes('Dock에 추가'),'Mac gets Dock instructions');
for(const opts of [{standalone:true},{media:true}]){ui=setup(opts);assert(ui.els['pwa-install'].hidden);assert(ui.els['pwa-install-guide'].hidden);ui.events['pwa-install-button'].click();assert(ui.els['pwa-install-guide'].hidden);}
ui=setup({storageFails:true});ui.events['pwa-install-guide-close'].click();assert(ui.els['pwa-install-guide'].hidden,'blocked storage does not break dismissal');
ui=setup({ua:iPhone.replace('Version/18.0','CriOS/130.0')});assert(!ui.els['pwa-install'].hidden);assert(ui.els['pwa-install-guide'].hidden,'iOS Chrome gets manual banner without automatic Safari popup');assert(ui.els['pwa-install-guide-note'].textContent.includes('Safari'));
ui=setup({ua:'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0 Safari/537.36',platform:'Win32',touch:0});assert(ui.els['pwa-install'].hidden);assert(ui.els['pwa-install-guide'].hidden,'desktop Chrome keeps native install flow');
ui=setup();ui.setInstalled(true);ui.handlers.displayMode();assert(ui.els['pwa-install'].hidden);assert(ui.els['pwa-install-guide'].hidden,'switching to standalone closes guide');
console.log('PASS: Safari automatic guide, iPad desktop mode, Mac Dock, standalone suppression, session dismissal/reopen, focus trap/Escape/backdrop, private storage, iOS Chrome fallback, desktop Chrome native flow');
