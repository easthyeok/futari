/* 둘이 게임방 — 한 화면을 번갈아 쓰는 로컬 2인 게임 */
(function () {
  'use strict';
  var React = window.React, h = React.createElement, useState = React.useState;
  var ROWS = 6, COLS = 7;
  function newFour(first) { return { board: Array(42).fill(null), turn: first || 0, winner: null, draw: false, line: [], moves: 0 }; }
  function dropFour(game, col) {
    if (game.winner !== null || game.draw || !Number.isInteger(col) || col < 0 || col >= COLS) return game;
    var row = ROWS - 1;
    while (row >= 0 && game.board[row * COLS + col] !== null) row--;
    if (row < 0) return game;
    var board = game.board.slice(), player = game.turn, line = [];
    board[row * COLS + col] = player;
    [[0, 1], [1, 0], [1, 1], [1, -1]].some(function (dir) {
      var run = [row * COLS + col];
      [-1, 1].forEach(function (sign) {
        var r = row + dir[0] * sign, c = col + dir[1] * sign;
        while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r * COLS + c] === player) {
          run.push(r * COLS + c); r += dir[0] * sign; c += dir[1] * sign;
        }
      });
      if (run.length >= 4) { line = run; return true; }
      return false;
    });
    return { board: board, turn: 1 - player, winner: line.length ? player : null, draw: !line.length && game.moves + 1 === 42, line: line, moves: game.moves + 1 };
  }
  var JUMPS = { 5: 8, 10: 7, 15: 19, 20: 17 };
  var MISSIONS = {
    4: '상대의 오늘 가장 귀여운 점을 하나 말해주세요.',
    9: '둘이 다음에 먹고 싶은 음식을 하나씩 말해주세요.',
    14: '상대에게 고마웠던 순간을 하나 말해주세요.',
    22: '도착이 코앞! 상대에게 응원 한마디를 해주세요.'
  };
  function newRace(first) { return { positions: [0, 0], turn: first || 0, winner: null, roll: null, message: '출발! 첫 번째 주사위를 굴려주세요.', moves: 0 }; }
  function rollRace(game, value) {
    if (game.winner !== null || !Number.isInteger(value) || value < 1 || value > 6) return game;
    var player = game.turn, positions = game.positions.slice(), land = Math.min(24, positions[player] + value);
    var target = JUMPS[land] || land;
    positions[player] = target;
    var message = land === target ? target + '번 칸에 도착했어요.' : land + ' → ' + target + (target > land ? ' 지름길로 전진!' : ' 미끄럼틀로 뒤로!');
    if (MISSIONS[target]) message += ' 💌 ' + MISSIONS[target];
    return { positions: positions, turn: 1 - player, winner: target === 24 ? player : null, roll: value, message: message, moves: game.moves + 1 };
  }
  var CARDS = [
    ['대화', '처음 만난 날로 돌아간다면 상대에게 어떤 말을 해줄래?'],
    ['대화', '우리 둘이 가장 닮았다고 느끼는 점은?'],
    ['대화', '상대와 꼭 만들어보고 싶은 새로운 전통은?'],
    ['대화', '최근 가장 행복했던 우리 둘의 순간은?'],
    ['대화', '둘만의 하루 휴가가 생기면 어디서 뭘 하고 싶어?'],
    ['대화', '상대가 나를 잘 안다고 느꼈던 순간은?'],
    ['미션', '상대 이름으로 짧은 삼행시를 지어주세요.'],
    ['미션', '30초 동안 서로 칭찬을 하나씩 주고받아보세요.'],
    ['미션', '상대를 주인공으로 영화 제목을 만들어주세요.'],
    ['미션', '서로를 닮은 동물을 정하고 이유를 말해주세요.'],
    ['미션', '지금 기분을 표정만으로 보여주고 맞혀보세요.'],
    ['미션', '다음 데이트의 이름을 함께 지어주세요.'],
    ['밸런스', '한 달간 매일 짧은 데이트 vs 한 번의 긴 여행, 하나를 골라 이유를 말해주세요.'],
    ['밸런스', '계획표가 있는 여행 vs 목적지만 정한 여행, 서로의 선택은?'],
    ['밸런스', '집에서 요리하기 vs 새로운 맛집 가기, 오늘의 선택은?'],
    ['밸런스', '같이 새로운 취미 배우기 vs 서로의 취미 해보기, 어느 쪽이 좋아?'],
    ['밸런스', '바닷가 일출 vs 산 위의 노을, 함께 보고 싶은 쪽은?'],
    ['밸런스', '서프라이즈 선물 vs 같이 고르는 선물, 어느 쪽이 좋아?']
  ];
  function GamePage(props) {
    var tabState = useState('four'), tab = tabState[0], setTab = tabState[1];
    var fourState = useState(newFour()), four = fourState[0], setFour = fourState[1];
    var raceState = useState(newRace()), race = raceState[0], setRace = raceState[1];
    var scoresState = useState([0, 0]), scores = scoresState[0], setScores = scoresState[1];
    var deckState = useState([]), used = deckState[0], setUsed = deckState[1];
    var cardState = useState(null), card = cardState[0], setCard = cardState[1];
    var filterState = useState('전체'), filter = filterState[0], setFilter = filterState[1];
    var names = [props.data.settings.me || '나', props.data.settings.you || '너'];
    var game = tab === 'four' ? four : race;
    function record(next, previous) { if (next.winner !== null && previous.winner === null) setScores(function (s) { var result = s.slice(); result[next.winner]++; return result; }); }
    function restart() {
      if (game.moves && game.winner === null && !game.draw && !confirm('진행 중인 게임을 새로 시작할까요?')) return;
      var first = game.winner !== null ? 1 - game.winner : 1 - game.turn;
      if (tab === 'four') setFour(newFour(first)); else setRace(newRace(first));
    }
    function drawCard() {
      var pool = CARDS.map(function (_, i) { return i; }).filter(function (i) { return (filter === '전체' || CARDS[i][0] === filter) && used.indexOf(i) < 0; });
      if (!pool.length) return;
      var index = pool[Math.floor(Math.random() * pool.length)]; setCard(index); setUsed(used.concat([index]));
    }
    var body;
    if (tab === 'cards') {
      var remaining = CARDS.filter(function (c, i) { return (filter === '전체' || c[0] === filter) && used.indexOf(i) < 0; }).length;
      body = h('section', { className: 'card' }, h('h2', { className: 'title-lg' }, '💌 둘만의 카드 덱'),
        h('p', { className: 'muted' }, '정답도 승패도 없어요. 번갈아 뽑고, 부담스러운 카드는 편하게 넘겨요.'),
        h('select', { value: filter, 'aria-label': '카드 종류', onChange: function (e) { setFilter(e.target.value); setCard(null); } }, ['전체', '대화', '미션', '밸런스'].map(function (x) { return h('option', { key: x }, x); })),
        h('div', { className: 'couple-card', 'aria-live': 'polite' }, h('span', { className: 'pill pink' }, card === null ? '우리 둘의 시간' : CARDS[card][0]), h('p', null, card === null ? '카드 한 장으로 시작하는 작은 데이트' : CARDS[card][1])),
        h('p', { className: 'muted center' }, '남은 카드 ' + remaining + '장 · 같은 카드는 다시 나오지 않아요'),
        h('div', { className: 'row' }, h('button', { className: 'btn', onClick: drawCard, disabled: remaining === 0 }, remaining ? '카드 뽑기' : '모두 뽑았어요'), h('button', { className: 'btn ghost', onClick: function () { setUsed([]); setCard(null); } }, '덱 다시 섞기')));
    } else {
      var finished = game.winner !== null || game.draw;
      var status = game.winner !== null ? '🏆 ' + names[game.winner] + ' 승리!' : game.draw ? '🤝 무승부! 한 판 더?' : names[game.turn] + ' 차례';
      body = h('section', { className: 'card game-table' },
        h('div', { className: 'game-status', role: 'status', 'aria-live': 'polite' }, status),
        h('div', { className: 'player-legend' }, names.map(function (name, i) { return h('span', { key: i, className: 'player-tag player-' + i + (!finished && game.turn === i ? ' current' : '') }, (i === 0 ? '♥ ' : '★ ') + name); })),
        tab === 'four' ? h('div', null,
          h('p', { className: 'muted center' }, '열의 화살표를 눌러 말을 떨어뜨려요. 가로·세로·대각선 4개를 먼저 이으면 승리!'),
          h('div', { className: 'four-drops' }, Array.from({ length: COLS }, function (_, col) { return h('button', { key: col, className: 'drop-button', disabled: finished || four.board[col] !== null, 'aria-label': (col + 1) + '열에 놓기', onClick: function () { var next = dropFour(four, col); record(next, four); setFour(next); } }, '↓'); })),
          h('div', { className: 'four-board', role: 'img', 'aria-label': '사목 판. ' + four.board.map(function (v, i) { return v === null ? '' : (Math.floor(i / COLS) + 1) + '행 ' + (i % COLS + 1) + '열 ' + names[v]; }).filter(Boolean).join(', ') }, four.board.map(function (v, i) { return h('div', { key: i, className: 'four-cell' + (v === null ? '' : ' token-' + v) + (four.line.indexOf(i) >= 0 ? ' winning' : ''), 'aria-hidden': true }, v === null ? '' : v === 0 ? '♥' : '★'); }))) : h('div', null,
          h('p', { className: 'muted center' }, '주사위를 번갈아 굴려 24번 칸에 먼저 도착하세요. 넘쳐도 도착! 화살표 칸은 이동하고 💌 칸에서는 미션을 해봐요.'),
          h('div', { className: 'race-board', 'aria-label': '주사위 레이스 판' }, Array.from({ length: 24 }, function (_, index) {
            var row = Math.floor(index / 6), col = index % 6, tile = (3 - row) * 6 + (row % 2 === 0 ? col + 1 : 6 - col);
            return h('div', { key: tile, className: 'race-cell' + (tile === 24 ? ' finish' : '') + (JUMPS[tile] ? ' jump' : '') }, h('span', { className: 'tile-number' }, tile === 24 ? '🏁 24' : tile), h('span', { className: 'tile-event' }, JUMPS[tile] ? '→ ' + JUMPS[tile] : MISSIONS[tile] ? '💌' : ''), h('div', { className: 'race-tokens' }, game.positions.map(function (pos, player) { return pos === tile ? h('span', { key: player, className: 'race-token token-' + player, 'aria-label': names[player] }, player === 0 ? '♥' : '★') : null; })));
          })),
          h('p', { className: 'muted center' }, names.map(function (name, i) { return name + ': ' + (race.positions[i] ? race.positions[i] + '번' : '출발점'); }).join(' · ')),
          h('p', { className: 'race-message', role: 'status', 'aria-live': 'polite' }, race.message),
          h('button', { className: 'btn block dice-button', disabled: finished, onClick: function () { var next = rollRace(race, Math.floor(Math.random() * 6) + 1); record(next, race); setRace(next); } }, (race.roll ? ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][race.roll - 1] : '🎲') + ' ' + (finished ? '레이스 종료' : names[race.turn] + ' 주사위 굴리기'))),
        h('button', { className: 'btn ghost block', style: { marginTop: 14 }, onClick: restart }, finished ? '한 판 더!' : '새 게임'));
    }
    return h('div', null, h('h1', { className: 'title-xl' }, '🎮 둘이 게임방'), h('p', { className: 'muted' }, '휴대폰 하나로 마주 앉아 번갈아 즐겨요. 게임 진행은 이 화면에서만 유지돼요.'),
      h('div', { className: 'game-score' }, h('span', null, '이번 게임방 승수'), h('strong', null, names[0] + ' ' + scores[0] + ' : ' + scores[1] + ' ' + names[1])),
      h('div', { className: 'seg' }, [['four', '🔴 사목'], ['race', '🎲 레이스'], ['cards', '💌 카드 덱']].map(function (x) { return h('button', { key: x[0], className: tab === x[0] ? 'on' : '', 'aria-pressed': tab === x[0], onClick: function () { setTab(x[0]); } }, x[1]); })), body);
  }
  window.FutariGames = { GamePage: GamePage, newFour: newFour, dropFour: dropFour, newRace: newRace, rollRace: rollRace };
})();
