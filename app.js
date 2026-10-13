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
    return {
      settings: { me: '나', you: '너', startDate: '', anniversaries: [] },
      memories: [], places: [], buckets: [], dates: [], moods: [], polls: [], answers: {},
    };
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
      return base;
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

  var sb = null;
  function getSupabase() {
    if (sb) return sb;
    var cfg = window.FUTARI_CONFIG;
    if (!cfg || !window.supabase || !cfg.SUPABASE_URL) return null;
    try { sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY); return sb; }
    catch (e) { console.warn('supabase init failed', e); return null; }
  }

  // 방 데이터 불러오기 (없으면 새로 만듦)
  function cloudLoad(code) {
    var client = getSupabase();
    if (!client) return Promise.reject(new Error('Supabase 미설정'));
    return client.from('rooms').select('data').eq('code', code).maybeSingle().then(function (res) {
      if (res.error) throw res.error;
      if (res.data && res.data.data) return res.data.data;
      // 방이 없으면 빈 데이터로 생성
      return client.from('rooms').insert({ code: code, data: freshData() }).then(function (created) { if (created.error) throw created.error; return freshData(); });
    });
  }
  // 방 데이터 저장 (upsert)
  function cloudSave(code, data) {
    var client = getSupabase();
    if (!client) return Promise.reject(new Error('Supabase 미설정'));
    return client.from('rooms').upsert({ code: code, data: data, updated_at: new Date().toISOString() }).then(function (res) {
      if (res.error) throw res.error;
      return true;
    });
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

  function CoupleCalendar(props) {
    var state = useState(todayStr().slice(0, 7)), month = state[0], setMonth = state[1];
    var ss = useState(todayStr()), selected = ss[0], setSelected = ss[1];
    var parts = month.split('-').map(Number), year = parts[0], mo = parts[1] - 1;
    var start = new Date(year, mo, 1).getDay(), count = new Date(year, mo + 1, 0).getDate();
    var events = props.data.dates.map(function (x) { return { date: x.date, title: '📅 ' + x.title }; }).concat(props.data.memories.map(function (x) { return { date: x.date, title: '📖 ' + x.title }; }));
    props.data.settings.anniversaries.forEach(function (x) { events.push({ date: year + x.date.slice(4), title: '🎉 ' + x.name }); });
    if (props.data.settings.startDate) events.push({ date: year + props.data.settings.startDate.slice(4), title: '💕 만난 날' });
    function move(offset) { var d = new Date(year, mo + offset, 1); setMonth(localDate(d).slice(0, 7)); setSelected(localDate(d)); }
    var cells = Array.from({ length: start }, function (_, i) { return h('span', { key: 'blank' + i }); });
    for (var day = 1; day <= count; day++) {
      (function (date, number) {
        var has = events.some(function (x) { return x.date === date; });
        cells.push(h('button', { key: date, className: 'calendar-day' + (selected === date ? ' selected' : '') + (date === todayStr() ? ' today' : ''), 'aria-label': date + (has ? ' 기록 있음' : ''), 'aria-pressed': selected === date, onClick: function () { setSelected(date); } }, number, h('span', { className: 'event-dot' }, has ? '●' : '')));
      })(localDate(new Date(year, mo, day)), day);
    }
    var daily = events.filter(function (x) { return x.date === selected; });
    return h('section', { className: 'card' }, h('div', { className: 'row', style: { alignItems: 'center' } }, h('button', { className: 'btn ghost sm', 'aria-label': '이전 달', onClick: function () { move(-1); } }, '‹'), h('strong', { className: 'center' }, year + '년 ' + (mo + 1) + '월'), h('button', { className: 'btn ghost sm', 'aria-label': '다음 달', onClick: function () { move(1); } }, '›')),
      h('div', { className: 'calendar-grid' }, ['일', '월', '화', '수', '목', '금', '토'].map(function (x) { return h('span', { key: x, className: 'center muted' }, x); }), cells),
      h('p', { className: 'when' }, fmtK(selected)), daily.length ? daily.map(function (x, i) { return h('p', { key: i, className: 'm' }, x.title); }) : h('p', { className: 'muted' }, '이날은 아직 기록이 없어요.'),
      h('button', { className: 'btn ghost block', onClick: function () { props.onAdd(selected); } }, '+ 이 날짜에 약속 추가'));
  }

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
    var data = props.data, update = props.update;
    var openState = useState(false), open = openState[0], setOpen = openState[1];
    var textState = useState(''), text = textState[0], setText = textState[1];
    var catState = useState('여행'), category = catState[0], setCategory = catState[1];
    var cats = ['여행', '맛집', '경험', '기타'];
    var done = data.buckets.filter(function (b) { return b.done; }).length;
    var rate = data.buckets.length ? Math.round(done / data.buckets.length * 100) : 0;

    function add() {
      if (!text.trim()) return;
      update(function (d) { d.buckets.push({ id: uid(), text: text, category: category, done: false }); });
      setText(''); setOpen(false);
    }
    function toggle(id) { update(function (d) { var b = d.buckets.find(function (x) { return x.id === id; }); if (b) b.done = !b.done; }); }
    function del(id) { if (confirm('삭제할까요?')) update(function (d) { d.buckets = d.buckets.filter(function (b) { return b.id !== id; }); }); }
    function toMemory(b) {
      if (!confirm('달성한 걸 추억으로 보낼까요?')) return;
      update(function (d) {
        d.memories.push({ id: uid(), date: todayStr(), title: '✅ ' + b.text, memo: '버킷리스트 달성!', photo: '' });
        d.buckets = d.buckets.filter(function (x) { return x.id !== b.id; });
      });
      alert('추억 탭에 저장했어요 💕');
    }

    return h('div', null,
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 } },
        h('h2', { className: 'title-xl' }, '⭐ 버킷리스트'),
        h('button', { className: 'btn sm', onClick: function () { setOpen(true); } }, '+ 추가')),
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
                b.done ? h('button', { className: 'btn ghost sm', style: { flex: 'none' }, onClick: function () { toMemory(b); } }, '추억으로') : null,
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
  function DatePlanPage(props) {
    var data = props.data, update = props.update;
    var openState = useState(false), open = openState[0], setOpen = openState[1];
    var formState = useState({ date: todayStr(), title: '', memo: '' }), form = formState[0], setForm = formState[1];
    var tabState = useState('up'), tab = tabState[0], setTab = tabState[1];
    var today = todayStr();
    var upcoming = data.dates.filter(function (d) { return !d.done; }).sort(function (a, b) { return a.date > b.date ? 1 : -1; });
    var doneList = data.dates.filter(function (d) { return d.done; }).sort(function (a, b) { return b.date > a.date ? 1 : -1; });

    function add() {
      if (!form.title.trim()) { alert('제목을 입력해주세요.'); return; }
      update(function (d) { d.dates.push(Object.assign({ id: uid() }, form, { done: false })); });
      setForm({ date: todayStr(), title: '', memo: '' }); setOpen(false);
    }
    function complete(id) { update(function (d) { var x = d.dates.find(function (v) { return v.id === id; }); if (x) x.done = true; }); }
    function del(id) { if (confirm('삭제할까요?')) update(function (d) { d.dates = d.dates.filter(function (v) { return v.id !== id; }); }); }
    function toMemory(x) {
      if (!confirm('이 약속을 추억으로 보낼까요?')) return;
      update(function (d) { d.memories.push({ id: uid(), date: x.date, title: '📅 ' + x.title, memo: x.memo, photo: '' }); });
      alert('추억 탭에 저장했어요 💕');
    }
    var list = tab === 'up' ? upcoming : doneList;

    return h('div', null,
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 } },
        h('h2', { className: 'title-xl' }, '📅 커플 캘린더'),
        h('button', { className: 'btn sm', onClick: function () { setOpen(true); } }, '+ 추가')),
      h(CoupleCalendar, { data: data, onAdd: function (date) { setForm({ date: date, title: '', memo: '' }); setOpen(true); } }),
      h('div', { className: 'seg' },
        h('button', { className: tab === 'up' ? 'on' : '', onClick: function () { setTab('up'); } }, '예정 (' + upcoming.length + ')'),
        h('button', { className: tab === 'done' ? 'on' : '', onClick: function () { setTab('done'); } }, '완료 (' + doneList.length + ')')),
      list.length === 0
        ? h('div', { className: 'empty' }, tab === 'up' ? '다음 데이트를 계획해봐요 🗓️' : '완료된 약속이 없어요.')
        : list.map(function (x) {
          var left = daysBetween(today, x.date);
          var past = left < 0 && !x.done;
          return h('div', { key: x.id, className: 'item' },
            h('div', { style: { display: 'flex', justifyContent: 'space-between' } },
              h('span', { className: 'when' }, fmtK(x.date)),
              !x.done ? (left === 0 ? h('span', { className: 'pill pink' }, '오늘!') : left > 0 ? h('span', { className: 'pill pink' }, 'D-' + left) : h('span', { className: 'pill gray' }, '지남')) : null),
            h('div', { className: 't', style: { color: past ? '#c99' : '#3a2b33' } }, x.title),
            x.memo ? h('div', { className: 'm' }, x.memo) : null,
            h('div', { style: { textAlign: 'right', marginTop: 6, display: 'flex', gap: 8, justifyContent: 'flex-end' } },
              !x.done ? h('button', { className: 'btn ghost sm', onClick: function () { complete(x.id); } }, '완료') : null,
              x.done ? h('button', { className: 'btn ghost sm', onClick: function () { toMemory(x); } }, '추억으로') : null,
              h('span', { className: 'link', onClick: function () { del(x.id); } }, '삭제')));
        }),
      open ? h(Modal, { onClose: function () { setOpen(false); } },
        h('p', { className: 'title-lg' }, '데이트 약속 추가'),
        h('label', null, '날짜'),
        h('input', { type: 'date', value: form.date, onChange: function (e) { setForm(Object.assign({}, form, { date: e.target.value })); } }),
        h('label', null, '제목'),
        h('input', { placeholder: '예: 영화 보기 🎬', value: form.title, onChange: function (e) { setForm(Object.assign({}, form, { title: e.target.value })); } }),
        h('label', null, '메모'),
        h('textarea', { placeholder: '장소, 시간 등', value: form.memo, onChange: function (e) { setForm(Object.assign({}, form, { memo: e.target.value })); } }),
        h('div', { className: 'row', style: { marginTop: 14 } },
          h('button', { className: 'btn gray', onClick: function () { setOpen(false); } }, '취소'),
          h('button', { className: 'btn', onClick: add }, '추가'))
      ) : null
    );
  }

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
            var merged = Object.assign(freshData(), obj);
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
      h('div', { className: 'card' },
        h('p', { className: 'title-lg' }, '💑 우리 정보'),
        h('div', { className: 'row' },
          h('div', null, h('label', null, '내 이름'), h('input', { value: s.me, onChange: function (e) { setField('me', e.target.value); } })),
          h('div', null, h('label', null, '상대 이름'), h('input', { value: s.you, onChange: function (e) { setField('you', e.target.value); } }))),
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
      h('div', { className: 'card' },
        h('p', { className: 'title-lg' }, '💾 백업'),
        h('p', { className: 'muted', style: { marginBottom: 10 } }, '데이터는 클라우드(방 코드)에 저장돼요. 추가로 파일 백업도 받아둘 수 있어요.'),
        h('button', { className: 'btn block', onClick: exportData }, '📤 백업 내보내기 (파일 저장)'),
        h('button', { className: 'btn ghost block', style: { marginTop: 8 }, onClick: function () { fileRef.current.click(); } }, '📥 백업 가져오기 (복원)'),
        h('input', { ref: fileRef, type: 'file', accept: 'application/json', style: { display: 'none' }, onChange: importData })),
      h('div', { className: 'card' },
        h('p', { className: 'title-lg' }, '⚠️ 초기화'),
        h('button', { className: 'btn gray block', style: { color: '#c0392b' }, onClick: resetAll }, '모든 데이터 삭제')),
      h('p', { className: 'muted center', style: { marginTop: 10 } }, 'futari 💪 v1')
    );
  }

  /* ===== 메인 App ===== */
  var TABS = [
    { id: 'home', ico: '🏠', label: '홈', comp: HomePage },
    { id: 'memory', ico: '📖', label: '추억', comp: TimelinePage },
    { id: 'games', ico: '🎮', label: '게임', comp: window.FutariGames.GamePage },
    { id: 'bucket', ico: '⭐', label: '버킷', comp: BucketPage },
    { id: 'date', ico: '📅', label: '달력', comp: DatePlanPage },
    { id: 'play', ico: '🎲', label: '놀이', comp: PlayPage },
    { id: 'settings', ico: '⚙️', label: '설정', comp: SettingsPage }
  ];

  /* ===== 방 코드 입력 화면 ===== */
  function RoomGate(props) {
    var codeState = useState(''), code = codeState[0], setCode = codeState[1];
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
    var roomState = useState(getRoomCode()), room = roomState[0], setRoom = roomState[1];
    var dataState = useState(null), data = dataState[0], setData = dataState[1];
    var tabState = useState('home'), tab = tabState[0], setTab = tabState[1];
    var loadingState = useState(!!getRoomCode()), loading = loadingState[0], setLoading = loadingState[1];
    var syncState = useState(''), syncMsg = syncState[0], setSyncMsg = syncState[1];
    var saveTimer = useRef(null);
    var dirty = useRef(false), revision = useRef(0), saveQueue = useRef(Promise.resolve());
    var retryState = useState(0), retry = retryState[0], setRetry = retryState[1];
    var skipSave = useRef(true); // 최초 로드 직후 저장 방지

    // 기존 방 코드가 있으면 자동으로 클라우드 로드
    useEffect(function () {
      if (!room) return;
      cloudLoad(room).then(function (d) {
        skipSave.current = true;
        setData(d); setLoading(false);
      }).catch(function (e) {
        console.error(e);
        setSyncMsg('연결 실패 — 방 코드를 다시 확인해주세요');
        setLoading(false);
      });
    }, []);

    // 저장을 순서대로 처리하고 실패한 변경은 원격 조회로 덮어쓰지 않는다.
    useEffect(function () {
      if (data == null || !room) return;
      if (skipSave.current) { skipSave.current = false; return; }
      dirty.current = true;
      var version = ++revision.current, cancelled = false;
      setSyncMsg('저장 중…');
      saveTimer.current = setTimeout(function () {
        saveTimer.current = null;
        saveQueue.current = saveQueue.current.catch(function () {}).then(function () {
          if (cancelled) return;
          return cloudSave(room, data).then(function () {
            if (cancelled || version !== revision.current) return;
            dirty.current = false; setSyncMsg('저장됨 ✓');
          }).catch(function (e) {
            console.error(e);
            if (!cancelled && version === revision.current) setSyncMsg('저장 실패 · 눌러서 다시 시도');
          });
        });
      }, 1200);
      return function () { cancelled = true; if (saveTimer.current) clearTimeout(saveTimer.current); saveTimer.current = null; };
    }, [data, room, retry]);

    useEffect(function () {
      if (!room || data == null) return;
      var active = true;
      var iv = setInterval(function () {
        if (dirty.current) return;
        var version = revision.current;
        cloudLoad(room).then(function (remote) {
          if (active && !dirty.current && version === revision.current && JSON.stringify(remote) !== JSON.stringify(data)) {
            skipSave.current = true; setData(remote);
          }
        }).catch(function () {});
      }, 10000);
      return function () { active = false; clearInterval(iv); };
    }, [room, data]);

    function update(mutator) { dirty.current = true; revision.current++; setData(function (prev) { var next = clone(prev); mutator(next); return next; }); }
    function onEnter(code, loaded) { dirty.current = false; setSyncMsg(''); setRoom(code); skipSave.current = true; setData(loaded); setLoading(false); }
    function leaveRoom() {
      if (!confirm(dirty.current ? '아직 저장하지 못한 변경이 있어요. 그래도 방을 나갈까요?' : '이 기기에서 방을 나갈까요? (데이터는 클라우드에 남아있어요)')) return;
      dirty.current = false; revision.current++;
      setRoomCode(''); setRoom(''); setData(null);
    }

    // 방 코드 없음 → 입력 화면
    if (!room) return h(RoomGate, { onEnter: onEnter });
    // 로딩 중
    if (loading || data == null) {
      return h('div', { className: 'app' },
        h('div', { className: 'hero' }, h('div', { className: 'names' }, 'futari 💪'), h('div', { className: 'sub', style: { marginTop: 8 } }, '불러오는 중…')),
        syncMsg ? h('div', { className: 'card' }, h('p', { className: 'muted center' }, syncMsg),
          h('button', { className: 'btn ghost block', style: { marginTop: 8 }, onClick: leaveRoom }, '방 코드 다시 입력')) : null);
    }

    var pageProps = { data: data, update: update, setData: setData, room: room, leaveRoom: leaveRoom };
    var current = TABS.find(function (t) { return t.id === tab; });

    return h('div', { className: 'app' },
      syncMsg ? h('button', { type: 'button', onClick: function () { if (syncMsg.indexOf('저장 실패') === 0) setRetry(function (n) { return n + 1; }); }, style: { border: 0, cursor: 'pointer', position: 'fixed', top: 8, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,.65)', color: '#fff', padding: '4px 12px', borderRadius: 999, fontSize: 12, zIndex: 3000 } }, syncMsg) : null,
      h(current.comp, pageProps),
      h('nav', { className: 'tabbar' }, TABS.map(function (t) {
        return h('button', { key: t.id, className: 'tab' + (tab === t.id ? ' active' : ''), onClick: function () { setTab(t.id); window.scrollTo(0, 0); } },
          h('span', { className: 'ico' }, t.ico), h('span', null, t.label));
      }))
    );
  }

  try {
    ReactDOM.createRoot(document.getElementById('root')).render(h(App));
  } catch (err) {
    document.getElementById('root').innerHTML =
      '<div style="padding:24px;font-family:sans-serif;color:#b00;"><h3>⚠️ 앱 실행 오류</h3><p>' +
      (err && err.message ? err.message : err) + '</p></div>';
    console.error(err);
  }
})();
