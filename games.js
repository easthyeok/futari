/* 바운스오프 방식의 로컬 2인 게임 — 공을 당겨 튕겨 패턴을 완성 */
(function () {
  'use strict';
  var React = window.React, h = React.createElement;
  var SIZE = 6, CELL = 50, LEFT = 30, TOP = 20, LAUNCH = { x: 180, y: 375 };
  var PATTERNS = [
    { name: '작은 네모', cells: [[0,0],[0,1],[1,0],[1,1]] },
    { name: '꺾인 길', cells: [[0,0],[1,0],[2,0],[2,1]] },
    { name: '계단', cells: [[0,0],[1,1],[2,2],[3,3]] },
    { name: '지그재그', cells: [[0,0],[0,1],[1,1],[1,2]] },
    { name: '갈림길', cells: [[0,0],[0,1],[0,2],[1,1]] },
    { name: '나란히', cells: [[0,0],[0,1],[0,2],[0,3]] },
    { name: '엇갈린 길', cells: [[0,0],[1,1],[1,2],[2,3]] },
    { name: '다이아몬드', cells: [[0,1],[1,0],[1,2],[2,1]] },
    { name: '모서리', cells: [[0,0],[0,2],[2,0],[2,2]] }
  ];
  function shuffle() { var deck = PATTERNS.map(function (_, i) { return i; }); for (var i=deck.length-1;i>0;i--) { var j=Math.floor(Math.random()*(i+1)), v=deck[i]; deck[i]=deck[j]; deck[j]=v; } return deck; }
  function newGame(first, deck) { return { matchId: Date.now().toString(36)+Math.random().toString(36).slice(2,8), history: [], board: Array(36).fill(null), turn: first || 0, remaining: [8,8], scores: [0,0], deck: deck || shuffle(), card: 0, roundWinner: null, winner: null, line: [], throws: 0, message: '아래 공을 뒤로 당겼다가 놓아보세요.' }; }
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
    return { x: LAUNCH.x+dx*2.3*limit, y: LAUNCH.y+dy*4.2*limit, power: Math.min(100,Math.round(length/110*100)), pullX: dx*limit, pullY: dy*limit };
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
    var next=Object.assign({},game,{board:game.board.slice(),remaining:game.remaining.slice(),scores:game.scores.slice(),history:(game.history || []).slice(),throws:game.throws+1});
    var index=landing(point);
    next.remaining[player]--;
    if (index<0) next.message='아쉽게 빗나갔어요! 방향과 힘을 조금 바꿔보세요.';
    else if (next.board[index]!==null) next.message='이미 공이 있는 칸이에요. 공이 튕겨 나갔어요!';
    else { next.board[index]=player; next.message='쏙! '+(Math.floor(index/SIZE)+1)+'행 '+(index%SIZE+1)+'열에 들어갔어요.'; }
    next.history.push({player:player,landing:index,scored:index>=0&&game.board[index]===null});
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
  function savedGame(room) {
    try {
      if(!room)return newGame();
      var value=JSON.parse(localStorage.getItem('futari_bounce_'+room)||'null');
      if(value&&Array.isArray(value.board)&&value.board.length===36&&value.board.every(function(v){return v===null||v===0||v===1;})&&Array.isArray(value.scores)&&value.scores.length===2&&Array.isArray(value.remaining)&&value.remaining.length===2&&Array.isArray(value.deck)&&value.deck.length>0&&Number.isInteger(value.card)&&value.card>=0&&value.card<value.deck.length&&(value.turn===0||value.turn===1)&&value.deck.every(function(i){return Number.isInteger(i)&&PATTERNS[i];})){
        if(!value.matchId)value.matchId=Date.now().toString(36);if(!value.history)value.history=[];return value;
      }
    } catch(e) {}
    return newGame();
  }
  function persistGame(room,game) { try { if(room)localStorage.setItem('futari_bounce_'+room,JSON.stringify(game)); }catch(e){} return game; }
  // Three parabolic hops, with a shorter flight and lower speed after each bounce.
  function sampleFlight(target,time) {
    var t=Math.max(0,Math.min(1,time)),lengths=[.57,.29,.14],speeds=[1,.78,.6084];
    var total=lengths.reduce(function(sum,length,i){return sum+length*speeds[i];},0),start=0,travel=0,hop=0;
    for(var i=0;i<3;i++){
      var progress=Math.min(1,Math.max(0,(t-start)/lengths[i]));
      travel+=progress*lengths[i]*speeds[i];
      if(t>=start&&t<=start+lengths[i]){var peak=(36+(target.power||50)*.35)*Math.pow(.25,i);hop=4*peak*progress*(1-progress);}
      start+=lengths[i];
    }
    var ratio=travel/total;
    return {x:LAUNCH.x+(target.x-LAUNCH.x)*ratio,y:LAUNCH.y+(target.y-LAUNCH.y)*ratio-hop,groundY:LAUNCH.y+(target.y-LAUNCH.y)*ratio,scale:1+hop/180,height:hop};
  }
  function GamePage(props) {
    var gs=React.useState(function(){return savedGame(props.room);}), game=gs[0], setGame=gs[1];
    var as=React.useState(null), aiming=as[0], setAim=as[1];
    var fs=React.useState(null), flight=fs[0], setFlight=fs[1];
    var drag=React.useRef(null), busy=React.useRef(false), frame=React.useRef(null);
    React.useEffect(function () { return function () { if (frame.current!==null) window.cancelAnimationFrame(frame.current); busy.current=false; }; }, []);
    React.useEffect(function(){persistGame(props.room,game);if(game.winner!==null&&props.onResult)props.onResult(game);},[game,props.room]);
    function commit(next){setGame(persistGame(props.room,next));}
    var names=[props.data.settings.me || '나',props.data.settings.you || '너'];
    var finished=game.roundWinner!==null, pattern=PATTERNS[game.deck[game.card]];
    function coordinates(event) { var rect=event.currentTarget.getBoundingClientRect(); return {x:(event.clientX-rect.left)*360/rect.width,y:(event.clientY-rect.top)*460/rect.height}; }
    function begin(event) {
      if (busy.current || finished || (event.pointerType==='mouse' && event.button!==0)) return;
      var point=coordinates(event); if (point.y<335) return;
      event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
      drag.current={x:point.x,y:point.y,id:event.pointerId}; setAim(null);
    }
    function move(event) { if (!drag.current || drag.current.id!==event.pointerId) return; var point=coordinates(event); setAim(aim(drag.current.x-point.x,drag.current.y-point.y)); }
    function cancel(event) { if (drag.current && drag.current.id===event.pointerId) { drag.current=null; setAim(null); } }
    function shoot(target) {
      if (!target || busy.current || finished) return;
      busy.current=true; setAim(null);
      var player=game.turn,settled=throwBall(game,target),priorBoard=game.board;
      setFlight(Object.assign(sampleFlight(target,0),{player:player,priorBoard:priorBoard}));
      // Settle and persist at release: leaving the screen cannot cancel a bad shot.
      commit(settled);
      if(settled.winner!==null&&props.onResult)props.onResult(settled);
      var start=null;
      function animate(time) {
        if(start===null)start=time;
        var t=Math.min(1,(time-start)/1100),sample=sampleFlight(target,t);sample.player=player;sample.priorBoard=priorBoard;setFlight(sample);
        if(t<1)frame.current=window.requestAnimationFrame(animate);
        else{frame.current=null;setFlight(null);busy.current=false;}
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
      h('p',{className:'arena-kicker'},'LOCAL DUEL · BEST OF FIVE'),
      h('p',{className:'muted'},'휴대폰 하나로 번갈아 던져요. 같은 색 공으로 패턴을 만들고 카드 3장을 먼저 모으면 승리!'),
      h('div',{className:'bounce-scores'},names.map(function (name,i) {return h('div',{key:i,className:'player-tag player-'+i+(game.turn===i&&!finished?' current':'')},name,h('strong',null,' '+game.scores[i]+' / 3'),h('small',null,'남은 공 '+game.remaining[i]+'개'),h('div',{className:'bounce-match-cards','aria-label':'획득 카드 '+game.scores[i]+'장'},[0,1,2].map(function(n){return h('i',{key:n,className:n<game.scores[i]?'won':''});})));})),
      h('section',{className:'bounce-challenge','aria-label':'목표 패턴 '+pattern.name},
        h('div',{className:'bounce-power'},h('span',null,'던지는 힘'),h('progress',{max:100,value:aiming?aiming.power:0,'aria-label':'던지는 힘'}),h('strong',null,aiming?aiming.power+'%':'공을 당겨보세요')),
      h('svg',{viewBox:'0 0 100 100',className:'pattern-preview','aria-hidden':true},pattern.cells.map(function (p,i) {return h('circle',{key:i,cx:15+p[1]*22,cy:15+p[0]*22,r:8,fill:'#c87f51'});})),
        h('div',null,h('span',{className:'eyebrow'},'CHALLENGE '+(game.card+1)),h('h2',{className:'title-lg'},pattern.name),h('p',{className:'muted'},'위치와 회전은 자유 · 내 색 공으로 완성'))),
      h('div',{className:'game-status',role:'status','aria-live':'polite'},flight?names[flight.player]+'의 공이 튕기는 중…':game.winner!==null?'🏆 '+names[game.winner]+' 최종 승리!':finished?'🎉 '+names[game.roundWinner]+' 카드 획득!':names[game.turn]+' 차례'),
      h('div',{className:'bounce-power'},h('span',null,'던지는 힘'),h('progress',{max:100,value:aiming?aiming.power:0,'aria-label':'던지는 힘'}),h('strong',null,aiming?aiming.power+'%':'공을 당겨보세요')),
      h('svg',{viewBox:'0 0 360 460',className:'bounce-table',role:'application',tabIndex:0,'aria-label':'바운스오프 게임판. 아래 공을 뒤로 당겨 놓으세요. 키보드는 방향키로 조준하고 Enter로 던집니다.',onPointerDown:begin,onPointerMove:move,onPointerUp:release,onPointerCancel:cancel,onLostPointerCapture:cancel,onKeyDown:keyboard},
        h('defs',null,h('radialGradient',{id:'bounce-ball'},h('stop',{offset:'0%',stopColor:'#ffffff',stopOpacity:.65}),h('stop',{offset:'100%',stopColor:'#ffffff',stopOpacity:0})),h('radialGradient',{id:'bounce-pink',cx:'30%',cy:'25%'},h('stop',{offset:'0%',stopColor:'#ffdab9'}),h('stop',{offset:'40%',stopColor:'#f09277'}),h('stop',{offset:'100%',stopColor:'#a94846'})),h('radialGradient',{id:'bounce-blue',cx:'30%',cy:'25%'},h('stop',{offset:'0%',stopColor:'#d6eeeb'}),h('stop',{offset:'40%',stopColor:'#88babb'}),h('stop',{offset:'100%',stopColor:'#3e737b'})),h('linearGradient',{id:'bounce-wood',x1:'0%',y1:'0%',x2:'100%',y2:'100%'},h('stop',{offset:'0%',stopColor:'#997448'}),h('stop',{offset:'100%',stopColor:'#604524'}))),
        h('rect',{x:18,y:8,width:324,height:324,rx:24,fill:'url(#bounce-wood)',stroke:'#cbae78',strokeWidth:2}),
        (flight&&flight.priorBoard?flight.priorBoard:game.board).map(function (value,i) {var x=LEFT+(i%SIZE)*CELL+25,y=TOP+Math.floor(i/SIZE)*CELL+25;return h('g',{key:i},h('circle',{cx:x,cy:y,r:21,fill:'#2d3020',stroke:'#d3b87855',strokeWidth:2}),value!==null?h('circle',{cx:x,cy:y,r:18,fill:value===0?'url(#bounce-pink)':'url(#bounce-blue)',stroke:game.line.indexOf(i)>=0?'#ffe680':'#ffffff55',strokeWidth:game.line.indexOf(i)>=0?4:1}):null,value!==null?h('circle',{cx:x-5,cy:y-6,r:7,fill:'url(#bounce-ball)'}):null);}),
        aiming?h('g',{pointerEvents:'none'},h('line',{x1:LAUNCH.x,y1:LAUNCH.y,x2:LAUNCH.x+(aiming.x-LAUNCH.x)*.4,y2:LAUNCH.y+(aiming.y-LAUNCH.y)*.4,stroke:'#9c7e65',strokeDasharray:'6 8',strokeWidth:2})):null,
        h('line',{x1:35,y1:335,x2:325,y2:335,stroke:'#d9bfa5',strokeDasharray:'4 5'}),
        h('text',{x:180,y:435,textAnchor:'middle',fontSize:12,fill:'#826651'},flight?'공이 튕기는 중…':'공을 아래로 당겨 놓으세요 ↓'),
        h('circle',{cx:180,cy:375,r:24,fill:'none',stroke:'#d5b9a0',strokeWidth:2}),
        !flight?h('circle',{cx:180,cy:375,r:18,fill:game.turn===0?'url(#bounce-pink)':'url(#bounce-blue)'}):null,
        flight?h('g',{pointerEvents:'none'},h('ellipse',{cx:flight.x,cy:flight.groundY+8,rx:Math.max(5,14-flight.height/8),ry:4,fill:'#00000025'}),h('circle',{cx:flight.x,cy:flight.y,r:16*flight.scale,fill:flight.player===0?'url(#bounce-pink)':'url(#bounce-blue)'})):null),
      h('p',{className:'bounce-feedback',role:'status','aria-live':'polite'},game.message),
      h('p',{className:'muted'},'많이 당길수록 멀리 날아가요. 좌우로 당겨 방향을 바꿔요. 빈 구멍 안에 들어가야 공이 남아요.'),
      finished?h('button',{className:'btn block',disabled:!!flight||props.gameSaving,onClick:function () {setAim(null);commit(game.winner!==null?newGame(1-game.winner):nextRound(game));}},game.winner!==null?'한 경기 더!':'다음 카드 →'):null,
      h('button',{className:'btn ghost block',disabled:!!flight||props.gameSaving,style:{marginTop:10},onClick:function () {if(game.throws&&!confirm('현재 카드와 점수를 지우고 새 경기를 시작할까요?'))return;drag.current=null;setAim(null);commit(newGame());}},'새 경기'),
      h('p',{className:'muted center'},'진행은 이 기기에 저장돼요. 게임룸으로 나갔다 와도 이어집니다.'));
  }
  window.FutariGames={savedGame:savedGame,persistGame:persistGame,sampleFlight:sampleFlight,GamePage:GamePage,newGame:newGame,throwBall:throwBall,nextRound:nextRound,matchPattern:matchPattern,aim:aim,landing:landing,patterns:PATTERNS};
})();
