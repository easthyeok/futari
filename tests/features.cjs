const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
let slots=[], cursor=0;
const React={createElement:(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity).filter(x=>x!==null&&x!==false&&x!==undefined)}),useState:init=>{const i=cursor++;if(!(i in slots))slots[i]=init;return [slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v];},useEffect:()=>{},useRef:v=>({current:v}),useMemo:f=>f()};
const context={window:{React,ReactDOM:{createRoot:()=>({render(){}})}},document:{getElementById:()=>({})},console,localStorage:{getItem:()=>null},alert:()=>{},confirm:()=>true,setTimeout,clearTimeout,setInterval,clearInterval};
let src=fs.readFileSync(require('path').join(__dirname, '../app.js'),'utf8').replace('  try {\n    ReactDOM.createRoot', '  window.test = {TimelinePage,CoupleCalendar,DateRoulette,freshData,todayStr,memoryPhotos};\n  try {\n    ReactDOM.createRoot');
vm.runInNewContext(fs.readFileSync(require('path').join(__dirname, '../games.js'),'utf8'),context);
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

const games = context.window.FutariGames;
function playFour(columns) { return columns.reduce((g, col) => games.dropFour(g, col), games.newFour()); }
let g = playFour([0,0,1,1,2,2,3]); assert.equal(g.winner,0); assert.equal(g.line.length,4); assert.equal(games.dropFour(g,4),g);
g=playFour([0,1,0,1,0,1,0]); assert.equal(g.winner,0);
const diagonal=[0,1,1,2,4,2,2,3,4,3,5,3,3];
g=playFour(diagonal);assert.equal(g.winner,0);g=playFour(diagonal.map(c=>6-c));assert.equal(g.winner,0);
g=playFour([0,0,0,0,0,0]);assert.equal(games.dropFour(g,0),g);assert.equal(games.dropFour(g,-1),g);assert.equal(games.dropFour(g,1.5),g);
g=games.newFour();g.board=Array.from({length:42},(_,i)=>((Math.floor(i/7)%2)+(Math.floor((i%7)/2)%2))%2);g.board[0]=null;g.moves=41;g=games.dropFour(g,0);assert.equal(g.draw,true);assert.equal(g.winner,null);
g=games.newFour();g.board[6]=0;g.board[7]=0;g.board[8]=0;g.board[9]=0;g.moves=4;g=games.dropFour(g,5);assert.equal(g.winner,null,'no row wrapping');
g=games.newRace();assert.equal(games.rollRace(g,0),g);g=games.rollRace(g,5);assert.equal(g.positions[0],8);assert.equal(g.turn,1);g=games.rollRace(g,4);assert.equal(g.positions[1],4);assert(g.message.includes('귀여운'));
g={...games.newRace(),positions:[9,0]};g=games.rollRace(g,1);assert.equal(g.positions[0],7);
g={...games.newRace(),positions:[14,0]};g=games.rollRace(g,1);assert.equal(g.positions[0],19);
g={...games.newRace(),positions:[19,0]};g=games.rollRace(g,1);assert.equal(g.positions[0],17);
g={...games.newRace(),positions:[23,0]};g=games.rollRace(g,6);assert.equal(g.positions[0],24);assert.equal(g.winner,0);assert.equal(games.rollRace(g,3),g);

// Exercise the game screen through its actual event handlers.
const gameProps={data:api.freshData()};t=render(games.GamePage,gameProps,true);assert.equal(all(t,x=>x.props.className&&x.props.className.startsWith('four-cell')).length,42);
for(const col of [0,0,1,1,2,2,3]){all(t,x=>x.props['aria-label']===(col+1)+'열에 놓기')[0].props.onClick();t=render(games.GamePage,gameProps);}
assert(text(t).includes('나 승리'));assert(text(t).includes('나 1 : 0 너'));button(t,'한 판 더!').props.onClick();t=render(games.GamePage,gameProps);assert(text(t).includes('너 차례'));
button(t,'🎲 레이스').props.onClick();t=render(games.GamePage,gameProps);assert.equal(all(t,x=>x.props.className&&x.props.className.startsWith('race-cell')).length,24);
button(t,'💌 카드 덱').props.onClick();t=render(games.GamePage,gameProps);const seen=new Set();
for(let i=0;i<18;i++){button(t,'카드 뽑기').props.onClick();t=render(games.GamePage,gameProps);const card=all(t,x=>x.props.className==='couple-card')[0];const title=text(card);assert(!seen.has(title),'card repeats');seen.add(title);}
assert.equal(button(t,'모두 뽑았어요').props.disabled,true);button(t,'덱 다시 섞기').props.onClick();t=render(games.GamePage,gameProps);assert(text(t).includes('남은 카드 18장'));
const appSource=fs.readFileSync(require('path').join(__dirname,'../app.js'),'utf8');const html=fs.readFileSync(require('path').join(__dirname,'../index.html'),'utf8');assert(!appSource.includes('MapPage'));assert(!html.includes('dapi.kakao'));assert(html.indexOf('src="games.js"')<html.indexOf('src="app.js"'));
console.log('PASS: four-in-a-row all directions, full column, draw, terminal states, race events/finish, scoreboard/restart, 18 unique cards, map removal');
