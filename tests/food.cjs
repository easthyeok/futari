const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
let bank=[],cursor=0,effects=[],seq=0,fetcher;
const React={createElement:(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity).filter(v=>v!==null&&v!==undefined&&v!==false)}),useState:init=>{const i=cursor++;if(!(i in bank))bank[i]=typeof init==='function'?init():init;return[bank[i],value=>bank[i]=typeof value==='function'?value(bank[i]):value];},useRef:init=>{const i=cursor++;if(!(i in bank))bank[i]={current:init};return bank[i];},useEffect:(f,deps)=>{const i=cursor++;if(!(i in bank)){bank[i]=deps;effects.push(f);}}};
const c={window:{React,FUTARI_CONFIG:{FOOD_AI_ENABLED:false,SUPABASE_URL:'https://project.supabase.co',SUPABASE_KEY:'public'},FutariActivity:{id:()=> 'menu-'+(++seq)}},fetch:(...args)=>fetcher(...args),AbortController,setTimeout,clearTimeout};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../food.js'),'utf8'),c);const F=c.window.FutariFood;
const defaults={mode:'pair',main:'과메기',drink:'막걸리',method:'직접 요리',taste:'상관없음',simple:false,exclude:'',note:''};
assert.equal(F.endpoint(c.window.FUTARI_CONFIG),'');assert.equal(F.endpoint({...c.window.FUTARI_CONFIG,FOOD_AI_ENABLED:true}),'https://project.supabase.co/functions/v1/food-recommend-gemini');
let menus=F.recommend(defaults,0);assert.equal(menus.length,3);assert(menus.some(m=>m.name==='바지락 술찜'));assert(menus.some(m=>m.name==='골뱅이소면'));assert(menus.every(m=>!m.name.includes('과메기')));assert.notDeepEqual(F.recommend(defaults,1).map(m=>m.name),menus.map(m=>m.name));
assert(F.recommend({...defaults,exclude:'해산물, 계란, 두부'},0).every(m=>!['바지락 술찜','골뱅이소면','어묵탕','계란찜','두부김치','잔치국수'].includes(m.name)));
assert(F.recommend({...defaults,taste:'국물',simple:true},0).every(m=>m.preparation.match(/약 (\d+)분/)[1]<=20));
assert(F.recommend({...defaults,method:'배달·포장'},0).every(m=>m.preparation.includes('실제 판매 여부')));assert(!F.validResults([]));assert(!F.validResults([menus[0],menus[0],menus[0]]));assert(F.validResults(menus));
const distinct=new Set();for(let turn=0;turn<40;turn++)for(const menu of F.recommend({...defaults,mode:'meal',main:'',drink:'없음',category:'상관없음'},turn))distinct.add(menu.name);assert.equal(distinct.size,94);
for(const category of ['고기','해산물','면·밥','분식','채소·두부','세계요리']){assert.equal(F.recommend({...defaults,mode:'meal',main:'',category},0).length,3);}assert(F.recommend({...defaults,mode:'meal',main:'',category:'세계요리'},0).every(m=>['토마토 계란볶음','알리오 올리오','봉골레 파스타','감바스','소고기 타코','치킨 퀘사디아','팟타이','나시고렝','그린커리','버터치킨 커리','샤부샤부','마파두부','탄탄면','오코노미야키','차완무시','스테이크','프렌치 어니언 수프','라따뚜이','소바','쌀국수','우동'].includes(m.name)));
let data={buckets:[]},props={data,room:'room',update:f=>f(data)};
function render(reset=false){if(reset)bank=[];cursor=0;const tree=F.Planner(props);effects.splice(0).forEach(f=>f());return tree;}
function all(n,p){if(!n||typeof n!=='object')return[];return(p(n)?[n]:[]).concat(...n.children.map(x=>all(x,p)));}function text(n){return n&&typeof n==='object'?n.children.map(text).join(''):String(n??'');}function button(t,label){const b=all(t,x=>x.type==='button'&&text(x)===label)[0];assert(b,'button '+label);return b;}
function tap(label){const tree=render();button(tree,label).props.onClick();return render();}
function advanceText(value){let tree=render(),field=all(tree,x=>x.type==='input'||x.type==='textarea')[0];assert(field);field.props.onChange({target:{value}});tree=render();all(tree,x=>x.type==='form')[0].props.onSubmit({preventDefault(){}});return render();}
function submitText(){const tree=render();return all(tree,x=>x.type==='form')[0].props.onSubmit({preventDefault(){}});}
(async()=>{
let tree=render(true);assert(text(tree).includes('오늘 메뉴, 같이 정해보자'));
tree=tap('🎲 아무거나 골라줘고민 없이 바로 추천');await new Promise(r=>setImmediate(r));tree=render();assert(text(tree).includes('기본 메뉴에서 골라봤어'));assert.equal(all(tree,x=>x.type==='article').length,3);
const first=all(tree,x=>x.type==='h3').map(text);tree=tap('다시 뽑기');await new Promise(r=>setImmediate(r));tree=render();assert.notDeepEqual(all(tree,x=>x.type==='h3').map(text).slice(-3),first);
const saveButton=button(tree,'다음에 먹자');saveButton.props.onClick();saveButton.props.onClick();tree=render();assert.equal(data.buckets.length,0);assert.equal(data.foodWishes.length,1);assert(data.foodWishes[0].reason);assert(data.foodWishes[0].preparation);assert(text(tree).includes('먹고 싶은 메뉴에 저장했어요.'));assert(button(tree,'저장했어요').props.disabled);
// Saved menus survive remounts, retain details, and completed menus can be saved again.
tree=render(true);assert(text(tree).includes(data.foodWishes[0].name));assert(text(tree).includes(data.foodWishes[0].reason));assert(text(tree).includes(data.foodWishes[0].preparation));button(tree,'먹었어').props.onClick();tree=render();assert(data.foodWishes[0].done);assert.equal(all(tree,x=>x.type==='button'&&text(x)==='먹었어').length,0);assert(text(tree).includes('먹어본 메뉴'));

tree=tap('🎯 취향대로 골라줘원하는 조건만 골라서 추천');assert(text(tree).includes('원하는 조건만 골라줘'));tap('해산물');tap('국물');tap('배달·포장');tree=render();assert(!text(tree).includes('준비 시간'));all(tree,x=>x.type==='form')[0].props.onSubmit({preventDefault(){}});await new Promise(r=>setImmediate(r));tree=render();assert(text(tree).includes('해산물 · 국물 · 배달·포장'));
// AI requests preserve conditions, conversation preferences and previous menu avoidance.
c.window.FUTARI_CONFIG.FOOD_AI_ENABLED=true;let called=0,lastBody,release;fetcher=async(url,options)=>{called++;lastBody=JSON.parse(options.body);return new Promise(resolve=>release=resolve);};
tree=render();let pending=button(tree,'다시 뽑기').props.onClick();button(tree,'다시 뽑기').props.onClick();assert.equal(called,1);assert.equal(lastBody.form.category,'해산물');assert.equal(lastBody.form.taste,'국물');assert.equal(lastBody.form.note,'');assert(lastBody.avoid.length>0);assert(!('data' in lastBody));release(new Response(JSON.stringify({provider:'gemini',items:menus})));await pending;tree=render();assert(text(tree).includes('이 메뉴들은 어때?'));
all(tree,x=>x.type==='input')[0].props.onChange({target:{value:'점심에 돼지고기 먹었어'}});tree=render();pending=all(tree,x=>x.type==='form')[0].props.onSubmit({preventDefault(){}});assert(lastBody.form.note.includes('점심에 돼지고기 먹었어'));release(new Response(JSON.stringify({provider:'gemini',items:menus})));await new Promise(r=>setImmediate(r));tree=render();assert(text(tree).includes('점심에 돼지고기 먹었어'));
pending=button(tree,'덜 매운 거').props.onClick();assert.equal(lastBody.form.taste,'담백');assert(lastBody.form.note.includes('점심에 돼지고기 먹었어'));assert(lastBody.form.note.includes('덜 매운 거'));release(new Response(JSON.stringify({provider:'gemini',items:menus})));await pending;
// Navigation cancels stale responses.
pending=button(render(),'다시 뽑기').props.onClick();tap('조건 바꾸기');release(new Response(JSON.stringify({provider:'gemini',items:menus})));await pending;tree=render();assert(!text(tree).includes('이 메뉴들은 어때?'));assert(text(tree).includes('원하는 조건만 골라줘'));
// Quota failures fall back once, retaining both request and source disclosure.
fetcher=async()=>{called++;return new Response('{}',{status:429});};const before=called;all(tree,x=>x.type==='form')[0].props.onSubmit({preventDefault(){}});await new Promise(r=>setImmediate(r));tree=render();assert.equal(called,before+1);assert(text(tree).includes('잠시 쉬었다가'));assert(text(tree).includes('기본 메뉴에서 골라봤어'));assert(text(tree).includes('자유롭게 적은 추가 요청은 AI 연결 시 반영돼요'));
// Pairing retains arbitrary mains and requires a main before submission.
tap('처음부터 다시');tap('🎯 취향대로 골라줘원하는 조건만 골라서 추천');tree=tap('메인에 어울리는 곁들임');assert(button(tree,'이 조건으로 골라줘').props.disabled);all(tree,x=>x.type==='input')[0].props.onChange({target:{value:'부야베스와 뇨키'}});tree=render();assert(!button(tree,'이 조건으로 골라줘').props.disabled);
console.log('PASS: menu filters, random and optional conditions, conversation, condition retention, save, duplicate guard, cancellation, quota fallback and arbitrary pairing');
})().catch(error=>{console.error(error);process.exitCode=1;});
