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
let tree=render(true);tree=render();assert(text(tree).includes('다음엔 우리, 이거 어때?'));assert.equal(all(tree,x=>x.type==='input').length,0);assert(text(tree).includes('기본 추천'));
let save=button(tree,'다음에 먹자');save.props.onClick();save.props.onClick();assert.equal(data.foodWishes.length,1);tree=render();button(tree,'먹었어').props.onClick();assert(data.foodWishes[0].done);
data.buckets.push({id:'b',text:'도자기 만들기',done:false});data.memories=[{title:'바다 여행',memo:'private diary',photos:['private photo']}];data.places=[{name:'공원',address:'private address'}];
const history=F.history(data);assert.equal(history.memories[0].title,'바다 여행');assert(!JSON.stringify(history).includes('private'));assert(F.suggestions(data,'date',0).some(x=>x.name==='도자기 만들기'));
let pending=button(render(),'데이트 코스').props.onClick();await pending;tree=render();assert(text(tree).includes('도자기 만들기'));assert(button(tree,'저장했어요').props.disabled);assert.equal(data.buckets.length,1,'existing wish is not duplicated');
c.window.FUTARI_CONFIG.FOOD_AI_ENABLED=true;let called=0,lastBody,release;fetcher=async(url,options)=>{called++;lastBody=JSON.parse(options.body);return new Promise(resolve=>release=resolve);};
pending=button(render(),'먹거리 추천').props.onClick();button(render(),'먹거리 추천').props.onClick();assert.equal(called,1);assert.equal(lastBody.kind,'meal');assert.equal(lastBody.history.memories[0].title,'바다 여행');assert(!JSON.stringify(lastBody).includes('private'));release(new Response(JSON.stringify({provider:'gemini',items:menus})));await pending;tree=render();assert(text(tree).includes('AI가 우리 기록으로 골랐어요'));
pending=button(tree,'데이트 코스').props.onClick();assert.equal(lastBody.kind,'date');release(new Response(JSON.stringify({provider:'gemini',items:menus})));await pending;tree=render();button(tree,'같이 해보자').props.onClick();assert(data.buckets.some(x=>x.text===menus[0].name&&x.preparation));
fetcher=async()=>new Response('{}',{status:429});await button(render(),'다시 추천받기').props.onClick();tree=render();assert(text(tree).includes('추천 한도'));assert(text(tree).includes('기본 추천'));
// Loading the page starts recommendations without a question or button click.
let auto=0;fetcher=async()=>{auto++;return new Response(JSON.stringify({provider:'gemini',items:menus}));};render(true);await new Promise(r=>setImmediate(r));assert.equal(auto,1);assert(text(render()).includes('AI가 우리 기록으로 골랐어요'));
console.log('PASS: proactive food/date recommendations, bounded history, no private bodies/photos, auto generation, saved wishes, duplicate guard, request lock and quota fallback');
})().catch(error=>{console.error(error);process.exitCode=1;});
