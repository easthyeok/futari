const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
let slots=[],cursor=0,effects=[],seq=0,network=0;
const React={
 createElement:(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity).filter(x=>x!==null&&x!==undefined&&x!==false)}),
 useState(init){const i=cursor++;if(!(i in slots))slots[i]=typeof init==='function'?init():init;return[slots[i],value=>slots[i]=typeof value==='function'?value(slots[i]):value];},
 useRef(init){const i=cursor++;if(!(i in slots))slots[i]={current:init};return slots[i];},
 useEffect(fn,deps){const i=cursor++;if(!(i in slots)||deps.some((x,j)=>x!==slots[i][j])){slots[i]=deps;effects.push(fn);}}
};
const c={window:{React,FUTARI_CONFIG:{FOOD_AI_ENABLED:true},FutariActivity:{id:()=> 'menu-'+(++seq)},sessionStorage:{getItem(){throw Error('no storage');}}},fetch(){network++;throw Error('offline');},console};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../food.js'),'utf8'),c);const F=c.window.FutariFood;
assert.equal(F.menus.length,364);assert.equal(new Set(F.menus.map(x=>x.name)).size,F.menus.length);assert.equal(F.categories.length,14);
assert(F.menus.every(x=>typeof x.description==='string'&&x.description.trim().length>=15&&F.categories.includes(x.category)));
assert.equal(new Set(F.menus.map(x=>x.description)).size,F.menus.length,'every menu has its own description');
assert(F.menus.find(x=>x.name==='떡볶이').description.includes('당면'));assert(F.menus.find(x=>x.name==='샤브샤브').description.includes('등촌'));
for(const category of F.categories){const pool=F.foodPool({},{category});assert.equal(pool.length,26);assert(pool.every(x=>x.category===category));}
assert(F.foodPool({},{query:'로제 떡볶이'}).some(x=>x.name==='로제떡볶이'));assert(F.foodPool({},{query:'치즈'}).length>10);assert.equal(F.foodPool({},{query:'no-such-food'}).length,0);
let state={},names=[];for(let i=0;i<F.menus.length;i++)names.push(F.draw(F.menus,state,1)[0].name);assert.equal(new Set(names).size,F.menus.length,'entire deck is consumed before repeats');
state={};let previous=[];for(let i=0;i<150;i++){const next=F.draw(F.menus,state,6);assert.equal(next.length,6);assert.equal(new Set(next.map(x=>x.name)).size,6);if(state.remaining.length>6)assert(next.every(x=>!previous.includes(x.name)));previous=next.map(x=>x.name);}
assert.equal(F.draw([],{},6).length,0);assert.equal(F.draw(F.menus.slice(0,2),{},6).length,2);
const recent=F.menus.slice(0,15).map((x,i)=>({id:'r'+i,name:x.name,done:true,eatenAt:new Date(2026,0,i+1).toISOString()}));
const available=F.foodPool({foodWishes:recent},{skipRecent:true});assert.equal(available.length,364-12);assert(available.some(x=>x.name===recent[0].name));assert(!available.some(x=>x.name===recent[14].name));assert.equal(F.foodPool({foodWishes:recent},{skipRecent:false}).length,364);
const fixed={foodWishes:F.menus.slice(0,3).map((x,i)=>({id:'w'+i,name:x.name,done:false}))};assert.equal(F.foodPool(fixed,{}).length,364,'saved wishes do not shrink the full menu pool');
let data={foodWishes:[{id:'legacy',name:'예전에 저장한 음식',description:'예전에 저장한 긴 설명',done:false}],buckets:[]},props={data,room:'room',update:fn=>fn(data)};
function render(){cursor=0;const tree=F.Planner(props);effects.splice(0).forEach(fn=>fn());return tree;}
function all(n,p){if(!n||typeof n!=='object')return[];return(p(n)?[n]:[]).concat(...n.children.map(x=>all(x,p)));}
function text(n){return n&&typeof n==='object'?n.children.map(text).join(''):String(n??'');}
function button(tree,label){const b=all(tree,x=>x.type==='button'&&text(x)===label)[0];assert(b,'button '+label);return b;}
let tree=render();const original=JSON.stringify(data);
assert.equal(text(tree),'오늘 뭐 먹지?');assert.equal(all(tree,x=>x.type==='button').length,1);assert.equal(all(tree,x=>x.type==='section').length,0);assert.equal(button(tree,'오늘 뭐 먹지?').props['aria-expanded'],false);assert.equal(JSON.stringify(data),original,'loading the home page must not modify saved records');
button(tree,'오늘 뭐 먹지?').props.onClick();tree=render();assert.equal(all(tree,x=>x.type==='h2').length,1);assert.equal(all(tree,x=>x.type==='p').length,1);assert.equal(all(tree,x=>x.type==='button').length,3);assert.equal(button(tree,'오늘 뭐 먹지?').props['aria-expanded'],true);
assert.equal(all(tree,x=>['input','select','form','details'].includes(x.type)).length,0);assert(!text(tree).includes('전체 메뉴'));assert(!text(tree).includes('먹고 싶은 메뉴'));assert(!text(tree).includes('예전에 저장한 긴 설명'));assert(!text(tree).includes('데이트'));
const first=text(all(tree,x=>x.type==='h2')[0]);button(tree,'다른 메뉴').props.onClick();tree=render();const chosen=text(all(tree,x=>x.type==='h2')[0]);assert.notEqual(chosen,first);assert.equal(all(tree,x=>x.type==='h2').length,1);
const save=button(tree,'다음에 먹자');save.props.onClick();save.props.onClick();tree=render();assert.equal(data.foodWishes.length,2);assert.equal(data.foodWishes[1].name,chosen);assert(data.foodWishes[1].description);assert(!data.foodWishes[1].preparation);assert(button(tree,'저장했어요').props.disabled);assert.equal(text(all(tree,x=>x.type==='h2')[0]),chosen,'saving does not replace the selected menu');assert.equal(data.foodWishes[0].name,'예전에 저장한 음식');
button(tree,'오늘 뭐 먹지?').props.onClick();tree=render();assert.equal(text(tree),'오늘 뭐 먹지?');button(tree,'오늘 뭐 먹지?').props.onClick();tree=render();assert.notEqual(text(all(tree,x=>x.type==='h2')[0]),chosen,'reopening continues the shuffled deck');
let focus=0;button(tree,'오늘 뭐 먹지?').props.ref.current={focus(){focus++;}};tree.props.onKeyDown({key:'Escape'});tree=render();assert.equal(text(tree),'오늘 뭐 먹지?');assert.equal(focus,1);
assert.equal(F.shortDescription({description:'가'.repeat(200)}).length,72);assert.equal(Array.from(F.shortDescription({description:'🍜'.repeat(100)})).length,72);assert(F.shortDescription({description:'짧은 설명'})==='짧은 설명');
// Another room cannot inherit an open suggestion or the previous room's deck.
button(tree,'오늘 뭐 먹지?').props.onClick();tree=render();props={...props,room:'other',data:{foodWishes:[],buckets:[]},update(){}};tree=render();assert.equal(text(tree),'오늘 뭐 먹지?');button(tree,'오늘 뭐 먹지?').props.onClick();tree=render();assert.equal(all(tree,x=>x.type==='h2').length,1);
assert.equal(network,0,'opening, cycling and saving never call AI');
console.log('PASS: 364 described candidates, complete shuffle, recent exclusions, button-only home, one concise suggestion, duplicate-safe save, close/Escape, room isolation and no network');
