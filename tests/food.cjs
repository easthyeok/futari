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
let data={foodWishes:[],buckets:[]},props={data,room:'room',update:fn=>fn(data)};
function render(){cursor=0;const tree=F.Planner(props);effects.splice(0).forEach(fn=>fn());return tree;}
function screen(){render();return render();}
function all(n,p){if(!n||typeof n!=='object')return[];return(p(n)?[n]:[]).concat(...n.children.map(x=>all(x,p)));}
function text(n){return n&&typeof n==='object'?n.children.map(text).join(''):String(n??'');}
function button(tree,label){const b=all(tree,x=>x.type==='button'&&text(x)===label)[0];assert(b,'button '+label);return b;}
function recommendations(tree){return tree.children.find(x=>x&&x.props&&x.props['aria-live']==='polite');}
let tree=screen();assert(text(tree).includes('364가지 메뉴'));assert(!text(tree).includes('AI'));assert(!text(tree).includes('한도'));assert.equal(all(recommendations(tree),x=>x.type==='article').length,6);
const first=all(recommendations(tree),x=>x.type==='h3').map(text);button(tree,'다른 메뉴 보기').props.onClick();tree=screen();assert(all(recommendations(tree),x=>x.type==='h3').every(x=>!first.includes(text(x))));
const chosen=all(recommendations(tree),x=>x.type==='h3').map(text)[0];const save=button(recommendations(tree),'다음에 먹자');save.props.onClick();save.props.onClick();assert.equal(data.foodWishes.length,1);assert.equal(data.foodWishes[0].name,chosen);assert(data.foodWishes[0].description);assert(!data.foodWishes[0].preparation);
tree=screen();assert(button(recommendations(tree),'저장했어요').props.disabled);button(tree,'먹었어').props.onClick();assert(data.foodWishes[0].done);assert(data.foodWishes[0].eatenAt);assert(!F.foodPool(data,{skipRecent:true}).some(x=>x.name===chosen));
// Filters and search change the actual candidates, not just the displayed count.
tree=screen();all(tree,x=>x.type==='input'&&x.props.type==='checkbox')[0].props.onChange({target:{checked:false}});tree=screen();all(tree,x=>x.type==='select')[0].props.onChange({target:{value:'분식'}});tree=screen();assert(all(recommendations(tree),x=>x.type==='h3').every(x=>F.menus.find(m=>m.name===text(x)).category==='분식'));
all(tree,x=>x.type==='input'&&x.props.type==='search')[0].props.onChange({target:{value:'로제'}});tree=screen();assert.equal(all(recommendations(tree),x=>x.type==='h3').length,2);assert(text(recommendations(tree)).includes('넓적당면'));
all(tree,x=>x.type==='input'&&x.props.type==='search')[0].props.onChange({target:{value:'no-such-food'}});tree=screen();assert(text(tree).includes('조건에 맞는 메뉴가 없어요'));assert(button(tree,'다른 메뉴 보기').props.disabled);
// Custom names and combinations persist with saved wishes and enter future draws.
let fields=all(tree,x=>x.type==='input'&&!x.props.type);fields[0].props.onChange({target:{value:'우리 로제떡볶이'}});tree=screen();fields=all(tree,x=>x.type==='input'&&!x.props.type);fields[1].props.onChange({target:{value:'당면 두 배에 치즈 듬뿍!'}});tree=screen();all(tree,x=>x.type==='form')[0].props.onSubmit({preventDefault(){}});assert(data.foodWishes.some(x=>x.name==='우리 로제떡볶이'&&x.description==='당면 두 배에 치즈 듬뿍!'));assert.equal(F.catalog(data).length,365);
// Food picker exposes no date recommendations and does not modify existing date wishes.
data.buckets.push({id:'date',text:'도자기 만들기',category:'경험',done:false});tree=screen();assert(!text(tree).includes('데이트 코스'));assert(!text(tree).includes('다른 코스'));assert(!F.datePool);assert.equal(data.buckets.length,1);
// Switching rooms never leaves the previous room's food candidates visible.
props={...props,room:'other',data:{foodWishes:[{id:'custom',name:'다른 방 메뉴',description:'다른 방에서만 볼 메뉴',done:false}],buckets:[]},update(){}};tree=screen();assert(!text(tree).includes('우리 로제떡볶이'));
assert.equal(network,0,'recommendations never call external services, even with stale AI config');
console.log('PASS: 364 unique described menus, 14 categories, exhaustive shuffle, search, recent exclusions, custom combinations, duplicate-safe saves, date recommendation removal, room isolation and zero AI calls');
