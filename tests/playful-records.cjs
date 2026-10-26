const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
let bank=[],cursor=0,effects=[],seq=0;
const React={createElement:(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity).filter(v=>v!==null&&v!==undefined&&v!==false)}),useState:init=>{const i=cursor++;if(!(i in bank))bank[i]=typeof init==='function'?init():init;return[bank[i],value=>bank[i]=typeof value==='function'?value(bank[i]):value];},useRef:init=>{const i=cursor++;if(!(i in bank))bank[i]={current:init};return bank[i];},useEffect:(fn,deps)=>{const i=cursor++;if(!(i in bank)||JSON.stringify(bank[i])!==JSON.stringify(deps)){bank[i]=deps;effects.push(fn);}}};
const context={window:{React},setTimeout,clearTimeout,console,document:{activeElement:null}};
for(const name of ['data','activity','calendar','home','today'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../'+name+'.js'),'utf8'),context);
context.window.FutariActivity.id=()=> 'test-'+(++seq);
const C=context.window.FutariCalendar,D=context.window.FutariData,H=context.window.FutariHome;
function render(comp,props,reset=false){if(reset)bank=[];cursor=0;const tree=comp(props);effects.splice(0).forEach(f=>f());return tree;}
function all(n,p){if(!n||typeof n!=='object')return[];return(p(n)?[n]:[]).concat(...n.children.map(x=>all(x,p)));}
function text(n){return n&&typeof n==='object'?n.children.map(text).join(''):String(n??'');}
function button(tree,label){const b=all(tree,x=>x.type==='button'&&text(x)===label)[0];assert(b,'button '+label);return b;}
function find(tree,p){const n=all(tree,p)[0];assert(n);return n;}
function submit(tree){find(tree,x=>x.type==='form').props.onSubmit({preventDefault(){}});}
let d=D.migrate({});
assert(C.saveEntry(d,{id:'photo',date:'2026-10-01',photos:['data:image/photo']},'me'));
assert.equal(d.memories[0].title,'사진 한 장');assert.equal(d.memories[0].memo,'');
assert(C.saveEntry(d,{id:'line',date:'2026-10-02',memo:'  김밥을 먹다가 빵 터졌다\n다음 줄',photos:[]},'you'));
assert.equal(d.memories[1].title,'김밥을 먹다가 빵 터졌다');assert(d.memories[1].memo.includes('\n'));
assert(!C.saveEntry(d,{date:'2026-10-03',title:' ',memo:'\n',photos:[]},'me'));
assert(!C.saveEntry(d,{date:'2026-02-30',memo:'invalid'},'me'));
assert(!C.saveEntry(d,{date:'2026-10-03',memo:'invalid'},'other'));
// One voice per person; independent voices merge and replay without touching the original entry.
const base=D.copy(d),left=D.copy(base),right=D.copy(base);
assert(C.addVoice(left,'memories','photo','me','  난 네 표정이 기억나  '));
assert(C.addVoice(right,'memories','photo','you','나도 그때 웃겼어'));
const merged=D.reconcile(base,left,right),entry=merged.memories.find(e=>e.id==='photo');
assert.equal(entry.voices.me.text,'난 네 표정이 기억나');assert.equal(entry.voices.you.text,'나도 그때 웃겼어');assert.equal(entry.photos[0],'data:image/photo');assert.equal(entry.memo,'');
const replayed=D.replay(right,[{id:'voice',ops:D.diff(base,left)}]);assert.equal(replayed.memories[0].voices.me.text,'난 네 표정이 기억나');assert.equal(replayed.memories[0].voices.you.text,'나도 그때 웃겼어');
assert(!C.addVoice(merged,'memories','missing','me','x'));assert(!C.addVoice(merged,'memories','photo','other','x'));assert(!C.addVoice(merged,'memories','photo','me','x'.repeat(301)));
assert(C.addVoice(merged,'memories','photo','me',''));assert.equal(entry.voices.me,undefined);assert.equal(entry.voices.you.text,'나도 그때 웃겼어');
C.saveEntry(merged,{id:'photo',editing:true,source:'memories',date:'2026-09-01',memo:'新しい記憶',photos:['data:image/photo']},'me');assert.equal(entry.voices.you.text,'나도 그때 웃겼어');assert.equal(merged.memories[0].voices.you.text,'나도 그때 웃겼어');
// The quick-capture route opens directly into the chosen prompt; no title is required.
let capture=D.migrate({}),props={data:capture,member:'me',target:'capture:오늘 가장 웃겼던 말',update:f=>f(capture)};
render(C.Calendar,props,true);let tree=render(C.Calendar,props);assert(text(tree).includes('사진 한 장, 한 줄이면 충분해요'));assert(find(tree,x=>x.type==='input'&&x.props.maxLength===120).props.required!==true);assert(button(tree,'기록 저장').props.disabled);
find(tree,x=>x.type==='textarea').props.onChange({target:{value:'너 지금 김밥한테 인사했어?'}});tree=render(C.Calendar,props);assert(!button(tree,'기록 저장').props.disabled);const onSubmit=find(tree,x=>x.type==='form').props.onSubmit;onSubmit({preventDefault(){}});onSubmit({preventDefault(){}});assert.equal(capture.memories.length,1);assert.equal(capture.memories[0].title,'너 지금 김밥한테 인사했어?');
// A partner can add/edit/remove their own line, including on old non-journal records.
let voicesData=D.migrate({memories:[{id:'legacy',date:'2020-01-01',title:'산책',memo:'원문',photo:'data:image/legacy'}]}),voiceProps={entry:C.journalRecords(voicesData)[0],data:voicesData,member:'you',update:f=>f(voicesData)};
tree=render(C.Voices,voiceProps,true);button(tree,'내 기억 한 줄 덧붙이기').props.onClick();tree=render(C.Voices,voiceProps);find(tree,x=>x.type==='textarea').props.onChange({target:{value:'내가 기억하는 건 바람'}});tree=render(C.Voices,voiceProps);submit(tree);assert.equal(voicesData.memories[0].voices.you.text,'내가 기억하는 건 바람');assert.equal(voicesData.memories[0].memo,'원문');
voiceProps.entry=C.journalRecords(voicesData)[0];tree=render(C.Voices,voiceProps);assert(text(tree).includes('내가 기억하는 건 바람'));button(tree,'내 한 줄 수정').props.onClick();tree=render(C.Voices,voiceProps);button(tree,'내 한 줄 지우기').props.onClick();assert.equal(voicesData.memories[0].voices.you,undefined);
// Partner contributions appear in the shared activity feed, including legacy memories.
let before=D.copy(voicesData);C.addVoice(voicesData,'memories','legacy','you','이어쓰기');let events=context.window.FutariActivity.capture(before,voicesData,'you','batch');assert(events.some(e=>e.target==='legacy'&&e.text.includes('한 줄')));
// Quiz uses real, distinct past dates; no future entries or duplicate photos, no persistent score.
let quizData=D.migrate({memories:[{id:'a',date:'2020-01-01',title:'산책',photos:['data:image/a']},{id:'b',date:'2020-02-01',title:'바다',photos:['data:image/b']},{id:'c',date:'2020-03-01',title:'등산',photos:['data:image/c']},{id:'d',date:'2020-05-01',title:'공원',photos:['data:image/d']},{id:'duplicate',date:'2020-04-01',title:'복제',photos:['data:image/a']},{id:'future',date:'2099-01-01',title:'미래',photos:['data:image/future']}]}),quizProps={data:quizData,navigate:(tab,id)=>{quizProps.destination=[tab,id];}};
const original=JSON.stringify(quizData),round=H.quizRound(quizData,H.day(),0);assert.equal(round.choices.length,3);assert.equal(new Set(round.choices).size,3);assert(round.choices.includes(round.entry.date));assert(!round.choices.includes('2099-01-01'));assert(!round.choices.includes('2020-01-01'));assert(!round.choices.includes('2020-04-01'));assert.notEqual(H.quizRound(quizData,H.day(),1).entry.id,round.entry.id);
tree=render(H.MemoryQuiz,quizProps,true);assert(!text(tree).includes(round.entry.title));assert.equal(find(tree,x=>x.type==='img').props.alt.includes(round.entry.title),false);
button(tree,'기억이 안 나요 · 같이 보기').props.onClick();tree=render(H.MemoryQuiz,quizProps);assert(text(tree).includes(round.entry.title));button(tree,'그날 이야기 펼치기').props.onClick();assert.equal(quizProps.destination[1],round.entry.id);button(tree,'다른 추억').props.onClick();tree=render(H.MemoryQuiz,quizProps);assert(!text(tree).includes('그날 이야기 펼치기'));assert.equal(JSON.stringify(quizData),original);
tree=render(H.MemoryQuiz,quizProps,true);button(tree,round.entry.date.replace(/-/g,'.')).props.onClick();tree=render(H.MemoryQuiz,quizProps);assert(text(tree).includes('맞아, 바로 이날!'));tree=render(H.MemoryQuiz,quizProps,true);button(tree,round.choices.find(date=>date!==round.entry.date).replace(/-/g,'.')).props.onClick();tree=render(H.MemoryQuiz,quizProps);assert(text(tree).includes('기억을 펼쳐보니 이날이었어요.'));
assert.equal(H.quizRound(D.migrate({}),H.day(),0),null);assert.equal(H.quizRound(D.migrate({memories:[{id:'only',date:'2020-01-01',photos:['x']}]}),H.day(),0),null);
const todayTree=render(context.window.FutariToday.TodayPage,{data:D.migrate({}),member:'me',update(){}},true);assert.equal(all(todayTree,x=>x.type==='progress').length,0);assert(!text(todayTree).includes('/ 4'));
console.log('PASS: photo-only and one-line capture, empty rejection, quick entry/duplicate submit, independent partner voices, merge/replay and legacy preservation, contribution notifications, quiz reveal/navigation/skip and no forced completion');
