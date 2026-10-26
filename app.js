/* futari ふたり 💑 — 순수 JS (JSX/Babel 불필요) */
(function () {
  'use strict';
  var React = window.React, ReactDOM = window.ReactDOM;
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, useMemo = React.useMemo;

  // h(tag, props, ...children) — React.createElement 짧은 래퍼
  function h() {
    var args = Array.prototype.slice.call(arguments);
    return React.createElement.apply(React, args);
  }

  /* ===== 저장소 ===== */
  var STORE_KEY = 'couple_timeline_v1';
  function freshData() {
    var starter = {
      settings: { me: '나', you: '너', startDate: '', anniversaries: [] },
      memories: [], places: [], buckets: [], dates: [], moods: [], polls: [], answers: {}, together: {}, house: { owned: [], equipped: {} }, boardGames: {}, gameResults: [], dodge: {}, farm: { level: 0, buildings: {}, crops: {}, seedSpent: 0, harvestCoins: 0, harvests: 0 },
    };
    return window.FutariData?window.FutariData.migrate(starter):starter;
  }
  function normalizeData(raw) {
    var d = Object.assign(freshData(), raw || {});
    d.settings = Object.assign(freshData().settings, d.settings);
    d.together = d.together || {};
    d.house = d.house || { owned: [], equipped: {} };
    d.boardGames = d.boardGames || {};
    d.gameResults = d.gameResults || [];
    d.dodge = d.dodge || {};
    d.farm = d.farm || freshData().farm;
    return window.FutariData ? window.FutariData.migrate(d) : d;
  }
  function loadData() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return freshData();
      var p = JSON.parse(raw);
      var base = freshData();
      base.settings = Object.assign(base.settings, p.settings || {});
      base.memories = p.memories || [];
      base.places = p.places || [];
      base.buckets = p.buckets || [];
      base.dates = p.dates || [];
      base.moods = p.moods || [];
      base.polls = p.polls || [];
      base.answers = p.answers || {};
      base.together = p.together || {};
      base.house = p.house || base.house;
      base.boardGames = p.boardGames || {};
      base.gameResults = p.gameResults || [];
      base.dodge = p.dodge || {};
      base.farm = p.farm || base.farm;
      return normalizeData(p);
    } catch (e) { console.warn('load failed', e); return freshData(); }
  }
  function saveData(d) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(d)); }
    catch (e) { alert('저장 공간이 부족해요. 사진 용량이 너무 크면 저장이 안 될 수 있어요.'); }
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ===== Supabase 공유 DB ===== */
  var ROOM_KEY = 'futari_room_code';
  function getRoomCode() { try { return localStorage.getItem(ROOM_KEY) || ''; } catch (e) { return ''; } }
  function setRoomCode(code) { try { if (code) localStorage.setItem(ROOM_KEY, code); else localStorage.removeItem(ROOM_KEY); } catch (e) {} }

  var roomVersions = {};
  function cacheRoom(code, data, pending) { try { localStorage.setItem('futari_cache_' + code, JSON.stringify({ data: data, pending: pending, version: roomVersions[code] })); } catch (e) {} }
  function cachedRoom(code) { try { return window.FutariPreservation.cached(localStorage,code); } catch (e) { return null; } }
  var sb = null;
  function getSupabase() {
    if (sb) return sb;
    var cfg = window.FUTARI_CONFIG;
    if (!cfg || !window.supabase || !cfg.SUPABASE_URL) return null;
    try { sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY); return sb; }
    catch (e) { console.warn('supabase init failed', e); return null; }
  }

  function checkedRoom(raw,code){try{if(window.FutariData)window.FutariData.backup(localStorage,code,raw);return normalizeData(raw);}catch(e){e.migration=true;throw e;}}
  // 방 데이터 불러오기 (없으면 새로 만듦)
  function cloudLoad(code, acceptVersion) {
    var client = getSupabase();
    if (!client) return Promise.reject(new Error('Supabase 미설정'));
    return client.from('rooms').select('data,updated_at').eq('code', code).maybeSingle().then(function (res) {
      if (res.error) throw res.error;
      if (res.data && res.data.data) { var normalized=checkedRoom(res.data.data,code); if (!acceptVersion || acceptVersion(res.data.updated_at)) roomVersions[code] = res.data.updated_at; return normalized; }
      // 방이 없으면 빈 데이터로 생성
      return client.from('rooms').insert({ code: code, data: freshData(), updated_at: new Date().toISOString() }).select('updated_at').single().then(function (created) { if (created.error) throw created.error; if (!acceptVersion || acceptVersion(created.data.updated_at)) roomVersions[code] = created.data.updated_at; return freshData(); });
    });
  }
  // 읽었던 버전이 유지된 경우에만 저장
  function cloudSave(code, data) {
    var client = getSupabase();
    if (!client) return Promise.reject(new Error('Supabase 미설정'));
    if (!Object.prototype.hasOwnProperty.call(roomVersions, code)) return Promise.reject(new Error('먼저 연결을 확인해주세요'));
    var stamp = new Date().toISOString();
    var query = client.from('rooms').update({ data: data, updated_at: stamp }).eq('code', code);
    query = roomVersions[code] == null ? query.is('updated_at', null) : query.eq('updated_at', roomVersions[code]);
    return query.select('updated_at').then(function (res) {
      if (res.error) throw res.error;
      if (!res.data || !res.data.length) throw new Error('상대가 먼저 변경했어요. 현재 내용을 백업한 뒤 상대 변경을 불러와주세요.');
      roomVersions[code] = res.data[0].updated_at;
      return true;
    });
  }

  function cloudCommit(code,data,version){
    var client=getSupabase();if(!client)return Promise.reject(new Error('Supabase 미설정'));
    var stamp=new Date().toISOString().replace('Z',String(Math.floor(Math.random()*1000)).padStart(3,'0')+'Z');
    var q=client.from('rooms').update({data:data,updated_at:stamp}).eq('code',code);
    q=version==null?q.is('updated_at',null):q.eq('updated_at',version);
    return q.select('updated_at').then(function(res){if(res.error)throw res.error;if(!res.data||!res.data.length){var e=Error('저장 버전 변경');e.cas=true;throw e;}roomVersions[code]=res.data[0].updated_at;return{version:res.data[0].updated_at};});
  }
  /* ===== 날짜 ===== */
  function todayStr() { return localDate(new Date()); }
  function daysBetween(a, b) {
    var d1 = new Date(a + 'T00:00:00'), d2 = new Date(b + 'T00:00:00');
    return Math.round((d2 - d1) / 86400000);
  }
  function fmtK(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr + 'T00:00:00');
    var days = ['일', '월', '화', '수', '목', '금', '토'];
    return d.getFullYear() + '.' + (d.getMonth() + 1) + '.' + d.getDate() + ' (' + days[d.getDay()] + ')';
  }
  function upcomingMilestones(startDate, extra) {
    if (!startDate) return [];
    var today = todayStr();
    var passed = daysBetween(startDate, today);
    var list = [];
    for (var n = 100; n <= Math.ceil((passed + 400) / 100) * 100; n += 100) {
      var d = new Date(startDate + 'T00:00:00'); d.setDate(d.getDate() + n);
      var ds = d.toISOString().slice(0, 10); var left = daysBetween(today, ds);
      if (left >= 0 && left <= 365) list.push({ label: n + '일', date: ds, left: left });
    }
    var start = new Date(startDate + 'T00:00:00');
    for (var y = 1; y <= 10; y++) {
      var dy = new Date(start); dy.setFullYear(start.getFullYear() + y);
      var dsy = dy.toISOString().slice(0, 10); var lefty = daysBetween(today, dsy);
      if (lefty >= 0 && lefty <= 365) list.push({ label: y + '주년', date: dsy, left: lefty });
    }
    (extra || []).forEach(function (a) {
      if (!a.date) return;
      var m = new Date(a.date + 'T00:00:00');
      for (var yy = 0; yy <= 2; yy++) {
        var dd = new Date(m); dd.setFullYear(new Date().getFullYear() + yy);
        var dsa = dd.toISOString().slice(0, 10); var la = daysBetween(today, dsa);
        if (la >= 0 && la <= 365) list.push({ label: a.name || '기념일', date: dsa, left: la });
      }
    });
    return list.sort(function (a, b) { return a.left - b.left; }).slice(0, 5);
  }

  /* ===== 상수 ===== */
  var QUESTIONS = [
    '처음 만났을 때 서로의 첫인상은?', '올해 꼭 같이 가보고 싶은 곳은?', '상대의 가장 사랑스러운 순간은 언제였어?',
    '우리 둘만의 비밀 암호를 만든다면?', '10년 뒤 우리는 어떤 모습일까?', '최근 상대에게 가장 고마웠던 일은?',
    '같이 키우고 싶은 반려동물이 있다면?', '서로를 음식에 비유하면?', '다음 데이트에서 하고 싶은 건?',
    '상대의 어떤 습관이 제일 귀여워?', '함께 들으면 좋은 우리 노래는?', '서로에게 지어주고 싶은 별명은?',
    '같이 도전해보고 싶은 취미는?', '상대가 해준 말 중 가장 기억에 남는 건?', '우리가 처음으로 같이 먹은 음식 기억나?'
  ];
  var BADGES = [
    { id: 'first_memory', ico: '📸', name: '첫 추억', cond: function (d) { return d.memories.length >= 1; } },
    { id: 'ten_memory', ico: '📚', name: '추억 10개', cond: function (d) { return d.memories.length >= 10; } },
    { id: 'first_answer', ico: '💬', name: '첫 대화', cond: function (d) { return Object.keys(d.answers).some(function (key) { var a = d.answers[key]; return a && (a.me || a.you); }); } },
    { id: 'mood_days', ico: '🌈', name: '기분 5일', cond: function (d) { return new Set(d.moods.map(function (m) { return m.date; })).size >= 5; } },
    { id: 'first_bucket', ico: '⭐', name: '첫 버킷', cond: function (d) { return d.buckets.length >= 1; } },
    { id: 'achiever', ico: '🏆', name: '달성 3개', cond: function (d) { return d.buckets.filter(function (b) { return b.done; }).length >= 3; } },
    { id: 'planner', ico: '📅', name: '첫 데이트 계획', cond: function (d) { return d.dates.length >= 1; } },
    { id: 'hundred', ico: '💯', name: '100일 돌파', cond: function (d) { return d.settings.startDate && daysBetween(d.settings.startDate, todayStr()) >= 100; } }
  ];
  var LEVELS = ['새싹 커플 🌱', '설레는 커플 💓', '알콩달콩 💕', '단단한 커플 💪', '베테랑 커플 🏅', '소울메이트 ✨', '레전드 커플 👑'];
  function calcLevel(d) {
    var pts = d.memories.length * 2 + d.places.length * 3 + d.buckets.filter(function (b) { return b.done; }).length * 5 + d.dates.length;
    return Math.min(LEVELS.length - 1, Math.floor(pts / 15));
  }

  /* ===== 공통 모달 ===== */
  function Modal(props) {
    return h('div', { className: 'modal-bg', onClick: props.onClose },
      h('div', { className: 'modal-box', onClick: function (e) { e.stopPropagation(); } }, props.children));
  }

  /* ===== 홈 ===== */
  function HomePage(props) {
    var data = props.data, s = data.settings;
    var dday = s.startDate ? daysBetween(s.startDate, todayStr()) + 1 : null;
    var milestones = upcomingMilestones(s.startDate, s.anniversaries);
    var level = calcLevel(data);
    var t = new Date(); t.setFullYear(t.getFullYear() - 1);
    var lastYearDs = t.toISOString().slice(0, 10);
    var lastYear = data.memories.filter(function (m) { return m.date === lastYearDs; });
    var gotBadges = BADGES.filter(function (b) { return b.cond(data); });

    return h('div', null,
      h('div', { className: 'hero' },
        h('div', { className: 'names' }, s.me + ' 💖 ' + s.you),
        dday != null
          ? h('div', null, h('div', { className: 'dday' }, 'D+' + dday), h('div', { className: 'sub' }, fmtK(s.startDate) + '부터 함께'))
          : h('div', { className: 'sub', style: { marginTop: 8 } }, '설정에서 만난 날을 등록해보세요')
      ),
      h('div', { className: 'card' },
        h('p', { className: 'title-lg' }, '🎉 다가오는 기념일'),
        milestones.length === 0
          ? h('p', { className: 'muted' }, '만난 날을 등록하면 기념일을 챙겨드려요.')
          : milestones.map(function (m, i) {
            return h('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < milestones.length - 1 ? '1px solid #ffe8ef' : 'none' } },
              h('span', { style: { fontWeight: 700 } }, m.label),
              h('span', { className: 'muted' }, fmtK(m.date)),
              h('span', { className: 'pill pink' }, m.left === 0 ? '오늘!' : 'D-' + m.left));
          })
      ),
      h('div', { className: 'card' },
        h('p', { className: 'title-lg' }, '⏳ 작년 오늘'),
        lastYear.length === 0
          ? h('p', { className: 'muted' }, '작년 오늘의 추억이 아직 없어요.')
          : lastYear.map(function (m) {
            return h('div', { key: m.id, className: 'item', style: { marginBottom: 8 } },
              h('div', { className: 't' }, m.title),
              m.photo ? h('img', { className: 'thumb', src: m.photo, alt: '' }) : null,
              m.memo ? h('div', { className: 'm' }, m.memo) : null);
          })
      ),
      h('div', { className: 'card' },
        h('p', { className: 'title-lg' }, '📊 우리 기록'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, textAlign: 'center' } },
          Stat(data.memories.length, '추억'), Stat(Object.keys(data.answers).filter(function (key) { var a = data.answers[key]; return a && (a.me || a.you); }).length, '대화'),
          Stat(data.buckets.filter(function (b) { return b.done; }).length, '달성'), Stat(data.dates.length, '약속'))
      ),
      h('div', { className: 'card' },
        h('p', { className: 'title-lg' }, '👑 레벨'),
        h('div', { className: 'center', style: { fontSize: 18, fontWeight: 800, color: '#ff3d7f', marginBottom: 6 } }, LEVELS[level]),
        h('div', { className: 'bar' }, h('div', { style: { width: ((level + 1) / LEVELS.length * 100) + '%' } })),
        h('p', { className: 'muted center', style: { marginTop: 6 } }, 'Lv.' + (level + 1) + ' / ' + LEVELS.length)
      ),
      h('div', { className: 'card' },
        h('p', { className: 'title-lg' }, '🎖️ 배지 (' + gotBadges.length + '/' + BADGES.length + ')'),
        h('div', { className: 'badge-grid' },
          BADGES.map(function (b) {
            return h('div', { key: b.id, className: 'badge' + (b.cond(data) ? ' got' : '') },
              h('div', { className: 'b-ico' }, b.ico), h('div', null, b.name));
          }))
      )
    );
  }
  function Stat(n, label) {
    return h('div', { key: label },
      h('div', { style: { fontSize: 24, fontWeight: 900, color: '#ff3d7f' } }, n),
      h('div', { className: 'muted' }, label));
  }

  /* ===== 추억 ===== */
  function localDate(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function memoryPhotos(m) { return Array.isArray(m.photos) ? m.photos : (m.photo && m.photo !== '…' ? [m.photo] : []); }
  function TimelinePage(props) {
    var data = props.data, update = props.update;
    var editor = useState(null), form = editor[0], setForm = editor[1];
    var qs = useState(''), query = qs[0], setQuery = qs[1];
    var ms = useState(''), month = ms[0], setMonth = ms[1];
    var vs = useState(null), viewing = vs[0], setViewing = vs[1];
    function close() { setForm(null); }
    function edit(m) { setForm(m ? Object.assign({}, m) : { date: todayStr(), title: '', memo: '' }); }
    function field(key, value) { setForm(function (f) { var next = Object.assign({}, f); next[key] = value; return next; }); }
    function save() {
      if (!form.title.trim() || !form.date) return;
      var saved = Object.assign({}, form, { id: form.id || uid(), title: form.title.trim() });
      update(function (d) { var i = d.memories.findIndex(function (m) { return m.id === saved.id; }); if (i < 0) d.memories.push(saved); else d.memories[i] = saved; }); close();
    }
    var sorted = data.memories.filter(function (m) {
      return (!month || m.date.slice(0, 7) === month) && (m.title + ' ' + (m.memo || '')).toLowerCase().includes(query.trim().toLowerCase());
    }).sort(function (a, b) { return b.date.localeCompare(a.date); });
    return h('div', null,
      h('div', { className: 'row', style: { alignItems: 'center', marginBottom: 12 } }, h('h2', { className: 'title-xl' }, '📖 우리의 추억'), h('button', { className: 'btn sm', onClick: function () { edit(null); } }, '+ 추억 추가')),
      h('div', { className: 'card' }, h('input', { type: 'search', 'aria-label': '추억 검색', placeholder: '제목이나 메모로 검색', value: query, onChange: function (e) { setQuery(e.target.value); } }),
        h('label', null, '월별 보기'), h('div', { className: 'row' }, h('input', { type: 'month', 'aria-label': '추억 월', value: month, onChange: function (e) { setMonth(e.target.value); } }), h('button', { className: 'btn ghost sm', onClick: function () { setMonth(''); setQuery(''); } }, '전체 보기')),
        h('p', { className: 'muted' }, sorted.length + '개의 추억')),
      !sorted.length ? h('div', { className: 'empty' }, data.memories.length ? '검색 결과가 없어요.' : '첫 추억을 기록해보세요 💕') : sorted.map(function (m) {
        return h('article', { key: m.id, className: 'item' }, h('div', { className: 'when' }, fmtK(m.date)), h('h3', { className: 't' }, m.title),
          h('div', { className: 'photo-grid' }, memoryPhotos(m).map(function (url, i) { return h('button', { key: i, className: 'photo-button', 'aria-label': m.title + ' 사진 ' + (i + 1) + ' 크게 보기', onClick: function () { setViewing({ photos: memoryPhotos(m), index: i }); } }, h('img', { src: url, alt: m.title + ' 사진 ' + (i + 1), loading: 'lazy' })); })),
          h('div', { className: 'm' }, m.memo), h('div', { className: 'row', style: { marginTop: 12 } },
            h('button', { className: 'btn ghost sm', onClick: function () { edit(m); } }, '수정'),
            h('button', { className: 'btn gray sm', onClick: function () { if (confirm('이 추억을 삭제할까요?')) update(function (d) { d.memories = d.memories.filter(function (x) { return x.id !== m.id; }); }); } }, '삭제')));
      }),
      form ? h(Modal, { onClose: close }, h('h2', { className: 'title-lg' }, form.id ? '추억 수정' : '추억 추가'),
        h('label', null, '날짜'), h('input', { type: 'date', value: form.date, onChange: function (e) { field('date', e.target.value); } }),
        h('label', null, '제목'), h('input', { value: form.title, placeholder: '어떤 추억인가요?', onChange: function (e) { field('title', e.target.value); } }),
        h('label', null, '메모'), h('textarea', { value: form.memo, onChange: function (e) { field('memo', e.target.value); } }),
        h('div', { className: 'row', style: { marginTop: 14 } }, h('button', { className: 'btn gray', onClick: close }, '취소'), h('button', { className: 'btn', disabled: !form.title.trim() || !form.date, onClick: save }, '저장'))) : null,
      viewing ? h(Modal, { onClose: function () { setViewing(null); } }, h('img', { className: 'viewer-image', src: viewing.photos[viewing.index], alt: '추억 사진 ' + (viewing.index + 1) }),
        h('p', { className: 'center muted' }, (viewing.index + 1) + ' / ' + viewing.photos.length),
        h('div', { className: 'row' }, h('button', { className: 'btn ghost', disabled: viewing.index === 0, onClick: function () { setViewing(Object.assign({}, viewing, { index: viewing.index - 1 })); } }, '이전'), h('button', { className: 'btn gray', onClick: function () { setViewing(null); } }, '닫기'), h('button', { className: 'btn ghost', disabled: viewing.index === viewing.photos.length - 1, onClick: function () { setViewing(Object.assign({}, viewing, { index: viewing.index + 1 })); } }, '다음'))) : null);
  }

  function CoupleCalendar(props) { return h(window.FutariCalendar.Calendar,props); }

  function DateRoulette(props) {
    var rs = useState(''), result = rs[0], setResult = rs[1];
    var cs = useState('전체'), category = cs[0], setCategory = cs[1];
    var pending = props.data.buckets.filter(function (b) { return !b.done; });
    var categories = ['전체'].concat(Array.from(new Set(pending.map(function (b) { return b.category; }).filter(Boolean))));
    var choices = pending.filter(function (b) { return category === '전체' || b.category === category; });
    return h('section', { className: 'card' }, h('h2', { className: 'title-lg' }, '🎲 오늘 뭐 할까?'), h('p', { className: 'muted' }, '아직 이루지 않은 버킷리스트에서 골라드려요.'),
      h('select', { 'aria-label': '룰렛 카테고리', value: category, onChange: function (e) { setCategory(e.target.value); setResult(''); } }, categories.map(function (x) { return h('option', { key: x, value: x }, x); })),
      h('p', { className: 'q-card', role: 'status', 'aria-live': 'polite' }, result || (choices.length ? '두근두근, 오늘의 데이트는?' : '버킷 탭에 하고 싶은 일을 추가해보세요.')),
      h('button', { className: 'btn block', disabled: !choices.length, onClick: function () { var pool = choices.filter(function (b) { return b.text !== result; }); if (!pool.length) pool = choices; setResult(pool[Math.floor(Math.random() * pool.length)].text); } }, result ? '다시 뽑기' : '데이트 뽑기'));
  }

  /* ===== 버킷리스트 ===== */
  function BucketPage(props) {
    var formId=useRef(uid());
    var data = props.data, update = props.update;
    var openState = useState(false), open = openState[0], setOpen = openState[1];
    var textState = useState(''), text = textState[0], setText = textState[1];
    var catState = useState('여행'), category = catState[0], setCategory = catState[1];
    var cats = ['여행', '맛집', '경험', '기타'];
    var done = data.buckets.filter(function (b) { return b.done; }).length;
    var rate = data.buckets.length ? Math.round(done / data.buckets.length * 100) : 0;

    function add() {
      if (!text.trim()) return;
      update(function (d) { if(!d.buckets.some(function(b){return b.id===formId.current;}))d.buckets.push({ id: formId.current, text: text, category: category, done: false }); });
      setText(''); setOpen(false);
    }
    function toggle(id) { update(function (d) { var b = d.buckets.find(function (x) { return x.id === id; }); if (b) b.done = !b.done; }); }
    function del(id) { if (confirm('하고 싶은 일과 연결된 날짜를 삭제할까요? 남긴 기록은 보존돼요.')) update(function (d) { var item=d.buckets.find(function(b){return b.id===id;});if(item&&item.calendarId){var linked=d.dates.find(function(e){return e.id===item.calendarId;});if(linked&&!linked.journalEdited&&!linked.memoryId&&!linked.reviews&&!linked.done)window.FutariCalendar.deleteEntry(d,'dates',item.calendarId);}d.buckets = d.buckets.filter(function (b) { return b.id !== id; }); }); }
    function toMemory(b) {
      var day=prompt('함께한 날짜를 골라주세요 (YYYY-MM-DD)',todayStr());
      if(day===null)return;if(!window.FutariCalendar.valid(day)){alert('날짜를 YYYY-MM-DD 형식으로 입력해주세요.');return;}
      update(function(d){var item=d.buckets.find(function(x){return x.id===b.id;});if(!item)return;
        var planned=d.dates.find(function(e){return e.id===item.calendarId;});
        var existing=d.memories.find(function(m){return m.id===item.memoryId;});
        if(planned){planned.date=day;planned.done=true;}
        else if(existing)existing.date=day;
        else{item.memoryId=uid();d.memories.push({id:item.memoryId,date:day,title:item.text,memo:'함께 하고 싶었던 일을 이룬 날',photos:[]});}
        item.done=true;
      });
      if(props.onRecorded)props.onRecorded();
    }

    return h('div', null,
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 } },
        h('h2', { className: 'title-xl' }, '⭐ 함께 하고 싶은 일'),
        h('button', { className: 'btn sm', onClick: function () { formId.current=uid();setOpen(true); } }, '+ 추가')),
      h('div', { className: 'card' },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 } },
          h('span', { style: { fontWeight: 700 } }, '달성률'),
          h('span', { className: 'pill pink' }, done + '/' + data.buckets.length + ' (' + rate + '%)')),
        h('div', { className: 'bar' }, h('div', { style: { width: rate + '%' } }))),
      data.buckets.length === 0
        ? h('div', { className: 'empty' }, '같이 하고 싶은 걸 적어봐요 ✨')
        : cats.map(function (cat) {
          var items = data.buckets.filter(function (b) { return b.category === cat; });
          if (!items.length) return null;
          return h('div', { key: cat, style: { marginBottom: 10 } },
            h('p', { className: 'muted', style: { fontWeight: 700, margin: '8px 0 4px' } }, cat),
            items.map(function (b) {
              return h('div', { key: b.id, className: 'item', style: { display: 'flex', alignItems: 'center', gap: 10 } },
                h('input', { type: 'checkbox', style: { width: 22, flex: 'none' }, checked: b.done, onChange: function () { toggle(b.id); } }),
                h('span', { style: { flex: 1, textDecoration: b.done ? 'line-through' : 'none', color: b.done ? '#bba' : '#3a2b33' } }, b.text),
                h('span',{className:'bucket-actions'},
                  h('label',null,'함께할 날짜',h('input',{type:'date',value:(data.dates.find(function(e){return e.id===b.calendarId;})||{}).date||'',onChange:function(ev){var day=ev.target.value;if(day&&!window.FutariCalendar.valid(day))return;update(function(d){var item=d.buckets.find(function(x){return x.id===b.id;});if(!item)return;var existing=d.dates.find(function(e){return e.id===item.calendarId;});if(!day){if(existing)window.FutariCalendar.deleteEntry(d,'dates',existing.id);return;}if(existing)existing.date=day;else{item.calendarId=uid();d.dates.push({id:item.calendarId,date:day,title:item.text,memo:'함께 하고 싶은 일',kind:item.category==='여행'?'travel':'date',allDay:true,status:'accepted',owner:props.member});}});}})),
                  h('button',{className:'btn ghost sm',onClick:function(){toMemory(b);}},b.memoryId?'기록 날짜 변경':'이룬 날 기록하기')),
                h('span', { className: 'link', style: { flex: 'none' }, onClick: function () { del(b.id); } }, '✕'));
            }));
        }),
      open ? h(Modal, { onClose: function () { setOpen(false); } },
        h('p', { className: 'title-lg' }, '버킷리스트 추가'),
        h('label', null, '내용'),
        h('input', { placeholder: '예: 제주도 여행 가기', value: text, onChange: function (e) { setText(e.target.value); } }),
        h('label', null, '카테고리'),
        h('select', { value: category, onChange: function (e) { setCategory(e.target.value); } },
          cats.map(function (c) { return h('option', { key: c }, c); })),
        h('div', { className: 'row', style: { marginTop: 14 } },
          h('button', { className: 'btn gray', onClick: function () { setOpen(false); } }, '취소'),
          h('button', { className: 'btn', onClick: add }, '추가'))
      ) : null
    );
  }

  /* ===== 약속 ===== */
  function DatePlanPage(props) { return h(window.FutariCalendar.Calendar,props); }

  /* ===== 놀이 ===== */
  function PlayPage(props) {
    var data = props.data, update = props.update;
    var tabState = useState('q'), tab = tabState[0], setTab = tabState[1];
    var today = todayStr();
    var seed = 0; for (var i = 0; i < today.length; i++) seed += today.charCodeAt(i);
    var qIndex = seed % QUESTIONS.length;
    var todayAns = data.answers[today] || { me: '', you: '' };
    function saveAns(who, v) { update(function (d) { if (!d.answers[today]) d.answers[today] = { me: '', you: '' }; d.answers[today][who] = v; }); }

    var MOODS = ['😍', '😊', '😌', '😐', '😢', '😤', '🥰', '😴', '🤔', '🥳'];
    var myMood = data.moods.find(function (m) { return m.date === today && m.who === 'me'; });
    var yourMood = data.moods.find(function (m) { return m.date === today && m.who === 'you'; });
    function setMood(who, emoji) {
      update(function (d) { d.moods = d.moods.filter(function (m) { return !(m.date === today && m.who === who); }); d.moods.push({ id: uid(), date: today, who: who, emoji: emoji }); });
    }

    var pollQState = useState(''), pollQ = pollQState[0], setPollQ = pollQState[1];
    var pollOptsState = useState(['', '']), pollOpts = pollOptsState[0], setPollOpts = pollOptsState[1];
    var showFormState = useState(false), showPollForm = showFormState[0], setShowPollForm = showFormState[1];
    function addPoll() {
      var opts = pollOpts.map(function (o) { return o.trim(); }).filter(Boolean);
      if (!pollQ.trim() || opts.length < 2) { alert('질문과 선택지 2개 이상을 입력해주세요.'); return; }
      update(function (d) { d.polls.unshift({ id: uid(), q: pollQ, options: opts.map(function (t) { return { text: t, votes: 0 }; }) }); });
      setPollQ(''); setPollOpts(['', '']); setShowPollForm(false);
    }
    function vote(pid, oi) { update(function (d) { var p = d.polls.find(function (x) { return x.id === pid; }); if (p) p.options[oi].votes++; }); }
    function delPoll(pid) { if (confirm('삭제할까요?')) update(function (d) { d.polls = d.polls.filter(function (p) { return p.id !== pid; }); }); }

    var body;
    if (tab === 'q') {
      body = h('div', null,
        h('div', { className: 'q-card' }, 'Q. ' + QUESTIONS[qIndex]),
        h('p', { className: 'muted center', style: { margin: '10px 0' } }, '오늘의 질문 · 매일 바뀌어요'),
        h('label', null, data.settings.me + '의 답'),
        h('textarea', { value: todayAns.me, onChange: function (e) { saveAns('me', e.target.value); }, placeholder: '답을 적어보세요' }),
        h('label', null, data.settings.you + '의 답'),
        h('textarea', { value: todayAns.you, onChange: function (e) { saveAns('you', e.target.value); }, placeholder: '답을 적어보세요' }),
        h('p', { className: 'muted center', style: { marginTop: 8 } }, '지난 답변 ' + Object.keys(data.answers).length + '일치 저장됨'));
    } else if (tab === 'mood') {
      body = h('div', null,
        h('div', { className: 'card' },
          h('p', { className: 'title-lg' }, data.settings.me + '의 오늘 기분 ' + (myMood ? myMood.emoji : '')),
          h('div', { className: 'mood-grid' }, MOODS.map(function (e) {
            return h('button', { key: e, className: 'mood' + (myMood && myMood.emoji === e ? ' on' : ''), onClick: function () { setMood('me', e); } }, e);
          }))),
        h('div', { className: 'card' },
          h('p', { className: 'title-lg' }, data.settings.you + '의 오늘 기분 ' + (yourMood ? yourMood.emoji : '')),
          h('div', { className: 'mood-grid' }, MOODS.map(function (e) {
            return h('button', { key: e, className: 'mood' + (yourMood && yourMood.emoji === e ? ' on' : ''), onClick: function () { setMood('you', e); } }, e);
          }))));
    } else {
      body = h('div', null,
        h('button', { className: 'btn block', style: { marginBottom: 12 }, onClick: function () { setShowPollForm(!showPollForm); } }, '+ 새 투표 만들기'),
        showPollForm ? h('div', { className: 'card' },
          h('label', null, '질문'),
          h('input', { placeholder: '예: 오늘 저녁 뭐 먹을까?', value: pollQ, onChange: function (e) { setPollQ(e.target.value); } }),
          pollOpts.map(function (o, i) {
            return h('div', { key: i, style: { marginTop: 6 } },
              h('input', { placeholder: '선택지 ' + (i + 1), value: o, onChange: function (e) { var n = pollOpts.slice(); n[i] = e.target.value; setPollOpts(n); } }));
          }),
          h('div', { className: 'row', style: { marginTop: 8 } },
            h('button', { className: 'btn gray sm', onClick: function () { setPollOpts(pollOpts.concat([''])); } }, '+ 선택지'),
            h('button', { className: 'btn sm', onClick: addPoll }, '만들기'))
        ) : null,
        data.polls.length === 0
          ? h('div', { className: 'empty' }, '소소한 투표를 만들어봐요 🗳️')
          : data.polls.map(function (p) {
            var total = p.options.reduce(function (a, o) { return a + o.votes; }, 0);
            return h('div', { key: p.id, className: 'card' },
              h('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                h('span', { style: { fontWeight: 700 } }, p.q),
                h('span', { className: 'link', onClick: function () { delPoll(p.id); } }, '삭제')),
              p.options.map(function (o, i) {
                var pct = total ? Math.round(o.votes / total * 100) : 0;
                return h('div', { key: i, style: { marginTop: 8, cursor: 'pointer' }, onClick: function () { vote(p.id, i); } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 3 } },
                    h('span', null, o.text), h('span', { className: 'muted' }, o.votes + '표 (' + pct + '%)')),
                  h('div', { className: 'bar' }, h('div', { style: { width: pct + '%' } })));
              }),
              h('p', { className: 'muted center', style: { marginTop: 6 } }, '항목을 눌러 투표 · 총 ' + total + '표'));
          }));
    }

    return h('div', null,
      h('h2', { className: 'title-xl', style: { marginBottom: 10 } }, '🎲 둘이 놀기'),
      h(DateRoulette, { data: data }),
      h('div', { className: 'seg' },
        h('button', { className: tab === 'q' ? 'on' : '', onClick: function () { setTab('q'); } }, '질문카드'),
        h('button', { className: tab === 'mood' ? 'on' : '', onClick: function () { setTab('mood'); } }, '오늘 기분'),
        h('button', { className: tab === 'poll' ? 'on' : '', onClick: function () { setTab('poll'); } }, '투표')),
      body
    );
  }

  /* ===== 설정 ===== */
  function SettingsPage(props) {
    var data = props.data, update = props.update, setData = props.setData;
    var s = data.settings;
    var annNameState = useState(''), annName = annNameState[0], setAnnName = annNameState[1];
    var annDateState = useState(''), annDate = annDateState[0], setAnnDate = annDateState[1];
    var fileRef = useRef(null);

    function setField(k, v) { update(function (d) { d.settings[k] = v; }); }
    function addAnn() {
      if (!annName.trim() || !annDate) { alert('기념일 이름과 날짜를 입력해주세요.'); return; }
      update(function (d) { d.settings.anniversaries.push({ id: uid(), name: annName, date: annDate }); });
      setAnnName(''); setAnnDate('');
    }
    function delAnn(id) { update(function (d) { d.settings.anniversaries = d.settings.anniversaries.filter(function (a) { return a.id !== id; }); }); }
    function exportData() {
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'futari_backup_' + todayStr() + '.json'; a.click();
      URL.revokeObjectURL(url);
    }
    function importData(e) {
      var f = e.target.files[0]; if (!f) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        try {
          var obj = JSON.parse(ev.target.result);
          if (!obj.settings) throw new Error('형식 오류');
          if (confirm('현재 데이터를 덮어쓰고 백업을 불러올까요?')) {
            var merged = normalizeData(obj);
            saveData(merged); setData(merged); alert('복원 완료! 💕');
          }
        } catch (err) { alert('백업 파일을 읽지 못했어요.'); }
      };
      reader.readAsText(f);
    }
    function resetAll() {
      if (confirm('정말 모든 데이터를 삭제할까요? 되돌릴 수 없어요.')) {
        var fresh = freshData(); saveData(fresh); setData(fresh);
      }
    }

    return h('div', null,
      h('h2', { className: 'title-xl', style: { marginBottom: 12 } }, '⚙️ 설정'),
      h('button', { className: 'btn ghost block', onClick: props.changeMember, style: { marginBottom: 12 } }, '이 기기의 사용자 바꾸기'),
      h('a', { className: 'btn ghost block', href: './recover.html', style: { display: 'block', textAlign: 'center', textDecoration: 'none', marginBottom: 12 } }, '이전 화면이 보일 때 새로 받기'),
      h('div', { className: 'card' },
        h('p', { className: 'title-lg' }, '💑 우리 정보'),
        h('div', { className: 'row' },
          h('div', null, h('label', null, '첫 번째 사람 이름'), h('input', { value: s.me, onChange: function (e) { setField('me', e.target.value); } })),
          h('div', null, h('label', null, '두 번째 사람 이름'), h('input', { value: s.you, onChange: function (e) { setField('you', e.target.value); } }))),
        h('label', null, '처음 만난 날'),
        h('input', { type: 'date', value: s.startDate, onChange: function (e) { setField('startDate', e.target.value); } })),
      h('div', { className: 'card' },
        h('p', { className: 'title-lg' }, '🎀 기념일 추가'),
        h('p', { className: 'muted', style: { marginBottom: 6 } }, '생일, 첫 여행 등 매년 챙길 날을 등록하세요.'),
        h('input', { placeholder: '기념일 이름 (예: 생일)', value: annName, onChange: function (e) { setAnnName(e.target.value); } }),
        h('input', { type: 'date', style: { marginTop: 6 }, value: annDate, onChange: function (e) { setAnnDate(e.target.value); } }),
        h('button', { className: 'btn block sm', style: { marginTop: 8 }, onClick: addAnn }, '+ 등록'),
        s.anniversaries.length > 0 ? h('div', { style: { marginTop: 10 } }, s.anniversaries.map(function (a) {
          return h('div', { key: a.id, style: { display: 'flex', justifyContent: 'space-between', padding: '5px 0' } },
            h('span', null, a.name + ' · ' + a.date),
            h('span', { className: 'link', onClick: function () { delAnn(a.id); } }, '삭제'));
        })) : null),
      props.room ? h('div', { className: 'card' },
        h('p', { className: 'title-lg' }, '🔑 우리 방'),
        h('p', { className: 'muted', style: { marginBottom: 8 } }, '이 방 코드를 상대에게 알려주면 같은 데이터를 함께 봐요.'),
        h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
          h('input', { readOnly: true, value: props.room, style: { fontWeight: 700 } }),
          h('button', { className: 'btn ghost sm', style: { flex: 'none' }, onClick: function () { navigator.clipboard && navigator.clipboard.writeText(props.room); alert('방 코드를 복사했어요!'); } }, '복사')),
        h('button', { className: 'btn gray block sm', style: { marginTop: 10 }, onClick: props.leaveRoom }, '이 기기에서 방 나가기')) : null,
      props.room ? h('button', { className: 'btn ghost block', style: { marginBottom: 14 }, onClick: function () { var link = new URL(window.location.href); link.searchParams.set('room', props.room); if (!navigator.clipboard) { alert(link.href); return; } navigator.clipboard.writeText(link.href).then(function () { alert('초대 링크를 복사했어요!'); }).catch(function () { alert(link.href); }); } }, '💌 초대 링크 복사') : null,
      h('div', { className: 'card' },
        h('p', { className: 'title-lg' }, '💾 백업'),
        h('p', { className: 'muted', style: { marginBottom: 10 } }, '데이터는 클라우드(방 코드)에 저장돼요. 추가로 파일 백업도 받아둘 수 있어요.'),
        h('button', { className: 'btn block', onClick: exportData }, '📤 백업 내보내기 (파일 저장)'),
        h('button', { className: 'btn ghost block', style: { marginTop: 8 }, onClick: function () { fileRef.current.click(); } }, '📥 백업 가져오기 (복원)'),
        h('input', { ref: fileRef, type: 'file', accept: 'application/json', style: { display: 'none' }, onChange: importData })),
      h('div', { className: 'card' },
        h('p', { className: 'title-lg' }, '⚠️ 초기화'),
        h('button', { className: 'btn gray block', style: { color: '#c0392b' }, onClick: resetAll }, '모든 데이터 삭제')),
      h('section',{className:'card'},h('h2',{className:'title-lg'},'복구용 백업'),h('button',{className:'btn ghost block',onClick:function(){window.location.href=new URL('./rescue.html',window.location.href).href;}},'읽기 전용 데이터 구조 열기'),h('p',{className:'muted'},'버전 변경 전 데이터와 충돌 시 보관한 변경을 내려받을 수 있어요. 파일을 보관한 뒤 백업 가져오기로 복원해주세요.'),Object.keys(localStorage).filter(function(k){return k.indexOf('futari_backup_')===0&&(k.endsWith('_'+props.room)||k.endsWith('_'+props.room+'_local'))||k==='futari_conflict_backup_'+props.room;}).map(function(k){return h('button',{key:k,className:'btn ghost block',onClick:function(){var saved=JSON.parse(localStorage.getItem(k)),blob=new Blob([JSON.stringify(saved.data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=k+'.json';a.click();URL.revokeObjectURL(url);}},k.indexOf('conflict')>=0?'미저장 변경 백업 내려받기':'버전 변경 전 백업 내려받기');}),h('p',{className:'muted'},'방 코드를 아는 사람이 입장할 수 있어요. 두 사람만 아는 코드를 사용해주세요.')),
      h('p', { className: 'muted center', style: { marginTop: 10 } }, 'futari 💪 v1')
    );
  }

  /* ===== 메인 App ===== */
  function TogetherPage(props) {
    var state = useState('date'), section = state[0], setSection = state[1];
    useEffect(function(){if(props.target==='wishes')setSection('bucket');else if(props.target&&(props.data.buckets||[]).some(function(b){return b.id===props.target;}))setSection('bucket');else if(props.target)setSection('date');},[props.target]);
    var options = [['date', '📖 기록 달력', DatePlanPage], ['bucket', '⭐ 하고 싶은 일', BucketPage]];
    return h('div', null, h('div', { className: 'seg' }, options.map(function (x) { return h('button', { key: x[0], className: section === x[0] ? 'on' : '', onClick: function () { setSection(x[0]); } }, x[1]); })), h(options.find(function (x) { return x[0] === section; })[2], Object.assign({},props,{onRecorded:function(){setSection('date');}})));
  }
  var TABS = [
    { id: 'home', ico: '🏡', label: '우리의 지금', comp: window.FutariHome.HomePage },
    { id: 'today', ico: '💛', label: '오늘 우리', comp: window.FutariToday.TodayPage },
    { id: 'together', ico: '📅', label: '우리의 날들', comp: TogetherPage },
    { id: 'games', ico: '🎲', label: '보드게임', comp: window.FutariBoardGames.BoardHub }
  ];

  /* ===== 방 코드 입력 화면 ===== */
  function RoomGate(props) {
    var codeState = useState(new URLSearchParams(window.location.search).get('room') || ''), code = codeState[0], setCode = codeState[1];
    var busyState = useState(false), busy = busyState[0], setBusy = busyState[1];
    var errState = useState(''), err = errState[0], setErr = errState[1];

    function enter() {
      var c = code.trim();
      if (c.length < 4) { setErr('방 코드는 4글자 이상으로 정해주세요.'); return; }
      setBusy(true); setErr('');
      cloudLoad(c).then(function (data) {
        setRoomCode(c);
        props.onEnter(c, data);
      }).catch(function (e) {
        console.error(e);
        setErr('연결에 실패했어요. 잠시 후 다시 시도해주세요.');
        setBusy(false);
      });
    }

    return h('div', { className: 'app' },
      h('div', { className: 'hero' },
        h('div', { className: 'names' }, 'futari 💪'),
        h('div', { className: 'sub', style: { marginTop: 8 } }, '둘만의 방 코드로 함께 기록해요')),
      h('div', { className: 'card' },
        h('p', { className: 'title-lg' }, '🔑 방 코드 입력'),
        h('p', { className: 'muted', style: { marginBottom: 10 } },
          '두 사람이 같은 방 코드를 입력하면 같은 추억을 함께 봐요. 추측하기 어려운 코드를 정하세요. (예: 서로만난날(261225))'),
        h('input', {
          placeholder: '우리 둘만의 방 코드', value: code,
          onChange: function (e) { setCode(e.target.value); },
          onKeyDown: function (e) { if (e.key === 'Enter') enter(); }
        }),
        err ? h('p', { style: { color: '#c0392b', fontSize: 13, marginTop: 8 } }, err) : null,
        h('button', { className: 'btn block', style: { marginTop: 12 }, disabled: busy, onClick: enter },
          busy ? '연결 중…' : '입장하기')),
      h('div', { className: 'card' },
        h('p', { className: 'muted' }, '같은 코드를 쓰면 폰·PC 어디서 열어도 같은 데이터가 보여요. 코드는 이 기기에 기억돼서, 다음부턴 바로 들어와요.'))
    );
  }

  function App() {
    var identityState = useState(''), identity = identityState[0], setIdentity = identityState[1];
    var roomState = useState(getRoomCode()), room = roomState[0], setRoom = roomState[1];
    var dataState = useState(function () { var cached = cachedRoom(getRoomCode());try{return cached&&cached.data?checkedRoom(cached.data,getRoomCode()+'_local'):null;}catch(e){return null;} }), data = dataState[0], setData = dataState[1];
    var tabState = useState('home'), tab = tabState[0], setTab = tabState[1];
    var loadingState = useState(!!getRoomCode() && !cachedRoom(getRoomCode())), loading = loadingState[0], setLoading = loadingState[1];
    var syncState = useState(''), syncMsg = syncState[0], setSyncMsg = syncState[1];
    var sessionRef=useRef(null),confirmedState=useState(null),confirmed=confirmedState[0],setConfirmed=confirmedState[1];
    var dirty=useRef(!!(cachedRoom(getRoomCode())||{}).pending),revision=useRef(0),skipSave=useRef(true);
    var notificationState=useState(false),notifications=notificationState[0],setNotifications=notificationState[1];
    var targetState=useState(null),target=targetState[0],setTarget=targetState[1];
    var summaryState=useState(true),showSummary=summaryState[0],setShowSummary=summaryState[1];
    function currentIdentity(){if(identity)return identity;try{return localStorage.getItem('futari_identity_'+room)||'';}catch(e){return '';}}
    useEffect(function(){if(!document.body)return;document.body.classList.toggle('game-mode',tab==='games');document.body.classList.toggle('creature-mode',tab==='home'||tab==='today');document.body.classList.toggle('journal-mode',tab==='together');return function(){document.body.classList.remove('game-mode','creature-mode','journal-mode');};},[tab]);
    useEffect(function(){
      if(!room)return;
      var cached=cachedRoom(room);try{if(cached&&cached.data)checkedRoom(cached.data,room+'_local');}catch(e){setSyncMsg('마이그레이션 중단 · '+e.message);setLoading(false);return;}
      var session=new window.FutariSync.Session({room:room,cached:cachedRoom(room),load:function(){return cloudLoad(room).then(function(d){return{data:d,version:roomVersions[room]};});},save:function(d,v){return cloudCommit(room,d,v);},persist:function(snapshot){return window.FutariPreservation.persist(localStorage,room,snapshot);},onChange:function(d,ack,message,pending){if(d)setData(d);if(ack)setConfirmed(ack);dirty.current=pending;setSyncMsg(message);setLoading(false);}});
      sessionRef.current=session;session.open();
      var client=getSupabase(),channel=null;
      function refresh(){if(document.visibilityState!=='hidden')session.refresh();}
      if(client&&client.channel){channel=client.channel('futari-'+room).on('postgres_changes',{event:'*',schema:'public',table:'rooms',filter:'code=eq.'+room},refresh).subscribe(function(status){if(status==='SUBSCRIBED')refresh();});}
      function due(){if(!session.data||!window.FutariContent)return;var list=window.FutariContent.due(session.data,currentIdentity(),Date.now());if(list.length)session.change(function(d){var known=new Set(d.activities.map(function(e){return e.id;}));list.forEach(function(e){if(!known.has(e.id))d.activities.push(e);});},null);}
      var reminderTimer=setInterval(due,30000);
      var poll=setInterval(refresh,5000);window.addEventListener('online',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
      return function(){session.close();if(sessionRef.current===session)sessionRef.current=null;clearInterval(poll);clearInterval(reminderTimer);if(channel)client.removeChannel(channel);window.removeEventListener('online',refresh);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
    },[room]);
    function update(mutator){if(sessionRef.current&&sessionRef.current.o.room===room)sessionRef.current.change(mutator,currentIdentity());}
    function retrySave(){if(sessionRef.current)sessionRef.current.flush();}
    function recoverRemote(){
      if(!confirm('미저장 변경을 백업하고 상대 변경을 불러올까요?'))return;
      var session=sessionRef.current;if(!session)return;
      try{localStorage.setItem('futari_conflict_backup_'+room,JSON.stringify({savedAt:new Date().toISOString(),data:session.data,base:session.base,outbox:session.outbox}));}catch(e){setSyncMsg('백업 실패 · 저장 공간을 확인해주세요');return;}
      session.dirty=false;session.outbox=[];session.refresh();
    }
    function onEnter(code, loaded) { var kept=window.FutariPreservation.entry(localStorage,code,loaded,roomVersions[code]);dirty.current=!!kept.pending;setSyncMsg(kept.pending?'기기에 남은 미저장 변경을 보존했어요':'');setRoom(code);skipSave.current=true;setData(normalizeData(kept.data));setLoading(false);setConfirmed(null);setShowSummary(true); }
    function leaveRoom() {
      if (!confirm(dirty.current ? '아직 저장하지 못한 변경이 있어요. 그래도 방을 나갈까요?' : '이 기기에서 방을 나갈까요? (데이터는 클라우드에 남아있어요)')) return;
      dirty.current = false; revision.current++;
      setRoomCode(''); setRoom(''); setIdentity(''); setData(null);
    }

    // 방 코드 없음 → 입력 화면
    if (!room) return h(RoomGate, { onEnter: onEnter });
    // 로딩 중
    if (loading || data == null) {
      return h('div', { className: 'app' },
        h('div', { className: 'hero' }, h('div', { className: 'names' }, 'futari 💪'), h('div', { className: 'sub', style: { marginTop: 8 } }, '불러오는 중…')),
        syncMsg ? h('div', { className: 'card' }, h('p', { className: 'muted center' }, syncMsg),
          h('button', { className: 'btn ghost block', style: { marginTop: 8 }, onClick: leaveRoom }, '방 코드 다시 입력'),cachedRoom(room)?h('button',{className:'btn ghost block',onClick:function(){var raw=cachedRoom(room),blob=new Blob([JSON.stringify(raw.data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='futari_recovery_backup.json';a.click();URL.revokeObjectURL(url);}},'기기에 남은 데이터 백업'):null) : null);
    }

    function chooseIdentity(who) { try { localStorage.setItem('futari_identity_' + room, who); } catch (e) {} setIdentity(who); }
    var member = identity;
    if (!member) { try { member = localStorage.getItem('futari_identity_' + room) || ''; } catch (e) {} }
    if (member !== 'me' && member !== 'you') return h('div', { className: 'app' }, h('div', { className: 'card' }, h('h1', { className: 'title-xl' }, '이 기기는 누가 사용하나요?'), h('p', { className: 'muted' }, '각자 자신의 이름을 골라주세요. 다음부터는 기억할게요.'), h('div', { className: 'row' }, ['me', 'you'].map(function (who) { return h('button', { key: who, className: 'btn', onClick: function () { chooseIdentity(who); } }, data.settings[who]); }))));
    var pageProps = { gameSaving: dirty.current, gameSyncMessage: syncMsg, retryGameSave: retrySave, member: member, changeMember: function () { try { localStorage.removeItem('futari_identity_' + room); } catch (e) {} setIdentity(''); }, data: data, confirmed:confirmed||{}, navigate:navigate, target:target, update: update, updateGame: function (mutator) { update(mutator, true); }, setData: function(replacement){update(function(d){var ledger=d.commits||{};Object.keys(d).forEach(function(k){delete d[k];});Object.assign(d,replacement);d.commits=Object.assign({},ledger,d.commits||{});});}, room: room, leaveRoom: leaveRoom };
    function navigate(next,id){setNotifications(false);setTarget(id||null);setTab(next==='mail'||next==='catalog'?next:next);window.scrollTo(0,0);}
    var unread=window.FutariActivity.unread(confirmed||{},member);
    var current = tab === 'settings' ? { comp: SettingsPage } : tab==='mail'?{comp:window.FutariContent.Mailbox}:tab==='catalog'?{comp:window.FutariContent.Catalog}:TABS.find(function(t){return t.id===tab;})||TABS[0];

    return h('div', { className: 'app' + (tab === 'games' ? ' game-app' : '') },
      syncMsg && !/^(연결됨|다시 연결됨|저장됨|동기화됨) ✓$/.test(syncMsg) ? h('button', { type: 'button', onClick: function () { if (syncMsg.indexOf('저장 실패') === 0) retrySave(); }, style: { border: 0, cursor: 'pointer', position: 'fixed', top: 8, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,.65)', color: '#fff', padding: '4px 12px', borderRadius: 999, fontSize: 12, zIndex: 3000 } }, syncMsg) : null,
      h('div',{className:'app-toolbar'},h('span',null,data.settings[member]+'의 공간'),h('div',{className:'toolbar-actions'},h('button',{className:'toolbar-icon','aria-label':'우편함',onClick:function(){navigate('mail');}},'✉'),h('button',{className:'toolbar-icon','aria-label':'기록 달력',onClick:function(){navigate('together');}},'▦'),h('button',{className:'toolbar-icon','aria-label':'알림 '+unread.length+'개',onClick:function(){setNotifications(!notifications);setShowSummary(false);}},h('svg',{width:20,height:20,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,'aria-hidden':true},h('path',{d:'M 5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3z M 10 20h4 M 12 2v2'})),unread.length?h('span',{className:'notification-count'},unread.length>99?'99+':unread.length):null),h('button',{className:'btn ghost sm',onClick:function(){setTab(tab==='settings'?'home':'settings');}},'⚙'))),
      showSummary&&unread.length?h('div',{className:'activity-summary',role:'status'},h('button',{onClick:function(){setNotifications(true);setShowSummary(false);}},'새 소식 '+unread.length+'개 · 상대의 하루를 확인해요'),h('button',{'aria-label':'새 소식 요약 닫기',onClick:function(){setShowSummary(false);}},'×')):null,
      syncMsg.indexOf('저장 실패') === 0 || syncMsg.indexOf('연결 실패') === 0 ? h('div', { className: 'card', role: 'alert' }, h('p', { className: 'muted' }, '현재 화면의 변경은 이 기기에 보관되어 있어요. 필요한 내용을 설정에서 백업한 뒤 상대 변경을 불러올 수 있어요.'), h('button', { className: 'btn ghost block', onClick: recoverRemote }, '상대 변경 불러오기')) : null,
      notifications?h(window.FutariActivity.Center,pageProps):h(current.comp,pageProps),
      h('nav', { className: 'tabbar' }, TABS.map(function (t) {
        return h('button', { key: t.id, className: 'tab' + (tab === t.id ? ' active' : ''), onClick: function () { navigate(t.id); } },
          h('span', { className: 'ico' }, t.ico), h('span', null, t.label));
      }))
    );
  }

  function mount(){
  try {
    ReactDOM.createRoot(document.getElementById('root')).render(h(App));
  } catch (err) {
    document.getElementById('root').innerHTML =
      '<div style="padding:24px;font-family:sans-serif;color:#b00;"><h3>⚠️ 앱 실행 오류</h3><p>' +
      (err && err.message ? err.message : err) + '</p></div>';
    console.error(err);
  }}
  if(!window.indexedDB)mount();else window.FutariPreservation.hydrate().then(function(){return window.FutariPreservation.archive(localStorage);}).catch(function(e){console.warn('Recovery archive unavailable',e);}).then(mount);
})();
