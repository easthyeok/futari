const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
let slots=[], cursor=0;
const React={createElement:(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity).filter(x=>x!==null&&x!==false&&x!==undefined)}),useState:init=>{const i=cursor++;if(!(i in slots))slots[i]=init;return [slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v];},useEffect:()=>{},useRef:v=>({current:v}),useMemo:f=>f()};
const context={window:{React,ReactDOM:{createRoot:()=>({render(){}})}},document:{getElementById:()=>({})},console,localStorage:{getItem:()=>null},alert:()=>{},confirm:()=>true,setTimeout,clearTimeout,setInterval,clearInterval};
let src=fs.readFileSync(require('path').join(__dirname, '../app.js'),'utf8').replace('  try {\n    ReactDOM.createRoot', '  window.test = {TABS,TogetherPage,TimelinePage,CoupleCalendar,DateRoulette,freshData,todayStr,memoryPhotos};\n  try {\n    ReactDOM.createRoot');
for(const file of ['data.js','activity.js'])vm.runInNewContext(fs.readFileSync(require('path').join(__dirname,'../'+file),'utf8'),context);
vm.runInNewContext(fs.readFileSync(require('path').join(__dirname, '../home.js'),'utf8'),context);
vm.runInNewContext(fs.readFileSync(require('path').join(__dirname, '../board-games.js'),'utf8'),context);
vm.runInNewContext(fs.readFileSync(require('path').join(__dirname, '../farm.js'),'utf8'),context);
vm.runInNewContext(fs.readFileSync(require('path').join(__dirname, '../today.js'),'utf8'),context);
vm.runInNewContext(fs.readFileSync(require('path').join(__dirname,'../village.js'),'utf8'),context);
vm.runInNewContext(fs.readFileSync(require('path').join(__dirname,'../calendar.js'),'utf8'),context);
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
let calendar=context.window.FutariCalendar.Calendar;t=render(calendar,{data,member:'me',update:f=>f(data)},true);assert(all(t,x=>x.props.className==='calendar-grid modern-calendar').length);button(t,'+ 일정').props.onClick();t=render(calendar,{data,member:'me',update:f=>f(data)});assert.equal(all(t,x=>x.props.type==='date')[0].props.value,context.window.FutariCalendar.today());all(t,x=>x.type==='input'&&x.props.maxLength===120)[0].props.onChange({target:{value:'우리 일정'}});t=render(calendar,{data,member:'me',update:f=>f(data)});const submit=all(t,x=>x.type==='form')[0].props.onSubmit,beforeSchedules=data.dates.length;submit({preventDefault(){}});submit({preventDefault(){}});assert.equal(data.dates.length,beforeSchedules+1,'double submit creates one schedule');
slots=['2028-02-01','2028-02','month'];t=render(calendar,{data,member:'me',update:f=>f(data)});assert.equal(all(t,x=>x.type==='button'&&String(x.props.className||'').startsWith('calendar-day')).length,29);
slots=['2026-12-01','2026-12','month'];t=render(calendar,{data,member:'me',update:f=>f(data)});all(t,x=>x.props['aria-label']==='다음 기간')[0].props.onClick();assert.equal(slots[1],'2027-01');
data.buckets=[{text:'완료',category:'여행',done:true},{text:'카페',category:'먹기',done:false}];t=render(api.DateRoulette,{data},true);button(t,'데이트 뽑기').props.onClick();t=render(api.DateRoulette,{data});assert(text(t).includes('카페'));assert(!text(t).includes('완료'));
t=render(api.DateRoulette,{data:{buckets:[]}},true);assert.equal(button(t,'데이트 뽑기').props.disabled,true);
console.log('PASS: search, edit, legacy photo preservation, text-only creation, calendar selection/leap year/year transition, roulette and empty states');

const appSource=fs.readFileSync(require('path').join(__dirname,'../app.js'),'utf8');const html=fs.readFileSync(require('path').join(__dirname,'../index.html'),'utf8');assert(!appSource.includes('MapPage'));assert(!html.includes('dapi.kakao'));assert(html.indexOf('src="home.js"')<html.indexOf('src="app.js"'));

const home=context.window.FutariHome; let shared=api.freshData(); const date='2026-10-14';
home.act(shared,date,'me','choices',0); assert.equal(shared.memories.length,0);
home.act(shared,date,'you','choices',1); assert.equal(shared.memories.length,1);
home.act(shared,date,'you','choices',1); assert.equal(shared.memories.length,1);
home.act(shared,date,'me','moods','😊'); home.act(shared,date,'you','reactions','🫶');
const before=home.growth(shared); home.act(shared,date,'you','reactions','🫶'); assert.equal(home.growth(shared),before);
home.act(shared,date,'me','activity',true); home.act(shared,date,'you','activity',true); home.act(shared,date,'you','activity',true); assert.equal(shared.memories.length,2);
let screen=render(home.HomePage,{data:shared,member:'me',update:f=>f(shared)},true); assert.equal(all(screen,x=>x.type==='textarea'||x.type==='input').length,0);
console.log('PASS: paired choices, automatic memories, idempotent rewards, shared activity, keyboard-free home');

