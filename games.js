/* 바운스오프 방식의 로컬 2인 게임 — 공을 당겨 튕겨 패턴을 완성 */
(function () {
  'use strict';
  var React = window.React, h = React.createElement;
  var SIZE = 6, CELL = 50, LEFT = 30, TOP = 20, LAUNCH = { x: 180, y: 410 };
  var PATTERNS = [
    { name: '작은 네모', cells: [[0,0],[0,1],[1,0],[1,1]] },
    { name: '꺾인 길', cells: [[0,0],[1,0],[2,0],[2,1]] },
    { name: '계단', cells: [[0,0],[1,1],[2,2],[3,3]] },
    { name: '지그재그', cells: [[0,0],[0,1],[1,1],[1,2]] },
    { name: '갈림길', cells: [[0,0],[0,1],[0,2],[1,1]] },
    { name: '나란히', cells: [[0,0],[0,1],[0,2],[0,3]] },
    { name: '작은 의자', cells: [[0,0],[1,0],[1,1],[2,1]] },
    { name: '다이아몬드', cells: [[0,1],[1,0],[1,2],[2,1]] },
    { name: '모서리', cells: [[0,0],[0,2],[2,0],[2,2]] }
  ];
  function shuffle() { var deck = PATTERNS.map(function (_, i) { return i; }); for (var i=deck.length-1;i>0;i--) { var j=Math.floor(Math.random()*(i+1)), v=deck[i]; deck[i]=deck[j]; deck[j]=v; } return deck; }
  function newGame(first, deck) { return { board: Array(36).fill(null), turn: first || 0, remaining: [8,8], scores: [0,0], deck: deck || shuffle(), card: 0, roundWinner: null, winner: null, line: [], throws: 0, message: '아래 공을 뒤로 당겼다가 놓아보세요.' }; }
  function variants(cells) {
    var result = [], shape = cells;
    for (var i=0;i<4;i++) {
      var minR=Math.min.apply(null,shape.map(function (p) {return p[0];})), minC=Math.min.apply(null,shape.map(function (p) {return p[1];}));
      result.push(shape.map(function (p) { return [p[0]-minR,p[1]-minC]; }));
      shape=shape.map(function (p) { return [p[1],-p[0]]; });
    }
    return result;
  }
  function matchPattern(board, player, pattern) {
    var shapes=variants(pattern), found=[];
    shapes.some(function (shape) {
      for (var r=0;r<SIZE;r++) for (var c=0;c<SIZE;c++) {
        var indices=shape.map(function (p) { return (r+p[0])*SIZE+c+p[1]; });
        if (shape.every(function (p) { return r+p[0]<SIZE && c+p[1]<SIZE && board[(r+p[0])*SIZE+c+p[1]]===player; })) { found=indices; return true; }
      }
      return false;
    });
    return found;
  }
  function aim(dx, dy) {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;
    var length=Math.hypot(dx,dy); if (length<12 || dy>=-6) return null;
    var limit=Math.min(1,110/length);
    return { x: LAUNCH.x+dx*2.3*limit, y: LAUNCH.y+dy*4.2*limit, power: Math.min(100,Math.round(length/110*100)) };
  }
  function landing(point) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return -1;
    var c=Math.floor((point.x-LEFT)/CELL), r=Math.floor((point.y-TOP)/CELL);
    if (r<0 || r>=SIZE || c<0 || c>=SIZE) return -1;
    var x=LEFT+c*CELL+CELL/2, y=TOP+r*CELL+CELL/2;
    return Math.hypot(point.x-x,point.y-y)<=20 ? r*SIZE+c : -1;
  }
  function throwBall(game, point) {
    if (game.winner!==null || game.roundWinner!==null || !point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return game;
    var player=game.turn; if (!game.remaining[player]) return game;
    var next=Object.assign({},game,{board:game.board.slice(),remaining:game.remaining.slice(),scores:game.scores.slice(),throws:game.throws+1});
    var index=landing(point);
    next.remaining[player]--;
    if (index<0) next.message='아쉽게 빗나갔어요! 방향과 힘을 조금 바꿔보세요.';
    else if (next.board[index]!==null) next.message='이미 공이 있는 칸이에요. 공이 튕겨 나갔어요!';
    else { next.board[index]=player; next.message='쏙! '+(Math.floor(index/SIZE)+1)+'행 '+(index%SIZE+1)+'열에 들어갔어요.'; }
    next.line=matchPattern(next.board,player,PATTERNS[next.deck[next.card]].cells);
    if (next.line.length) { next.roundWinner=player; next.scores[player]++; if (next.scores[player]>=3) next.winner=player; next.message='패턴 완성! 카드 한 장을 얻었어요.'; }
    else if (!next.remaining[0] && !next.remaining[1]) { next.board=Array(36).fill(null); next.remaining=[8,8]; next.message='둘 다 공을 다 썼어요. 같은 카드로 다시 도전해요!'; }
    next.turn=next.remaining[1-player]>0 ? 1-player : player;
    return next;
  }
  function nextRound(game) {
    if (game.roundWinner===null || game.winner!==null) return game;
    return Object.assign({},game,{board:Array(36).fill(null),remaining:[8,8],turn:1-game.roundWinner,card:(game.card+1)%game.deck.length,roundWinner:null,line:[],message:'새로운 패턴! 이번에는 다른 사람이 먼저 던져요.'});
  }
  function GamePage(props) {
    var gs=React.useState(newGame()), game=gs[0], setGame=gs[1];
    var as=React.useState(null), aiming=as[0], setAim=as[1];
    var fs=React.useState(null), flight=fs[0], setFlight=fs[1];
    var drag=React.useRef(null), busy=React.useRef(false), frame=React.useRef(null);
    React.useEffect(function () { return function () { if (frame.current!==null) window.cancelAnimationFrame(frame.current); busy.current=false; }; }, []);
    var names=[props.data.settings.me || '나',props.data.settings.you || '너'];
    var finished=game.roundWinner!==null, pattern=PATTERNS[game.deck[game.card]];
    function coordinates(event) { var rect=event.currentTarget.getBoundingClientRect(); return {x:(event.clientX-rect.left)*360/rect.width,y:(event.clientY-rect.top)*460/rect.height}; }
    function begin(event) {
      if (busy.current || finished || (event.pointerType==='mouse' && event.button!==0)) return;
      var point=coordinates(event); if (point.y<345) return;
      event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
      drag.current={x:point.x,y:point.y,id:event.pointerId}; setAim(null);
    }
    function move(event) { if (!drag.current || drag.current.id!==event.pointerId) return; var point=coordinates(event); setAim(aim(drag.current.x-point.x,drag.current.y-point.y)); }
    function cancel(event) { if (drag.current && drag.current.id===event.pointerId) { drag.current=null; setAim(null); } }
    function shoot(target) {
      if (!target || busy.current || finished) return;
      busy.current=true; setAim(null);
      var start=null;
      function animate(time) {
        if (start===null) start=time;
        var t=Math.min(1,(time-start)/950), hop=Math.abs(Math.sin(t*Math.PI*3))*(1-t)*42;
        setFlight({x:LAUNCH.x+(target.x-LAUNCH.x)*t,y:LAUNCH.y+(target.y-LAUNCH.y)*t-hop,scale:1+hop/90});
        if (t<1) frame.current=window.requestAnimationFrame(animate);
        else { frame.current=null; setFlight(null); setGame(function (current) { return throwBall(current,target); }); busy.current=false; }
      }
      frame.current=window.requestAnimationFrame(animate);
    }
    function release(event) {
      if (!drag.current || drag.current.id!==event.pointerId) return;
      var point=coordinates(event), target=aim(drag.current.x-point.x,drag.current.y-point.y);
      drag.current=null; setAim(null); shoot(target);
    }
    function keyboard(event) {
      if (finished || busy.current) return;
      var target=aiming || {x:180,y:195,power:50};
      var dx={ArrowLeft:-10,ArrowRight:10}[event.key] || 0, dy={ArrowUp:-10,ArrowDown:10}[event.key] || 0;
      if (dx || dy) { event.preventDefault(); setAim({x:Math.max(5,Math.min(355,target.x+dx)),y:Math.max(5,Math.min(330,target.y+dy)),power:target.power}); }
      if (event.key==='Enter' || event.key===' ') { event.preventDefault(); shoot(target); }
    }
    return h('div',null,
      h('h1',{className:'title-xl'},'🏓 바운스오프'),
      h('p',{className:'muted'},'휴대폰 하나로 번갈아 던져요. 같은 색 공으로 패턴을 만들고 카드 3장을 먼저 모으면 승리!'),
      h('div',{className:'bounce-scores'},names.map(function (name,i) {return h('div',{key:i,className:'player-tag player-'+i+(game.turn===i&&!finished?' current':'')},name,h('strong',null,' '+game.scores[i]+' / 3'),h('small',null,'남은 공 '+game.remaining[i]+'개'));})),
      h('section',{className:'bounce-challenge','aria-label':'목표 패턴 '+pattern.name},
        h('svg',{viewBox:'0 0 100 100',className:'pattern-preview','aria-hidden':true},pattern.cells.map(function (p,i) {return h('circle',{key:i,cx:15+p[1]*22,cy:15+p[0]*22,r:8,fill:'#c87f51'});})),
        h('div',null,h('span',{className:'eyebrow'},'CHALLENGE '+(game.card+1)),h('h2',{className:'title-lg'},pattern.name),h('p',{className:'muted'},'위치와 회전은 자유 · 내 색 공으로 완성'))),
      h('div',{className:'game-status',role:'status','aria-live':'polite'},game.winner!==null?'🏆 '+names[game.winner]+' 최종 승리!':finished?'🎉 '+names[game.roundWinner]+' 카드 획득!':names[game.turn]+' 차례'),
      h('svg',{viewBox:'0 0 360 460',className:'bounce-table',role:'application',tabIndex:0,'aria-label':'바운스오프 게임판. 아래 공을 뒤로 당겨 놓으세요. 키보드는 방향키로 조준하고 Enter로 던집니다.',onPointerDown:begin,onPointerMove:move,onPointerUp:release,onPointerCancel:cancel,onLostPointerCapture:cancel,onKeyDown:keyboard},
        h('defs',null,h('radialGradient',{id:'bounce-ball'},h('stop',{offset:'0%',stopColor:'#ffffff',stopOpacity:.65}),h('stop',{offset:'100%',stopColor:'#ffffff',stopOpacity:0}))),
        h('rect',{x:18,y:8,width:324,height:324,rx:24,fill:'#86634b'}),
        game.board.map(function (value,i) {var x=LEFT+(i%SIZE)*CELL+25,y=TOP+Math.floor(i/SIZE)*CELL+25;return h('g',{key:i},h('circle',{cx:x,cy:y,r:21,fill:'#543d30'}),value!==null?h('circle',{cx:x,cy:y,r:18,fill:value===0?'#ec6688':'#3485a8',stroke:game.line.indexOf(i)>=0?'#ffe680':'#ffffff55',strokeWidth:game.line.indexOf(i)>=0?4:1}):null,value!==null?h('circle',{cx:x-5,cy:y-6,r:7,fill:'url(#bounce-ball)'}):null);}),
        aiming?h('g',{pointerEvents:'none'},h('line',{x1:LAUNCH.x,y1:LAUNCH.y,x2:aiming.x,y2:aiming.y,stroke:'#9c7e65',strokeDasharray:'6 8',strokeWidth:2}),h('circle',{cx:aiming.x,cy:aiming.y,r:12,fill:'none',stroke:'#d83c6b',strokeWidth:2})):null,
        h('line',{x1:35,y1:350,x2:325,y2:350,stroke:'#d9bfa5',strokeDasharray:'4 5'}),
        h('text',{x:180,y:377,textAnchor:'middle',fontSize:12,fill:'#826651'},flight?'공이 튕기는 중…':'여기서 아래로 당겼다가 놓으세요 ↓'),
        h('circle',{cx:180,cy:410,r:24,fill:'none',stroke:'#d5b9a0',strokeWidth:2}),
        !flight?h('circle',{cx:180,cy:410,r:18,fill:game.turn===0?'#ec6688':'#3485a8'}):null,
        flight?h('g',{pointerEvents:'none'},h('ellipse',{cx:flight.x,cy:flight.y+12,rx:13,ry:4,fill:'#00000025'}),h('circle',{cx:flight.x,cy:flight.y,r:16*flight.scale,fill:game.turn===0?'#ec6688':'#3485a8'})):null),
      h('p',{className:'bounce-feedback',role:'status','aria-live':'polite'},game.message),
      h('p',{className:'muted'},'많이 당길수록 멀리 날아가요. 좌우로 당겨 방향을 바꿔요. 빈 구멍 안에 들어가야 공이 남아요.'),
      finished?h('button',{className:'btn block',onClick:function () {setAim(null);setGame(game.winner!==null?newGame(1-game.winner):nextRound(game));}},game.winner!==null?'한 경기 더!':'다음 카드 →'):null,
      h('button',{className:'btn ghost block',disabled:!!flight,style:{marginTop:10},onClick:function () {if(game.throws&&!confirm('현재 카드와 점수를 지우고 새 경기를 시작할까요?'))return;drag.current=null;setAim(null);setGame(newGame());}},'새 경기'),
      h('p',{className:'muted center'},'진행과 점수는 이 화면에서 유지돼요. 다른 화면으로 이동하면 새로 시작해요.'));
  }
  window.FutariGames={GamePage:GamePage,newGame:newGame,throwBall:throwBall,nextRound:nextRound,matchPattern:matchPattern,aim:aim,landing:landing,patterns:PATTERNS};
})();
