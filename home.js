/* 선택과 반응으로 쌓이는 둘만의 집 */
(function () {
  'use strict';
  var h = window.React.createElement;
  var QUESTIONS = [ ['오늘 같이 보낼 시간은?', '느긋하게 쉬기', '밖으로 나가기'], ['다음 데이트는?', '동네 산책', '영화 보기'], ['오늘 당기는 음식은?', '따뜻한 한식', '바삭한 피자'], ['우리 집에 놓고 싶은 건?', '초록 화분', '포근한 조명'], ['함께 듣고 싶은 음악은?', '잔잔한 음악', '신나는 음악'], ['주말 아침은?', '늦잠 자기', '브런치 먹기'], ['같이 떠난다면?', '바다', '숲'] ];
  function day() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
  function question(date) { return QUESTIONS[Math.floor(Date.parse(date + 'T00:00:00Z') / 86400000) % QUESTIONS.length]; }
  function entry(d, date) { if (!d.together) d.together = {}; if (!d.together[date]) d.together[date] = { moods: {}, choices: {}, reactions: {}, activity: {} }; var e = d.together[date]; ['moods','choices','reactions','activity','travel','food','moment','imagine','notes'].forEach(function (key) { if (!e[key]) e[key] = {}; }); return e; }
  function remember(d, date, type, title, memo) {
    var id = 'together-' + date + '-' + type;
    if (!d.memories.some(function (m) { return m.id === id; })) d.memories.push({ id: id, date: date, title: title, memo: memo, automatic: true });
  }
  function act(d, date, who, type, value) {
    if(['me','you'].indexOf(who)<0 || ['moods','choices','reactions','activity','travel','food','moment','imagine','notes'].indexOf(type)<0)return;
    if(type==='choices' && value!==0 && value!==1)return;
    if((type==='travel'||type==='food'||type==='moment'||type==='imagine')&&(!Number.isInteger(value)||value<0||value>3))return;
    if(type==='notes'&&(typeof value!=='string'||!value.trim()||value.length>300))return;
    var e = entry(d, date), other = who === 'me' ? 'you' : 'me';
    if (type === 'reactions' && !e.moods[other]) return;
    if (['choices','travel','food','moment','imagine'].indexOf(type)>=0 && e[type].me !== undefined && e[type].you !== undefined) return;
    e[type][who] = value;
    if (type === 'choices' && e.choices.me !== undefined && e.choices.you !== undefined) {
      var q = question(date); remember(d, date, 'choices', '💛 오늘 둘이 고른 것', q[0] + '\n' + d.settings.me + ': ' + q[e.choices.me+1] + '\n' + d.settings.you + ': ' + q[e.choices.you+1]);
    }
    if (type === 'activity' && e.activity.me && e.activity.you) remember(d, date, 'activity', '🌿 함께한 작은 시간', '오늘 둘이 산책하거나 함께 쉬었어요.');
  }
  function growth(d) { return Object.keys(d.together || {}).reduce(function (sum, date) { var e = d.together[date]; return sum + Object.keys(e.moods || {}).length + Object.keys(e.reactions || {}).length + (e.choices && e.choices.me !== undefined && e.choices.you !== undefined ? 3 : 0) + (e.activity && e.activity.me && e.activity.you ? 3 : 0) + ['travel','food','moment','imagine','notes'].reduce(function(n,k){return n+Object.keys(e[k]||{}).filter(function(w){return w==='me'||w==='you';}).length;},0); }, 0); }
  var ITEMS = [
    {id:'plant',slot:'plant',name:'초록 화분',icon:'🪴',cost:12},
    {id:'flowers',slot:'plant',name:'꽃 한 아름',icon:'💐',cost:28},
    {id:'lamp',slot:'lamp',name:'포근한 조명',icon:'💡',cost:18},
    {id:'candles',slot:'lamp',name:'캔들 나이트',icon:'🕯️',cost:32},
    {id:'rug',slot:'rug',name:'꽃무늬 러그',icon:'🌼',cost:24},
    {id:'rainbow',slot:'rug',name:'무지개 러그',icon:'🌈',cost:40},
    {id:'cat',slot:'pet',name:'낮잠 고양이',icon:'🐈',cost:60},
    {id:'dog',slot:'pet',name:'꼬마 강아지',icon:'🐕',cost:60},
    {id:'peach',slot:'wall',name:'복숭아 벽지',icon:'🍑',cost:20,color:'#ffe2dc'},
    {id:'sage',slot:'wall',name:'숲빛 벽지',icon:'🌿',cost:20,color:'#dce9d8'},
    {id:'night',slot:'wall',name:'밤하늘 벽지',icon:'🌙',cost:45,color:'#c9cfe6'},
    {id:'wood',slot:'floor',name:'짙은 나무 바닥',icon:'🪵',cost:30,color:'#b98d6c'},
    {id:'cream',slot:'floor',name:'크림 바닥',icon:'🤍',cost:30,color:'#eee1ca'}
  ];
  if(window.FutariInterior) ITEMS=ITEMS.concat(window.FutariInterior.newItems);
  function earned(d) {
    var total = growth(d) * 3 + (window.FutariContent?window.FutariContent.bonus(d):0);
    Object.keys(d.together || {}).forEach(function(date) {
      var e = d.together[date];
      if (e.moods && e.moods.me && e.moods.you && ((e.choices && e.choices.me !== undefined && e.choices.you !== undefined && e.activity && e.activity.me && e.activity.you) || [['travel','food','notes'],['moment','imagine','notes']].some(function(keys){return keys.every(function(k){return e[k]&&e[k].me!==undefined&&e[k].you!==undefined;});}))) total += 12;
    });
    // One completed match per local calendar day; rematches never farm coins.
    var dates = {};
    (d.gameResults || []).forEach(function(r) { if(r.kind==='omok' && r.endedAt && ['me','you','draw'].indexOf(r.winner)>=0) { var t=new Date(r.endedAt); if(!isNaN(t)) dates[t.getFullYear()+'-'+(t.getMonth()+1)+'-'+t.getDate()]=true; } });
    return total + Object.keys(dates).length * 15;
  }
  function owned(d) { return (d.house || {}).owned || []; }
  function balance(d) { return earned(d) + farmIncome(d) - farmSpent(d) - ITEMS.reduce(function(sum,item) { return sum + (owned(d).indexOf(item.id)>=0 ? item.cost : 0); },0); }
  function decorate(d,id) {
    var item=ITEMS.find(function(i){return i.id===id;}); if(!item)return false;
    if(!d.house)d.house={owned:[],equipped:{}};
    if(!d.house.owned)d.house.owned=[]; if(!d.house.equipped)d.house.equipped={};
    if(d.house.owned.indexOf(id)<0) { if(balance(d)<item.cost)return false; d.house.owned.push(id); }
    d.house.equipped[item.slot]=d.house.equipped[item.slot]===id?null:id;
    return true;
  }
  function Decorator(props) {
    var d=props.data, state=window.React.useState('all'), filter=state[0],setFilter=state[1], eq=(d.house||{}).equipped||{}, money=balance(d);
    return h('section',{className:'card decor-shop'},h('div',{className:'shop-heading'},h('div',null,h('span',{className:'eyebrow'},'LITTLE HOME SHOP'),h('h2',{className:'title-lg'},'같이 고르는 우리 집')),h('strong',{className:'coin-badge','aria-label':'사용 가능한 마음 코인'},'💛 '+money)),h('p',{className:'muted'},'구매하면 바로 집에 놓여요. 가진 물건은 언제든 바꿔 꾸밀 수 있어요.'),
      h('div',{className:'shop-filters'},[['all','전체'],['owned','보관함'],['wall','벽지'],['floor','바닥']].map(function(v){return h('button',{key:v[0],className:'btn ghost sm','aria-pressed':filter===v[0],onClick:function(){setFilter(v[0]);}},v[1]);})),
      h('div',{className:'furniture-grid'},ITEMS.filter(function(i){return i.slot&&(!props.surfacesOnly||i.slot==='wall'||i.slot==='floor');}).filter(function(i){return filter==='all'||filter==='owned'&&owned(d).indexOf(i.id)>=0||i.slot===filter;}).map(function(item){var has=owned(d).indexOf(item.id)>=0,on=eq[item.slot]===item.id;return h('article',{key:item.id,className:'furniture'+(on?' equipped':'')},h('span',{className:'furniture-icon','aria-hidden':true},item.icon),h('strong',null,item.name),h('small',null,has?'우리의 물건':'💛 '+item.cost),h('button',{className:'btn ghost sm',disabled:!has&&money<item.cost,onClick:function(){props.update(function(next){decorate(next,item.id);});}},on?'치우기':has?'배치하기':money<item.cost?(item.cost-money)+' 코인 더 모으기':'구매 · 배치'));})),filter==='owned'&&!owned(d).length?h('p',{className:'muted'},'첫 가구를 골라볼까요? 기분을 남기면 3 코인이 쌓여요.'):null);
  }
  function Interior(props) {
    var d=props.data,date=day(),e=(d.together||{})[date]||{},moods=e.moods||{},eq=(d.house||{}).equipped||{};
    function item(slot){return ITEMS.find(function(i){return i.id===eq[slot]&&i.slot===slot;});}
    var wall=item('wall'),floor=item('floor');
    return h('div',null,h('section',{className:'house',style:{background:'linear-gradient('+(wall?wall.color:'#fff6df')+' 72%, '+(floor?floor.color:'#e4c3a5')+' 72%)'},'aria-label':'둘이 꾸민 우리 집'},h('div',{className:'house-window'},wall&&wall.id==='night'?'🌙':'☀️'),h('div',{className:'house-shelf'},'📚',item('plant')?item('plant').icon:'',item('lamp')?item('lamp').icon:''),h('div',{className:'house-sofa'},'🛋️'),h('div',{className:'house-people'},h('span',null,moods.me||'🙂'),h('span',null,moods.you||'🙂')),item('rug')?h('div',{className:'house-rug'},item('rug').icon+' 포근한 우리 집 '+item('rug').icon):null,item('pet')?h('div',{className:'house-cat'},item('pet').icon):null),h(Decorator,props));
  }
  function quizRound(d,date,turn){
    var seen={},all=(window.FutariCalendar?window.FutariCalendar.journalRecords(d):[]).filter(function(e){return e.date<date&&e.photos.length;}),photoDates={};
    all.forEach(function(e){var src=e.photos[0];if(!photoDates[src])photoDates[src]=new Set();photoDates[src].add(e.date);});
    var photos=all.filter(function(e){var src=e.photos[0];if(photoDates[src].size!==1||seen[src])return false;seen[src]=true;return true;});
    var dates=Array.from(new Set(photos.map(function(e){return e.date;}))).sort();if(dates.length<2)return null;
    var seed=Math.floor(Date.parse(date+'T00:00:00Z')/86400000)+(turn||0),entry=photos[seed%photos.length],alternatives=dates.filter(function(v){return v!==entry.date;}),choices=[entry.date];
    for(var i=0;i<Math.min(2,alternatives.length);i++)choices.push(alternatives[(seed+i)%alternatives.length]);
    choices.sort();var offset=seed%choices.length;choices=choices.slice(offset).concat(choices.slice(0,offset));
    return {key:entry.key+'-'+entry.date+'-'+(turn||0),entry:entry,choices:choices};
  }
  function MemoryQuiz(props){
    var ss=window.React.useState(0),turn=ss[0],setTurn=ss[1],as=window.React.useState(null),answer=as[0],setAnswer=as[1],round=quizRound(props.data,day(),turn);
    if(!round)return null;var revealed=answer&&answer.key===round.key;
    return h('section',{className:'card memory-quiz','aria-label':'둘만의 추억 퀴즈'},h('span',{className:'eyebrow'},'REMEMBER THIS LITTLE MOMENT?'),h('h2',{className:'title-lg'},'이 사진, 언제였더라?'),h('p',{className:'muted'},'맞혀도 틀려도, 그날 이야기가 다시 시작돼요.'),
      h('img',{className:'now-memory-photo',src:round.entry.photos[0],alt:'우리의 지난 사진 · 날짜를 떠올려봐요'}),
      h('div',{className:'quiz-choices'},round.choices.map(function(value){return h('button',{key:value,className:'btn ghost'+(revealed&&value===round.entry.date?' quiz-correct':''),disabled:!!revealed,'aria-pressed':!!(revealed&&answer.date===value),onClick:function(){setAnswer({key:round.key,date:value});}},value.replace(/-/g,'.'));})),
      revealed?h('div',{className:'quiz-reveal',role:'status'},h('strong',null,answer.date===round.entry.date?'맞아, 바로 이날!':'기억을 펼쳐보니 이날이었어요.'),h('p',null,round.entry.date+' · '+round.entry.title),h('div',{className:'now-actions'},h('button',{className:'btn sm',onClick:function(){props.navigate('together',round.entry.id);}},'그날 이야기 펼치기'),h('button',{className:'btn ghost sm',onClick:function(){setAnswer(null);setTurn(turn+1);}},'다른 추억'))):h('button',{className:'btn ghost sm',onClick:function(){setAnswer({key:round.key,date:null});}},'기억이 안 나요 · 같이 보기'));
  }
  function HomePage(props){
    var d=props.data,date=day(),state=window.React.useState(0),pick=state[0],setPick=state[1];
    var wishes=(d.buckets||[]).filter(function(b){return !b.done;}),wish=wishes.length?wishes[(Math.floor(Date.parse(date+'T00:00:00Z')/86400000)+pick)%wishes.length]:null;
    var records=window.FutariCalendar?window.FutariCalendar.journalRecords(d):[],past=records.filter(function(e){return e.date<date;}),memory=past.length?past[Math.floor(Date.parse(date+'T00:00:00Z')/86400000)%past.length]:null;
    var plans=records.filter(function(e){return e.date>=date;}).sort(function(a,b){return a.date.localeCompare(b.date);}).slice(0,3);
    var e=(d.together||{})[date]||{},names=d.settings||{};
    function go(tab,id){props.navigate(tab,id);}
    return h('div',{className:'our-now'},
      h('header',{className:'today-heading'},h('p',{className:'eyebrow'},'FUTARI · OUR LITTLE MOMENTS'),h('h1',{className:'title-xl'},'우리의 지금'),h('p',{className:'muted'},'오늘은 또 어떤 이야기를 만들까요?')),
      h('section',{className:'card quick-capture'},h('span',{className:'eyebrow'},'JUST A LITTLE MOMENT'),h('h2',{className:'title-lg'},'길게 안 써도 좋아요'),h('p',{className:'muted'},'사진 한 장, 웃겼던 말 하나. 남기고 싶을 때만 툭.'),h('div',{className:'capture-prompts'},['사진 한 장','오늘의 명장면','오늘 가장 웃겼던 말'].map(function(label){return h('button',{key:label,onClick:function(){go('together','capture:'+label);}},label);}))),
      h(MemoryQuiz,props),
      h('section',{className:'card now-hero'},h('span',{className:'eyebrow'},'ONE LITTLE IDEA FOR US'),h('h2',{className:'title-lg'},wish?wish.text:'우리의 다음 즐거움을 골라볼까요?'),h('p',{className:'muted'},wish?'함께 하고 싶다고 적어둔 일이에요. 이번엔 날짜를 정해볼까요?':'거창한 계획 말고, 함께 해보고 싶은 작은 일 하나부터.'),
        h('div',{className:'now-actions'},h('button',{className:'btn',onClick:function(){go('together',wish?wish.id:'wishes');}},wish?'함께할 날짜 정하기':'하고 싶은 일 적기'),wishes.length>1?h('button',{className:'btn ghost',onClick:function(){setPick(pick+1);}},'다른 아이디어'):null)),
      h('section',{className:'card'},h('span',{className:'eyebrow'},'A LITTLE CLOSER TODAY'),h('h2',{className:'title-lg'},'오늘의 너는 어때?'),h('div',{className:'now-moods'},['me','you'].map(function(w){return h('span',{key:w},(names[w]||w)+' '+((e.moods||{})[w]||'아직 소식이 없어요'));})),h('p',{className:'muted'},'매일 달라지는 선택과 질문으로 서로의 오늘을 알아봐요.'),h('button',{className:'btn ghost block',onClick:function(){go('today');}},'오늘의 대화 시작하기')),
      h('section',{className:'card'},h('span',{className:'eyebrow'},'FROM OUR ARCHIVE'),h('h2',{className:'title-lg'},memory?'이날, 기억나?':'우리의 첫 페이지'),memory?h('div',null,memory.photos[0]?h('img',{className:'now-memory-photo',src:memory.photos[0],alt:memory.title}):null,h('small',{className:'muted'},memory.date),h('h3',null,memory.title),h('p',{className:'now-excerpt'},(memory.memo||'그날의 이야기를 다시 펼쳐봐요.').slice(0,160))):h('p',{className:'muted'},'함께 웃었던 순간을 남겨두면, 여기서 다시 꺼내볼 수 있어요.'),h('button',{className:'btn ghost block',onClick:function(){go('together',memory?memory.id:undefined);}},memory?'그날의 기록 보기':'기록 남기기')),
      plans.length?h('section',{className:'card'},h('h2',{className:'title-lg'},'다가오는 우리의 날들'),plans.map(function(plan){return h('button',{key:plan.key,className:'now-plan',onClick:function(){go('together',plan.id);}},h('span',null,plan.date),h('strong',null,plan.title),h('span',{'aria-hidden':true},'↗'));})):null,
      h('section',{className:'card'},h('h2',{className:'title-lg'},'말보다 한 판?'),h('p',{className:'muted'},'같이 있는 지금, 짧은 승부로 웃어봐요.'),h('button',{className:'btn ghost block',onClick:function(){go('games');}},'둘이 게임하기')));
  }
  window.FutariHome = { Interior:function(props){return window.FutariInterior?h(window.FutariInterior.Interior,props):h(Interior,props);}, HomePage:HomePage,MemoryQuiz:MemoryQuiz,quizRound:quizRound, Decorator: Decorator, items: ITEMS, earned: earned, balance: balance, decorate: decorate, act: act, growth: growth, question: question, day:day };
  function farmIncome(d){return window.FutariFarm?window.FutariFarm.income(d):0;}
  function farmSpent(d){return window.FutariFarm?window.FutariFarm.spent(d):0;}
})();
