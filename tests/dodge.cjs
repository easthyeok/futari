const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
let slots=[],cursor=0,effects=[],frames=new Map(),frameId=0,listeners={},cleanup;
const ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}})}, {get:(o,k)=>o[k]||(()=>{})});
const surface={width:0,height:0,getContext:()=>ctx};
const React={createElement:(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity).filter(x=>x!==null&&x!==false&&x!==undefined)}),useState:init=>{const i=cursor++;if(!(i in slots))slots[i]=init;return[slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v];},useRef:init=>{const i=cursor++;if(!(i in slots))slots[i]={current:init};return slots[i];},useEffect:(f,deps)=>{const i=cursor++;if(!(i in slots)){slots[i]=true;effects.push(f);}}};
const context={window:{React,devicePixelRatio:2,requestAnimationFrame:f=>{frames.set(++frameId,f);return frameId;},cancelAnimationFrame:id=>frames.delete(id),addEventListener:(k,f)=>listeners[k]=f,removeEventListener:k=>delete listeners[k]},document:{hidden:false,addEventListener:(k,f)=>listeners[k]=f,removeEventListener:k=>delete listeners[k]},console};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dodge.js'),'utf8'),context);const api=context.window.FutariDodge;
let a=api.create(api.hash('2026-10-14')),b=api.create(api.hash('2026-10-14'));
for(let i=0;i<300;i++){api.step(a,{});api.step(b,{});}assert.equal(JSON.stringify(a),JSON.stringify(b),'same seed and input give identical simulation');assert(a.bullets.length>0);assert.equal(a.t,2.5);
let other=api.create(api.hash('2026-10-15'));for(let i=0;i<300;i++)api.step(other,{});assert.notEqual(JSON.stringify(a.bullets),JSON.stringify(other.bullets));
let hit=api.create(1);hit.bullets=[{x:hit.x-30,y:hit.y,vx:7200,vy:0,r:3.2}];api.step(hit,{});assert(hit.dead,'fast crossing bullets cannot tunnel through player');let t=hit.t;api.step(hit,{});assert.equal(hit.t,t,'finished game cannot accrue time');
let graze=api.create(1);graze.bullets=[{x:graze.x-1,y:graze.y+12,vx:0,vy:0,r:3.2}];api.step(graze,{});api.step(graze,{});assert.equal(graze.near,1);assert(!graze.dead);
let m=api.create(1);for(let i=0;i<120;i++)api.step(m,{right:true,up:true});assert(m.x<=350&&m.y>=10);let focus=api.create(1);api.step(focus,{left:true,focus:true});assert(focus.x<180&&focus.x>178);
let target=api.create(1);api.step(target,{target:{x:target.x+1,y:target.y}});assert.equal(target.x,181,'touch stops at target without overshoot');
let marathon=api.create(1),maxBullets=0;for(let i=0;i<10800;i++){marathon.dead=false;api.step(marathon,{right:i%100<50,left:i%100>=50});maxBullets=Math.max(maxBullets,marathon.bullets.length);}assert(marathon.clear);assert.equal(marathon.t,90);assert(maxBullets<400,'offscreen bullets are culled');
api.draw(ctx,marathon,90,'playing');
let data={settings:{me:'A',you:'B'}};
assert(api.reserve(data,'day','me','one'));assert(!api.reserve(data,'day','me','one'));assert(!api.reserve(data,'day','no','bad'));
assert(api.finish(data,'day','me','one',12.345,3,'hit'));assert.equal(api.runs(data,'day','me')[0].seconds,12.34);assert(!api.finish(data,'day','me','one',90,3,'hit'),'finish idempotence');
assert(api.reserve(data,'day','me','two'));assert(api.reserve(data,'day','me','three'));assert(!api.reserve(data,'day','me','four'));assert(!api.finish(data,'day','me','two',NaN,0,'hit'));assert(!api.finish(data,'day','me','two',91,0,'hit'));assert(api.reserve(data,'day','you','four'));assert(api.reserve(data,'next','me','next'));assert.equal(api.best(api.runs(JSON.parse(JSON.stringify(data)),'day','me')),12.34);
function all(n,p){if(!n||typeof n!=='object')return[];return(p(n)?[n]:[]).concat(...n.children.map(x=>all(x,p)));}
function text(n){return n&&typeof n==='object'?n.children.map(text).join(''):String(n??'');}
function button(n,label){const v=all(n,x=>x.type==='button'&&text(x)===label)[0];assert(v,'button '+label);return v;}
let room={settings:{me:'A',you:'B'}},props={data:room,member:'me',updateGame:f=>f(room)};
function render(){cursor=0;const tree=api.DodgePage(props);const cv=all(tree,x=>x.type==='canvas')[0];cv.props.ref.current=surface;for(const e of effects.splice(0))cleanup=e();return tree;}
function frame(time){const fs=[...frames.values()];frames.clear();fs.forEach(f=>f(time));}
let tree=render();assert.equal(surface.width,720);assert.equal(surface.height,960);button(tree,'연습 시작').props.onClick();
frame(0);for(let i=1;i<=31;i++)frame(i*100);tree=render();assert(button(tree,'일시정지'));
listeners.keydown({key:'ArrowLeft',type:'keydown',preventDefault(){}});frame(3200);listeners.keyup({key:'ArrowLeft',type:'keyup',preventDefault(){}});
const canvas=all(tree,x=>x.type==='canvas')[0],el={getBoundingClientRect:()=>({width:180,height:240}),setPointerCapture(){}};
canvas.props.onPointerDown({pointerId:1,clientX:40,clientY:50,currentTarget:el,preventDefault(){}});canvas.props.onPointerMove({pointerId:1,clientX:50,clientY:60,preventDefault(){}});frame(3300);canvas.props.onPointerCancel({pointerId:1});
button(tree,'일시정지').props.onClick();tree=render();assert(text(tree).includes('잠깐 숨 고르기'));button(tree,'계속하기').props.onClick();
context.document.hidden=true;listeners.visibilitychange();tree=render();assert(text(tree).includes('잠깐 숨 고르기'));assert.equal(api.runs(room,api.day(),'me').length,0,'practice consumes no official attempts');
cleanup();assert.equal(frames.size,0);
// Mount official mode separately, double-start guard, background completion and reload.
slots=[];frames.clear();effects=[];tree=render();button(tree,'실전 도전 · 3회 남음').props.onClick();button(tree,'실전 도전 · 3회 남음').props.onClick();assert.equal(api.runs(room,api.day(),'me').length,1);
frame(0);listeners.visibilitychange();tree=render();assert(text(tree).includes('도전을 마쳤어요'));assert.equal(api.runs(room,api.day(),'me')[0].status,'finished');cleanup();
api.reserve(room,api.day(),'me','crashed');slots=[];tree=render();assert.equal(api.runs(room,api.day(),'me')[1].status,'finished','reload closes abandoned reservation');cleanup();
console.log('PASS: seeded patterns, swept hitbox, unique grazes, movement/clamping, 90s limit/culling, canvas render, records/attempt limits, mobile drag/cancel, keyboard, practice pause, RAF cleanup, official double-start/away/reload');
