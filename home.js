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
  function HomePage(props) {
    var d = props.data, who = props.member, other = who === 'me' ? 'you' : 'me', date = day();
    var e = (d.together || {})[date] || {}, moods = e.moods || {}, choices = e.choices || {}, reactions = e.reactions || {}, activity = e.activity || {};
    var q = question(date), ready = choices.me !== undefined && choices.you !== undefined, points = growth(d), stage = Math.min(4, Math.floor(points / 10));
    function choose(type, value) { props.update(function (next) { act(next, date, who, type, value); }); }
    return h('div', null,
      h('div', { className: 'home-heading' }, h('p', { className: 'eyebrow' }, 'FUTARI · OUR LITTLE HOME'), h('h1', { className: 'title-xl' }, d.settings.me + '와 ' + d.settings.you + '의 작은 집'), h('p', { className: 'muted' }, '가볍게 누르고, 함께 쌓아가요.')),
      h('section', { className: 'house', 'aria-label': '우리 집 성장 ' + (stage+1) + '단계' }, h('div', { className: 'house-window' }, '☀️'), h('div', { className: 'house-shelf' }, '📚', stage >= 1 ? ' 🌱' : '', stage >= 2 ? ' 💡' : ''), h('div', { className: 'house-sofa' }, '🛋️'), h('div', { className: 'house-people' }, h('span', null, moods.me || '🙂'), h('span', null, moods.you || '🙂')), stage >= 3 ? h('div', { className: 'house-rug' }, '🌼 포근한 우리 집 🌼') : null, stage >= 4 ? h('div', { className: 'house-cat' }, '🐈') : null),
      h('div', { className: 'growth-strip' }, h('strong', null, ['처음 꾸민 집','화분이 생겼어요','조명이 켜졌어요','러그가 생겼어요','고양이가 놀러 왔어요'][stage]), h('span', null, points + '개의 마음'), h('progress', { max: 10, value: stage === 4 ? 10 : points % 10, 'aria-label': '다음 집 변화까지' }), h('small', null, stage === 4 ? '앞으로도 우리의 시간이 쌓여요' : (10-points%10) + '개의 마음이 모이면 집이 달라져요')),
      h('section', { className: 'card' }, h('h2', { className: 'title-lg' }, '오늘의 나는?'), h('p', { className: 'muted' }, '기분 하나만 골라도 충분해요.'), h('div', { className: 'mood-grid' }, ['🥰','😊','😐','😴','😢'].map(function (m, i) { return h('button', { key: m, className: 'mood' + (moods[who] === m ? ' on' : ''), 'aria-label': ['사랑 가득','기분 좋아','평범해','피곤해','속상해'][i], 'aria-pressed': moods[who] === m, onClick: function () { choose('moods', m); } }, m); })), h('div', { className: 'partner-status', 'aria-live': 'polite' }, moods[other] ? d.settings[other] + '의 오늘 ' + moods[other] : '상대가 들어오면 오늘 기분을 여기서 볼 수 있어요.'), moods[other] ? h('button', { className: 'btn ghost block', disabled: !!reactions[who], onClick: function () { choose('reactions', '🫶'); } }, reactions[who] ? '마음을 보냈어요 🫶' : '마음 보내기 🫶') : null, reactions[other] ? h('p', { className: 'muted' }, d.settings[other] + '님이 마음을 보냈어요 🫶') : null),
      h('section', { className: 'card' }, h('span', { className: 'pill pink' }, '하루 한 번 · 둘이 고르기'), h('h2', { className: 'title-lg', style: { marginTop: 12 } }, q[0]), h('div', { className: 'choice-grid' }, q.slice(1).map(function (label, i) { return h('button', { key: label, className: 'choice' + (choices[who] === i ? ' selected' : ''), disabled: ready, 'aria-pressed': choices[who] === i, onClick: function () { choose('choices', i); } }, label); })), h('p', { className: 'muted', 'aria-live': 'polite' }, ready ? (choices.me === choices.you ? '같은 마음이네요! ' : '서로 다른 취향도 발견했어요. ') + '추억에 남겼어요 💛' : choices[who] !== undefined ? '선택했어요! 상대가 고르면 둘의 결과가 열려요.' : '글 대신 하나만 골라주세요.'), ready ? h('div', { className: 'result' }, d.settings.me + ': ' + q[choices.me+1], h('br'), d.settings.you + ': ' + q[choices.you+1]) : null),
      h('section', { className: 'card' }, h('h2', { className: 'title-lg' }, '🌿 오늘 함께한 작은 시간'), h('p', { className: 'muted' }, '같이 산책했거나, 잠깐이라도 함께 쉬었나요? 둘 다 누르면 추억이 생겨요.'), h('button', { className: 'btn block', disabled: !!activity[who], onClick: function () { choose('activity', true); } }, activity[who] ? (activity[other] ? '우리의 시간으로 남겼어요 ✓' : '상대의 확인을 기다려요 ✓') : '함께했어요'), h('p', { className: 'muted' }, '쉬어 가도 괜찮아요. 쌓인 마음은 사라지지 않아요.')));
  }
  window.FutariHome = { HomePage: HomePage, act: act, growth: growth, question: question };
})();
