const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
let slots=[], cursor=0;
const React={createElement:(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity).filter(x=>x!==null&&x!==false&&x!==undefined)}),useState:init=>{const i=cursor++;if(!(i in slots))slots[i]=init;return [slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v];},useEffect:()=>{},useRef:v=>({current:v}),useMemo:f=>f()};
const context={window:{React,ReactDOM:{createRoot:()=>({render(){}})}},document:{getElementById:()=>({})},console,localStorage:{getItem:()=>null},alert:()=>{},confirm:()=>true,setTimeout,clearTimeout,setInterval,clearInterval};
let src=fs.readFileSync(require('path').join(__dirname, '../app.js'),'utf8').replace('  try {\n    ReactDOM.createRoot', '  window.test = {TABS,TogetherPage,TimelinePage,CoupleCalendar,DateRoulette,freshData,todayStr,memoryPhotos};\n  try {\n    ReactDOM.createRoot');
vm.runInNewContext(fs.readFileSync(require('path').join(__dirname, '../games.js'),'utf8'),context);
vm.runInNewContext(fs.readFileSync(require('path').join(__dirname, '../home.js'),'utf8'),context);
vm.runInNewContext(fs.readFileSync(require('path').join(__dirname, '../board-games.js'),'utf8'),context);
vm.runInNewContext(src,context); const api=context.window.test;
function render(comp,props,reset=false){if(reset)slots=[];cursor=0;return comp(props);}
function all(n,p){if(!n||typeof n!=='object')return [];return (p(n)?[n]:[]).concat(...n.children.map(x=>all(x,p)));}
function text(n){return typeof n==='object'&&n? n.children.map(text).join(''):String(n??'');}
function button(tree,label){const n=all(tree,x=>x.type==='button'&&text(x)===label)[0];assert(n,'button '+label);return n;}
let data=api.freshData();data.memories=[{id:'old',date:'2026-10-14',title:'제주 여행',memo:'바다',photo:'data:old'},{id:'new',date:'2026-09-01',title:'영화',memo:'팝콘'}];
const props={data,update:fn=>fn(data)};
let t=render(api.TimelinePage,props,true); assert.equal(all(t,x=>x.type==='article').length,2);
all(t,x=>x.props.type==='search')[0].props.onChange({target:{value:'바다'}});t=render(api.TimelinePage,props);assert.equal(all(t,x=>x.type==='article').length,1);
button(t,'수정').props.onClick();t=render(api.TimelinePage,props);assert.equal(all(t,x=>x.props.type==='file').length,0);
all(t,x=>x.type==='input'&&x.props.placeholder==='어떤 추억인가요?')[0].props.onChange({target:{value:'제주 여행 수정'}});t=render(api.TimelinePage,props);button(t,'저장').props.onClick();assert.equal(data.memories[0].title,'제주 여행 수정');assert.equal(data.memories[0].photo,'data:old');assert.equal(data.memories.length,2);
t=render(api.TimelinePage,props);button(t,'전체 보기').props.onClick();t=render(api.TimelinePage,props);button(t,'+ 추억 추가').props.onClick();t=render(api.TimelinePage,props);assert.equal(button(t,'저장').props.disabled,true);
all(t,x=>x.type==='input'&&x.props.placeholder==='어떤 추억인가요?')[0].props.onChange({target:{value:'산책'}});t=render(api.TimelinePage,props);button(t,'저장').props.onClick();assert.equal(data.memories.length,3);assert.equal('photo' in data.memories[2],false);
let selected; t=render(api.CoupleCalendar,{data,onAdd:d=>selected=d},true);assert(all(t,x=>x.props.className==='calendar-grid').length);button(t,'+ 이 날짜에 약속 추가').props.onClick();assert.equal(selected,api.todayStr());
// Move across December/January and verify leap-year February.
slots=['2028-02','2028-02-01'];t=render(api.CoupleCalendar,{data,onAdd:d=>selected=d});assert.equal(all(t,x=>x.type==='button'&&x.props['aria-pressed']!==undefined).length,29);
slots=['2026-12','2026-12-01'];t=render(api.CoupleCalendar,{data,onAdd(){}});all(t,x=>x.props['aria-label']==='다음 달')[0].props.onClick();assert.equal(slots[0],'2027-01');
data.buckets=[{text:'완료',category:'여행',done:true},{text:'카페',category:'먹기',done:false}];t=render(api.DateRoulette,{data},true);button(t,'데이트 뽑기').props.onClick();t=render(api.DateRoulette,{data});assert(text(t).includes('카페'));assert(!text(t).includes('완료'));
t=render(api.DateRoulette,{data:{buckets:[]}},true);assert.equal(button(t,'데이트 뽑기').props.disabled,true);
console.log('PASS: search, edit, legacy photo preservation, text-only creation, calendar selection/leap year/year transition, roulette and empty states');

const appSource=fs.readFileSync(require('path').join(__dirname,'../app.js'),'utf8');const html=fs.readFileSync(require('path').join(__dirname,'../index.html'),'utf8');assert(!appSource.includes('MapPage'));assert(!html.includes('dapi.kakao'));assert(html.indexOf('src="games.js"')<html.indexOf('src="app.js"'));

const home=context.window.FutariHome; let shared=api.freshData(); const date='2026-10-14';
home.act(shared,date,'me','choices',0); assert.equal(shared.memories.length,0);
home.act(shared,date,'you','choices',1); assert.equal(shared.memories.length,1);
home.act(shared,date,'you','choices',1); assert.equal(shared.memories.length,1);
home.act(shared,date,'me','moods','😊'); home.act(shared,date,'you','reactions','🫶');
const before=home.growth(shared); home.act(shared,date,'you','reactions','🫶'); assert.equal(home.growth(shared),before);
home.act(shared,date,'me','activity',true); home.act(shared,date,'you','activity',true); home.act(shared,date,'you','activity',true); assert.equal(shared.memories.length,2);
let screen=render(home.HomePage,{data:shared,member:'me',update:f=>f(shared)},true); assert.equal(all(screen,x=>x.type==='textarea'||x.type==='input').length,0);
console.log('PASS: paired choices, automatic memories, idempotent rewards, shared activity, keyboard-free home');

assert.equal(api.TABS.length,4);assert(api.TABS.some(t=>t.id==='games'&&t.label==='보드게임'));const together=render(api.TogetherPage,{data:api.freshData()},true);assert(!text(together).includes('보드게임'),'games belong to their own bottom tab');
console.log('PASS: independent board-game navigation');
