const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
let slots=[],cursor=0;const React={createElement:(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity).filter(v=>v!==null&&v!==false&&v!==undefined)}),useState:init=>{const i=cursor++;if(!(i in slots))slots[i]=init;return [slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v];},useEffect(){}};
const c={window:{React}};for(const f of ['data','home','farm','activity','creatures'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../'+f+'.js'),'utf8'),c);
const C=c.window.FutariCreatures,D=c.window.FutariData,A=c.window.FutariActivity;
let d=D.migrate({memories:[{id:'old',photo:'keep'}],house:{owned:['lamp']},farm:{harvestCoins:100}});
assert(!C.hatch(d,'missing','2026-10-15'));assert(!C.hatch(d,'dream','2026-10-15'));assert(C.hatch(d,'leaf','2026-10-15'));
let p=C.pet(d);assert.equal(C.stage(d,p),0);assert(!C.hatch(d,'water','2026-10-15'));assert(!C.care(d,p.id,'intruder','food','berry','2026-10-15'));assert(!C.care(d,p.id,'me','food','bad','2026-10-15'));
assert(C.care(d,p.id,'me','food','berry','2026-10-15'));assert.equal(C.xp(d,p),4);assert(!C.care(d,p.id,'me','food','milk','2026-10-15'));assert.equal(C.xp(d,p),4);
// Each member's care merges from the same base, including newly created day objects.
let base=D.copy(d),l=D.copy(d),r=D.copy(d);C.care(l,p.id,'me','play',true,'2026-10-15');C.care(r,p.id,'you','food','milk','2026-10-15');
d=D.reconcile(base,l,r);p=C.pet(d);assert.equal(C.xp(d,p),12);assert.equal(C.stage(d,p),1);
base=D.copy(d);l=D.copy(d);r=D.copy(d);C.care(l,p.id,'me','play',true,'2026-10-16');C.care(r,p.id,'you','food','berry','2026-10-16');d=D.apply(r,D.diff(base,l));p=C.pet(d);assert.equal(C.xp(d,p),21);
let tx={id:'care-tx',ops:D.diff(base,l)};d.commits[tx.id]=true;assert(D.same(D.replay(d,[tx]),d),'committed care is never replayed');
function grow(data,key){let a=C.pet(data);for(let i=17;C.stage(data,a)<3&&i<29;i++){const day='2026-10-'+i;for(const w of ['me','you']){C.care(data,a.id,w,'food','berry',day);C.care(data,a.id,w,'play',true,day);}}assert.equal(C.stage(data,a),3);return a;}
let first=grow(d);assert.equal(C.name(d,first),'꽃숲지기');assert(!C.care(d,first.id,'me','food','milk','2026-11-01'));assert(C.hatch(d,'water','2026-11-01'));let second=grow(d);assert.equal(C.recipe(d,first.id,first.id),null);assert.equal(C.recipe(d,first.id,second.id),'lotus');assert(!C.hatch(d,'lotus','2026-11-02',['bad',second.id]));assert(C.hatch(d,'lotus','2026-11-02',[first.id,second.id]));assert.equal(C.grown(d).length,2,'parents remain');assert.equal(d.memories[0].photo,'keep');assert.equal(d.house.owned[0],'lamp');
let hidden=grow(d);assert(!C.dress(d,hidden.id,'wizard'));assert(C.dress(d,hidden.id,'crown'));assert.equal(hidden.outfit,'crown');
assert(C.hatch(d,'star','2026-11-03'));let star=grow(d);assert.equal(C.recipe(d,second.id,star.id),'aurora');assert.equal(C.recipe(d,first.id,star.id),'sun');assert(C.hatch(d,'aurora','2026-11-04',[second.id,star.id]));let aurora=grow(d);assert.equal(C.recipe(d,aurora.id,hidden.id),'dream');assert(C.hatch(d,'dream','2026-11-05',[aurora.id,hidden.id]));assert(C.dress(d,C.pet(d).id,'wizard'));
// Same-day feelings only credit a creature whose care ledger contains a visit.
let fresh=D.migrate({together:{'2026-10-15':{moods:{me:'😊'},notes:{me:'hello'}}}});C.hatch(fresh,'water','2026-10-15');let fp=C.pet(fresh);assert.equal(C.xp(fresh,fp),0);C.care(fresh,fp.id,'me','visit',true,'2026-10-15');assert.equal(C.xp(fresh,fp),5);
let before=D.copy(fresh);C.care(fresh,fp.id,'you','food','milk','2026-10-15');A.capture(before,fresh,'you','test');assert(A.unread(fresh,'me').some(e=>e.type==='creature'));assert(!A.unread(fresh,'you').length);
function render(tabData,reset=false){if(reset)slots=[];cursor=0;return C.Page({data:tabData,member:'me',update:f=>f(tabData),navigate(){}});}
function text(n){return n&&typeof n==='object'?n.children.map(text).join(''):String(n??'');}function all(n,p){return !n||typeof n!=='object'?[]:(p(n)?[n]:[]).concat(...n.children.map(x=>all(x,p)));}
let screen=render(fresh,true);assert(text(screen).includes('우리의 작은 생명'));assert(!text(screen).includes('우리 마을'));
let play=all(screen,x=>x.type==='button'&&text(x).includes('같이 놀기'))[0];play.props.onClick();assert(C.pet(fresh).care['2026-10-15'].me.play);screen=render(fresh);assert(all(screen,x=>x.type==='button'&&text(x).includes('같이 놀기'))[0].props.disabled);
all(screen,x=>x.type==='button'&&text(x)==='옷장')[0].props.onClick();screen=render(fresh);all(screen,x=>x.type==='button'&&text(x).includes('분홍 리본'))[0].props.onClick();assert.equal(C.pet(fresh).outfit,'ribbon');
assert(C.Creature({data:fresh,pet:C.pet(fresh)}));assert(D.same(D.migrate(JSON.parse(JSON.stringify(d))).creatures,d.creatures));
console.log('PASS: care limits, shared merge/replay, all growth stages, branched evolution, repeat eggs, hidden recipes through dream, retained parents, clothes, mood credit, notifications, UI interactions and restore');