assert.equal(api.TABS.length,4);assert.equal(api.TABS[1].id,'today');assert(!api.TABS.some(t=>t.id==='memory'));assert(api.TABS.some(t=>t.id==='games'&&t.label==='보드게임'));const together=render(api.TogetherPage,{data:api.freshData()},true);assert(!text(together).includes('보드게임'),'games belong to their own bottom tab');
console.log('PASS: independent board-game navigation');

// Shop interaction uses the current shared balance and retains purchased furniture.
let shopData=api.freshData();
for(const who of ['me','you']){home.act(shopData,date,who,'moods','😊');home.act(shopData,date,who,'choices',0);home.act(shopData,date,who,'activity',true);}
const shopProps={data:shopData,update:f=>f(shopData)};
let shop=render(home.Decorator,shopProps,true);
let plant=all(shop,x=>x.type==='article'&&text(x).includes('초록 화분'))[0];button(plant,'구매 · 배치').props.onClick();
assert.equal(shopData.house.equipped.plant,'plant');
shop=render(home.Decorator,shopProps);plant=all(shop,x=>x.type==='article'&&text(x).includes('초록 화분'))[0];button(plant,'치우기').props.onClick();assert.equal(shopData.house.equipped.plant,null);
shop=render(home.Decorator,shopProps);button(shop,'보관함').props.onClick();shop=render(home.Decorator,shopProps);assert.equal(all(shop,x=>x.type==='article').length,1);button(shop,'배치하기').props.onClick();assert.equal(shopData.house.equipped.plant,'plant');
const homeView=render(home.HomePage,{...shopProps,member:'me'},true);assert(!text(homeView).includes('오늘의 나는'));const farmView=render(context.window.FutariFarm.FarmPage,{...shopProps,member:'me'},true);assert.equal(all(farmView,x=>x.props['aria-label']==='함께 키우는 농장').length,1);
console.log('PASS: shop purchase/removal, inventory filter, free re-equip, completed mission feedback and room preview');

// Farm navigation, construction and daily cards are usable through their controls.
const farm=context.window.FutariFarm,today=context.window.FutariToday;
let villageData=api.freshData(),nowDay=home.day();
for(const who of ['me','you']){home.act(villageData,nowDay,who,'moods','😊');home.act(villageData,nowDay,who,'travel',1);home.act(villageData,nowDay,who,'food',2);home.act(villageData,nowDay,who,'notes','우리의 하루');}
const villageProps={data:villageData,member:'me',update:f=>f(villageData)};
let village=render(farm.FarmPage,villageProps,true);
all(village,x=>x.type===context.window.FutariVillage.Village)[0].props.onPlot(0);village=render(farm.FarmPage,villageProps);button(village,'작은 텃밭 짓기 · 💛 12').props.onClick();assert.equal(villageData.farm.buildings[0],'garden');
village=render(farm.FarmPage,villageProps);const radish=all(village,x=>x.type==='button'&&text(x).includes('래디시'))[0];assert(radish);radish.props.onClick();assert.equal(villageData.farm.crops[0].id,'radish');
village=render(farm.FarmPage,villageProps);button(village,'물 주기 · 15초 단축').props.onClick();assert(villageData.farm.crops[0].watered.me);
button(village,'🛋 집 안 꾸미기').props.onClick();village=render(farm.FarmPage,villageProps);assert(all(village,x=>x.type===home.Interior).length);
let cardData=api.freshData(),cardProps={data:cardData,member:'me',update:f=>f(cardData),date:nowDay,kind:'travel'};
let card=render(today.ChoiceCard,cardProps,true);all(card,x=>x.type==='button')[0].props.onClick();assert.equal(cardData.together[nowDay].travel.me,0);card=render(today.ChoiceCard,cardProps);assert(text(card).includes('상대도 고르면'));
home.act(cardData,nowDay,'you','travel',1);card=render(today.ChoiceCard,cardProps);assert(text(card).includes('다른 취향'));assert(all(card,x=>x.type==='button').every(x=>x.props.disabled));
let daily=render(today.TodayPage,cardProps,true);all(daily,x=>x.type==='textarea')[0].props.onChange({target:{value:'같이 걷고 싶어'}});daily=render(today.TodayPage,cardProps);button(daily,'답변 남기기 · 💛 3').props.onClick();assert.equal(cardData.together[nowDay].notes.me,'같이 걷고 싶어');assert.equal(cardData.together[nowDay].notes.you,undefined);
home.act(cardData,nowDay,'you','notes','상대만의 답');daily=render(today.TodayPage,cardProps);assert(text(daily).includes('상대만의 답'));
console.log('PASS: farm construction/seed/watering controls, indoor navigation, own-only daily choices/answer submission and paired reveals');
