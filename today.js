/* Daily cards are personal inputs; shared completion funds the village. */
(function(){
  'use strict';
  var React=window.React,h=React.createElement;
  var TRAVEL=[['🌊 바다','🌲 숲속 오두막','🏙 도시 여행','♨️ 온천'],['🏝 조용한 섬','🏕 캠핑','🚆 기차 여행','🏡 호캉스'],['🌸 꽃구경','⛰ 등산','🎡 놀이공원','🖼 미술관']];
  var FOOD=[['🍜 따뜻한 국수','🍕 피자','🍣 초밥','🥘 집밥'],['🥩 고기 구이','🍝 파스타','🌶 떡볶이','🍔 햄버거'],['🥐 브런치','🍗 치킨','🍲 전골','🥗 가벼운 샐러드']];
  var QUESTIONS=['요즘 나랑 가장 해보고 싶은 작은 일은?','최근 내가 해준 일 중 고마웠던 건?','우리의 첫 여행에서 꼭 하고 싶은 건?','지금 내게 듣고 싶은 한마디는?','우리 집에 딱 하나를 더한다면?','다시 돌아가 보고 싶은 둘만의 하루는?','이번 주 우리에게 주고 싶은 선물은?','내가 발견한 너의 귀여운 습관은?','둘이 함께 배우고 싶은 건?','아무 계획 없는 주말, 어떻게 보내고 싶어?','요즘 가장 나누고 싶은 고민은?','다음 계절에는 어디로 떠나볼까?','오늘 나를 웃게 만든 순간은?','우리의 1년 뒤 하루를 상상한다면?'];
  var TOPICS=[
    ['지금 필요한 응원은?','말없이 안아주기','잘하고 있다고 말해주기','같이 해결책 찾기','웃긴 이야기 해주기'],
    ['둘만의 초능력을 고른다면?','순간이동','시간 멈추기','동물과 대화','꿈에서 만나기'],
    ['다음 만남의 작은 미션은?','서로 사진 찍어주기','처음 가는 골목 걷기','천 원 선물 고르기','노래 한 곡 나누기'],
    ['갑자기 생긴 한 시간에는?','아무 말 없이 쉬기','끝없는 수다','짧은 게임 한 판','함께 음악 듣기'],
    ['우리에게 어울리는 영화 장르는?','로맨틱 코미디','우당탕 모험','잔잔한 일상','반전 미스터리'],
    ['오늘 받고 싶은 메시지는?','오늘도 네 편이야','보고 싶어','수고했어 정말','재밌는 거 찾았어'],
    ['함께 새로 배운다면?','사진 찍기','악기 연주','춤추기','무언가 만들기'],
    ['서로 하루를 바꿔 산다면?','출근길 구경','친구들과 만나기','취미 체험','혼자만의 시간 체험'],
    ['우리만의 기념일을 만든다면?','처음 웃긴 날','화해한 날','아무 이유 없는 날','작은 도전 성공한 날'],
    ['함께 꾸릴 작은 가게는?','책방','꽃집','소품 공방','음반 가게'],
    ['오늘 나와 가장 가까운 동물은?','느긋한 고양이','신난 강아지','졸린 나무늘보','바쁜 다람쥐'],
    ['둘이 팀이 된다면 맡고 싶은 역할은?','아이디어 내기','계획 짜기','분위기 띄우기','든든하게 마무리'],
    ['비 오는 날 함께하고 싶은 건?','빗소리 듣기','보드게임','이불 속 영화','창가에서 수다'],
    ['둘만의 타임캡슐에 넣을 것은?','서로에게 쓴 편지','평범한 하루 사진','요즘 듣는 노래','미래의 우리에게 질문'],
    ['내 마음이 충전되는 순간은?','눈 맞추며 대화','함께 웃을 때','조용히 곁에 있을 때','작은 배려를 느낄 때'],
    ['우리의 예능 프로그램 이름은?','우당탕 둘이서','아무튼 우리 편','오늘도 티키타카','소소해서 좋아'],
    ['한 번 도전할 취미는?','도자기','클라이밍','필름 사진','합주'],
    ['잠들기 전 듣고 싶은 건?','오늘의 좋았던 일','내일의 작은 기대','엉뚱한 상상','조용한 잘 자 인사'],
    ['오늘 선물할 수 있는 것은?','집중해서 듣는 10분','손으로 쓴 한 문장','좋아할 노래 한 곡','귀여운 사진 한 장'],
    ['함께 무인도에 간다면?','차분하게 집 짓기','탐험부터 하기','구조 신호 만들기','일단 서로 진정시키기'],
    ['우리의 추억을 남길 방법은?','목소리 녹음','네 컷 사진','짧은 일기','같은 장면 그리기'],
    ['다툰 뒤 다가오는 방법은?','조금 쉬고 대화','먼저 안아주기','메시지로 마음 정리','함께 걸으며 이야기'],
    ['단 하루 어린이로 돌아가면?','놀이터 정복','장난감 조립','만화 몰아보기','비밀 기지 만들기'],
    ['둘만의 소소한 전통은?','만날 때 사진 한 장','한 주의 웃긴 일 공유','월말 편지','매달 새로운 도전'],
    ['오늘 함께 듣고 싶은 분위기는?','잔잔한 어쿠스틱','신나는 댄스','추억의 노래','가사 없는 연주'],
    ['좋아하는 애정 표현은?','구체적인 칭찬','먼저 잡아주는 손','기억해둔 작은 취향','함께 보내는 시간'],
    ['함께 완성할 작품은?','짧은 영상','둘만의 플레이리스트','사진 앨범','이상한 보드게임'],
    ['약속 없는 휴일의 시작은?','늦잠 후 스트레칭','창문 열고 음악','서로 꿈 이야기','즉흥적으로 나가기'],
    ['미래의 우리에게 남길 말은?','계속 많이 웃자','작은 것도 고마워하자','서로의 편이 되자','새로운 걸 해보자'],
    ['오늘 우리 사이의 날씨는?','포근한 햇살','기분 좋은 바람','촉촉한 이슬비','반짝이는 별밤']
  ];
  function topic(type,date){return TOPICS[(index(date)+(type==='imagine'?15:0))%TOPICS.length];}
  function index(date){return Math.floor(Date.parse(date+'T00:00:00Z')/86400000);}
  function options(type,date){if(type==='moment'||type==='imagine')return topic(type,date).slice(1);return (type==='travel'?TRAVEL:FOOD)[index(date)%3];}
  function question(date){return QUESTIONS[index(date)%QUESTIONS.length];}
  function ChoiceCard(props){var d=props.data,date=props.date,type=props.kind,who=props.member,e=(d.together||{})[date]||{},values=e[type]||{},both=values.me!==undefined&&values.you!==undefined,items=options(type,date);
    return h('section',{className:'today-choice card choice-'+type},h('span',{className:'eyebrow'},type==='moment'?'A LITTLE DISCOVERY':'JUST IMAGINE'),h('h2',{className:'title-lg'},(type==='moment'||type==='imagine')?topic(type,date)[0]:(type==='travel'?'같이 떠난다면?':'오늘 먹고 싶은 건?')),h('p',{className:'muted'},'정답은 없어요. 오늘의 너와 가장 가까운 선택은?'),h('div',{className:'today-options'},items.map(function(label,i){return h('button',{key:label,className:values[who]===i?'selected':'',disabled:both,'aria-pressed':values[who]===i,onClick:function(){props.update(function(d){window.FutariHome.act(d,date,who,type,i);});}},label);})),
      both?h('div',{className:'today-reveal','aria-live':'polite'},h('strong',null,values.me===values.you?'통했어요! 같은 마음 💛':'다른 취향도 알아가는 중 💛'),h('p',null,d.settings.me+' · '+items[values.me],h('br'),d.settings.you+' · '+items[values.you])):h('p',{className:'today-wait','aria-live':'polite'},values[who]!==undefined?'선택했어요. 상대도 고르면 둘의 취향이 열려요.':'하나를 골라봐요. 둘 다 고르면 서로의 선택이 열려요.'));
  }
  function TodayPage(props){
    var home=window.FutariHome,d=props.data,who=props.member,other=who==='me'?'you':'me',date=home.day(),e=(d.together||{})[date]||{},moods=e.moods||{},reactions=e.reactions||{},notes=e.notes||{},activity=e.activity||{},both=!!(notes.me&&notes.you);
    var state=React.useState(notes[who]||''),draft=state[0],setDraft=state[1];
    function act(type,value){props.update(function(d){home.act(d,date,who,type,value);});}
    return h('div',{className:'today-page'},h('header',{className:'today-heading'},h('p',{className:'eyebrow'},'FUTARI · A LITTLE CLOSER EVERY DAY'),h('h1',{className:'title-xl'},'오늘 우리'),h('p',{className:'muted'},date.replace(/-/g,'.')+' · 작은 선택으로 서로를 알아가요.')),
      h('section',{className:'card today-mood'},h('span',{className:'eyebrow'},'HOW ARE YOU TODAY?'),h('h2',{className:'title-lg'},'오늘의 나는'),h('div',{className:'mood-grid'},['🥰','😊','😐','😴','😢'].map(function(m,i){return h('button',{key:m,className:'mood'+(moods[who]===m?' on':''),'aria-label':['사랑 가득','기분 좋아','평범해','피곤해','속상해'][i],'aria-pressed':moods[who]===m,onClick:function(){act('moods',m);}},m);})),h('div',{className:'partner-status'},moods[other]?d.settings[other]+'의 오늘 '+moods[other]:'상대의 오늘 기분을 기다리고 있어요.'),moods[other]?h('button',{className:'btn ghost block',disabled:!!reactions[who],onClick:function(){act('reactions','🫶');}},reactions[who]?'마음을 보냈어요 🫶':'마음 보내기 🫶'):null,reactions[other]?h('p',{className:'muted'},d.settings[other]+'님이 마음을 보냈어요 🫶'):null),
      h(ChoiceCard,Object.assign({},props,{date:date,kind:'moment'})),h(ChoiceCard,Object.assign({},props,{date:date,kind:'imagine'})),
      h('section',{className:'card today-question'},h('span',{className:'eyebrow'},'A QUESTION FOR US · '+(index(date)%QUESTIONS.length+1)),h('h2',{className:'title-lg'},'오늘의 질문카드'),h('blockquote',null,question(date)),h('label',{htmlFor:'today-answer'},d.settings[who]+'의 답변'),h('textarea',{id:'today-answer',value:draft,maxLength:300,rows:3,placeholder:'길지 않아도 좋아요. 오늘의 생각을 남겨주세요.',onChange:function(ev){setDraft(ev.target.value);}}),h('div',{className:'today-answer-footer'},h('small',null,draft.length+' / 300'),h('button',{className:'btn sm',disabled:!draft.trim()||draft.trim()===notes[who],onClick:function(){act('notes',draft.trim());}},notes[who]?'답변 수정':'답변 남기기')),
        both?h('div',{className:'today-reveal','aria-live':'polite'},['me','you'].map(function(w){return h('div',{key:w},h('strong',null,d.settings[w]+'의 답변'),h('p',{className:'answer-text'},notes[w]));})):h('p',{className:'today-wait','aria-live':'polite'},notes[who]?'답변을 저장했어요. 상대도 답하면 함께 열려요.':'둘 다 답하면 서로의 답변을 볼 수 있어요.')),
      h('section',{className:'card'},h('h2',{className:'title-lg'},'🌿 오늘 함께한 작은 시간'),h('p',{className:'muted'},'함께 산책했거나 잠깐이라도 같이 쉬었나요? 오늘의 작은 시간을 기록해요.'),h('button',{className:'btn block',disabled:!!activity[who],onClick:function(){act('activity',true);}},activity[who]?activity[other]?'함께한 시간을 남겼어요 ✓':'상대의 확인을 기다려요 ✓':'함께했어요')),
      h('p',{className:'today-outro'},'어제와 다른 오늘의 너를, 조금씩 알아가는 시간.'));
  }
  window.FutariToday={TodayPage:TodayPage,ChoiceCard:ChoiceCard,options:options,topic:topic,question:question};
})();
