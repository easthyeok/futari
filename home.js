/* 선택과 반응으로 쌓이는 둘만의 집 */
(function () {
  'use strict';
  var h = window.React.createElement;
  var QUESTIONS = [ ['오늘 같이 보낼 시간은?', '느긋하게 쉬기', '밖으로 나가기'], ['다음 데이트는?', '동네 산책', '영화 보기'], ['오늘 당기는 음식은?', '따뜻한 한식', '바삭한 피자'], ['우리 집에 놓고 싶은 건?', '초록 화분', '포근한 조명'], ['함께 듣고 싶은 음악은?', '잔잔한 음악', '신나는 음악'], ['주말 아침은?', '늦잠 자기', '브런치 먹기'], ['같이 떠난다면?', '바다', '숲'] ];
  function day() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
  function question(date) { return QUESTIONS[Math.floor(Date.parse(date + 'T00:00:00Z') / 86400000) % QUESTIONS.length]; }
  function entry(d, date) { if (!d.together) d.together = {}; if (!d.together[date]) d.together[date] = { moods: {}, choices: {}, reactions: {}, activity: {} }; var e = d.together[date]; ['moods','choices','reactions','activity'].forEach(function (key) { if (!e[key]) e[key] = {}; }); return e; }
  function remember(d, date, type, title, memo) {
    var id = 'together-' + date + '-' + type;
    if (!d.memories.some(function (m) { return m.id === id; })) d.memories.push({ id: id, date: date, title: title, memo: memo, automatic: true });
  }
  function act(d, date, who, type, value) {
    if(['me','you'].indexOf(who)<0 || ['moods','choices','reactions','activity'].indexOf(type)<0)return;
    if(type==='choices' && value!==0 && value!==1)return;
    var e = entry(d, date), other = who === 'me' ? 'you' : 'me';
    if (type === 'reactions' && !e.moods[other]) return;
    if (type === 'choices' && e.choices.me !== undefined && e.choices.you !== undefined) return;
    e[type][who] = value;
    if (type === 'choices' && e.choices.me !== undefined && e.choices.you !== undefined) {
      var q = question(date); remember(d, date, 'choices', '💛 오늘 둘이 고른 것', q[0] + '\n' + d.settings.me + ': ' + q[e.choices.me+1] + '\n' + d.settings.you + ': ' + q[e.choices.you+1]);
    }
    if (type === 'activity' && e.activity.me && e.activity.you) remember(d, date, 'activity', '🌿 함께한 작은 시간', '오늘 둘이 산책하거나 함께 쉬었어요.');
  }
  function growth(d) { return Object.keys(d.together || {}).reduce(function (sum, date) { var e = d.together[date]; return sum + Object.keys(e.moods || {}).length + Object.keys(e.reactions || {}).length + (e.choices && e.choices.me !== undefined && e.choices.you !== undefined ? 3 : 0) + (e.activity && e.activity.me && e.activity.you ? 3 : 0); }, 0); }
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
  function earned(d) {
    var total = growth(d) * 3;
    Object.keys(d.together || {}).forEach(function(date) {
      var e = d.together[date];
      if (e.moods && e.moods.me && e.moods.you && e.choices && e.choices.me !== undefined && e.choices.you !== undefined && e.activity && e.activity.me && e.activity.you) total += 12;
    });
    // One completed match per local calendar day; rematches never farm coins.
    var dates = {};
    (d.gameResults || []).forEach(function(r) { if(r.kind==='omok' && r.endedAt && ['me','you','draw'].indexOf(r.winner)>=0) { var t=new Date(r.endedAt); if(!isNaN(t)) dates[t.getFullYear()+'-'+(t.getMonth()+1)+'-'+t.getDate()]=true; } });
    return total + Object.keys(dates).length * 15;
  }
  function owned(d) { return (d.house || {}).owned || []; }
  function balance(d) { return earned(d) - ITEMS.reduce(function(sum,item) { return sum + (owned(d).indexOf(item.id)>=0 ? item.cost : 0); },0); }
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
      h('div',{className:'furniture-grid'},ITEMS.filter(function(i){return filter==='all'||filter==='owned'&&owned(d).indexOf(i.id)>=0||i.slot===filter;}).map(function(item){var has=owned(d).indexOf(item.id)>=0,on=eq[item.slot]===item.id;return h('article',{key:item.id,className:'furniture'+(on?' equipped':'')},h('span',{className:'furniture-icon','aria-hidden':true},item.icon),h('strong',null,item.name),h('small',null,has?'우리의 물건':'💛 '+item.cost),h('button',{className:'btn ghost sm',disabled:!has&&money<item.cost,onClick:function(){props.update(function(next){decorate(next,item.id);});}},on?'치우기':has?'배치하기':money<item.cost?(item.cost-money)+' 코인 더 모으기':'구매 · 배치'));})),filter==='owned'&&!owned(d).length?h('p',{className:'muted'},'첫 가구를 골라볼까요? 기분을 남기면 3 코인이 쌓여요.'):null);
  }
  function HomePage(props) {
    var d = props.data, who = props.member, other = who === 'me' ? 'you' : 'me', date = day();
    var e = (d.together || {})[date] || {}, moods = e.moods || {}, choices = e.choices || {}, reactions = e.reactions || {}, activity = e.activity || {};
    var q = question(date), ready = choices.me !== undefined && choices.you !== undefined, points = growth(d), stage = Math.floor(points / 20), eq=(d.house||{}).equipped||{};
    function item(slot) { return ITEMS.find(function(i){return i.id===eq[slot]&&i.slot===slot;}); }
    var wall=item('wall'),floor=item('floor'),done=[!!(moods.me&&moods.you),ready,!!(activity.me&&activity.you)].filter(Boolean).length;
    function choose(type, value) { props.update(function (next) { act(next, date, who, type, value); }); }
    return h('div', null,
      h('div', { className: 'home-heading' }, h('p', { className: 'eyebrow' }, 'FUTARI · OUR LITTLE HOME'), h('h1', { className: 'title-xl' }, d.settings.me + '와 ' + d.settings.you + '의 작은 집'), h('p', { className: 'muted' }, '오늘의 마음이 내일의 우리 집이 돼요.')),
      h('section', { className: 'house', style:{background:'linear-gradient('+(wall?wall.color:'#fff6df')+' 72%, '+(floor?floor.color:'#e4c3a5')+' 72%)'}, 'aria-label': '둘이 꾸민 우리 집' }, h('div', { className: 'house-window' }, wall&&wall.id==='night'?'🌙':'☀️'), h('div', { className: 'house-shelf' }, '📚',item('plant')?item('plant').icon:'',item('lamp')?item('lamp').icon:''), h('div', { className: 'house-sofa' }, '🛋️'), h('div', { className: 'house-people' }, h('span', null, moods.me || '🙂'), h('span', null, moods.you || '🙂')), item('rug') ? h('div', { className: 'house-rug' }, item('rug').icon+' 포근한 우리 집 '+item('rug').icon) : null, item('pet') ? h('div', { className: 'house-cat' }, item('pet').icon) : null),
      h('div', { className: 'growth-strip' }, h('strong', null, '우리 집 Lv. '+(stage+1)), h('span', null, '💛 '+balance(d)+' 마음 코인'), h('progress', { max: 20, value: points % 20, 'aria-label': '다음 집 레벨까지' }), h('small', null, '마음 '+(20-points%20)+'개를 더 나누면 다음 레벨 · 모은 코인은 함께 사용해요')),
      h('section',{className:'card daily-missions'},h('span',{className:'pill pink'},'TODAY · '+done+'/3'),h('h2',{className:'title-lg'},'오늘도, 둘이 한 걸음'),h('p',{className:'muted'},'기분과 응원은 각각 3 코인, 둘이 고르기와 함께한 시간은 각각 9 코인!'),h('div',{className:'mission-list'},[['둘 다 기분 남기기',!!(moods.me&&moods.you)],['오늘의 선택 함께 열기',ready],['함께한 시간 둘 다 확인하기',!!(activity.me&&activity.you)]].map(function(m){return h('div',{key:m[0]},h('span',null,m[1]?'✅':'○'),h('span',null,m[0]));})),h('p',{className:'mission-bonus',role:'status'},done===3?'🎉 오늘의 공동 미션 완성! 보너스 12 코인이 쌓였어요.':'세 가지를 모두 완성하면 보너스 💛 12'),h('small',{className:'muted'},'오목도 하루 한 판을 마치면 둘의 지갑에 15 코인. 승패는 상관없어요.')),
      h(Decorator,props),
      h('section', { className: 'card' }, h('h2', { className: 'title-lg' }, '오늘의 나는?'), h('p', { className: 'muted' }, '기분 하나만 골라도 충분해요.'), h('div', { className: 'mood-grid' }, ['🥰','😊','😐','😴','😢'].map(function (m, i) { return h('button', { key: m, className: 'mood' + (moods[who] === m ? ' on' : ''), 'aria-label': ['사랑 가득','기분 좋아','평범해','피곤해','속상해'][i], 'aria-pressed': moods[who] === m, onClick: function () { choose('moods', m); } }, m); })), h('div', { className: 'partner-status', 'aria-live': 'polite' }, moods[other] ? d.settings[other] + '의 오늘 ' + moods[other] : '상대가 들어오면 오늘 기분을 여기서 볼 수 있어요.'), moods[other] ? h('button', { className: 'btn ghost block', disabled: !!reactions[who], onClick: function () { choose('reactions', '🫶'); } }, reactions[who] ? '마음을 보냈어요 🫶' : '마음 보내기 🫶') : null, reactions[other] ? h('p', { className: 'muted' }, d.settings[other] + '님이 마음을 보냈어요 🫶') : null),
      h('section', { className: 'card' }, h('span', { className: 'pill pink' }, '하루 한 번 · 둘이 고르기'), h('h2', { className: 'title-lg', style: { marginTop: 12 } }, q[0]), h('div', { className: 'choice-grid' }, q.slice(1).map(function (label, i) { return h('button', { key: label, className: 'choice' + (choices[who] === i ? ' selected' : ''), disabled: ready, 'aria-pressed': choices[who] === i, onClick: function () { choose('choices', i); } }, label); })), h('p', { className: 'muted', 'aria-live': 'polite' }, ready ? (choices.me === choices.you ? '같은 마음이네요! ' : '서로 다른 취향도 발견했어요. ') + '추억에 남겼어요 💛' : choices[who] !== undefined ? '선택했어요! 상대가 고르면 둘의 결과가 열려요.' : '글 대신 하나만 골라주세요.'), ready ? h('div', { className: 'result' }, d.settings.me + ': ' + q[choices.me+1], h('br'), d.settings.you + ': ' + q[choices.you+1]) : null),
      h('section', { className: 'card' }, h('h2', { className: 'title-lg' }, '🌿 오늘 함께한 작은 시간'), h('p', { className: 'muted' }, '같이 산책했거나, 잠깐이라도 함께 쉬었나요? 둘 다 누르면 추억이 생겨요.'), h('button', { className: 'btn block', disabled: !!activity[who], onClick: function () { choose('activity', true); } }, activity[who] ? (activity[other] ? '우리의 시간으로 남겼어요 ✓' : '상대의 확인을 기다려요 ✓') : '함께했어요'), h('p', { className: 'muted' }, '쉬어 가도 괜찮아요. 쌓인 마음은 사라지지 않아요.')));
  }
  window.FutariHome = { HomePage: HomePage, Decorator: Decorator, items: ITEMS, earned: earned, balance: balance, decorate: decorate, act: act, growth: growth, question: question };
})();
