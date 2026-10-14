/* 저장되는 시간제한 없는 2인 보드게임. 본인의 차례만 조작한다. */
(function () {
  'use strict';
  var React=window.React, h=React.createElement, N=15;
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function other(who) { return who==='me'?'you':'me'; }
  function id() { return Date.now().toString(36)+Math.random().toString(36).slice(2,9); }
  function common(first) { return {id:id(),revision:0,turn:first || 'me',winner:null,resetRequest:null,history:[]}; }
  function newOmok(first) { return Object.assign(common(first),{board:Array(N*N).fill(null),moves:0,last:null,line:[]}); }
  function playOmok(game, who, index) {
    if (game.winner!==null || game.resetRequest || game.turn!==who || !Number.isInteger(index) || index<0 || index>=N*N || game.board[index]!==null) return game;
    var next=copy(game), r=Math.floor(index/N), c=index%N;
    next.board[index]=who; next.moves++; next.last=index; next.revision++;
    [[0,1],[1,0],[1,1],[1,-1]].some(function (direction) {
      var line=[index];
      [-1,1].forEach(function (sign) {
        var row=r+direction[0]*sign,col=c+direction[1]*sign;
        while(row>=0&&row<N&&col>=0&&col<N&&next.board[row*N+col]===who) {line.push(row*N+col);row+=direction[0]*sign;col+=direction[1]*sign;}
      });
      if(line.length>=5){next.line=line;next.winner=who;return true;} return false;
    });
    if(next.winner===null&&next.moves===N*N)next.winner='draw';
    next.turn=other(who);next.history.push({who:who,text:(r+1)+'행 '+(c+1)+'열에 두었어요'});
    return next;
  }
  function sorted(hand) { return hand.sort(function (a,b) {return a.value-b.value || (a.color==='black'?-1:1);}); }
  function newCode(first, tiles) {
    var pool=tiles?copy(tiles):[];
    if(!tiles){for(var n=0;n<12;n++)['black','white'].forEach(function(color){pool.push({id:color+'-'+n,color:color,value:n,revealed:false});});
      for(var i=pool.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),v=pool[i];pool[i]=pool[j];pool[j]=v;}}
    return Object.assign(common(first),{hands:{me:sorted(pool.splice(0,4)),you:sorted(pool.splice(0,4))},pool:pool,drawn:null,phase:'draw',guessed:false});
  }
  function codeWinner(game) { ['me','you'].some(function(who){if(game.hands[who].every(function(t){return t.revealed;})){game.winner=other(who);return true;}return false;}); }
  function finishCodeTurn(game, reveal) {
    if(game.drawn){game.drawn.revealed=!!reveal;game.hands[game.turn].push(game.drawn);sorted(game.hands[game.turn]);game.drawn=null;}
    else if(reveal){var tile=game.hands[game.turn].find(function(t){return !t.revealed;});if(tile)tile.revealed=true;}
    codeWinner(game);game.turn=other(game.turn);game.phase='draw';game.guessed=false;
  }
  function playCode(game, who, action) {
    if(game.winner!==null || game.resetRequest || game.turn!==who)return game;
    var next=copy(game);
    if(action.type==='draw'){
      if(next.phase!=='draw')return game;
      // Choose the visible colour of a face-down tile, never its hidden value.
      var index=next.pool.findIndex(function(t){return t.color===action.color;});
      if(next.pool.length&&index<0)return game;
      next.drawn=next.pool.length?next.pool.splice(index,1)[0]:null;next.phase='guess';
      next.history.push({who:who,text:next.drawn?(next.drawn.color==='black'?'검정':'흰색')+' 타일을 뽑았어요':'남은 타일 없이 추리를 시작했어요'});
    }else if(action.type==='guess'){
      if(next.phase!=='guess'||!Number.isInteger(action.value)||action.value<0||action.value>11)return game;
      var target=next.hands[other(who)].find(function(t){return t.id===action.tile;});
      if(!target||target.revealed)return game;
      var correct=target.value===action.value;
      next.history.push({who:who,text:'상대 '+(target.color==='black'?'검정':'흰색')+' '+(next.hands[other(who)].indexOf(target)+1)+'번을 '+action.value+'로 추리 · '+(correct?'정답!':'오답'),tile:target.id,value:action.value,correct:correct});
      if(correct){target.revealed=true;next.guessed=true;codeWinner(next);}
      else finishCodeTurn(next,true);
    }else if(action.type==='stop'){
      if(next.phase!=='guess'||!next.guessed)return game;
      next.history.push({who:who,text:'이번 추리를 마치고 차례를 넘겼어요'});finishCodeTurn(next,false);
    }else return game;
    next.revision++;return next;
  }
  function resetGame(game,who,action,kind) {
    if(who!=='me'&&who!=='you')return game;
    if(action==='request'&&!game.resetRequest){var next=copy(game);next.resetRequest=who;next.revision++;return next;}
    if(action==='cancel'&&game.resetRequest===who){var next=copy(game);next.resetRequest=null;next.revision++;return next;}
    if(action==='decline'&&game.resetRequest&&game.resetRequest!==who){var next=copy(game);next.resetRequest=null;next.revision++;return next;}
    if(action==='accept'&&game.resetRequest&&game.resetRequest!==who)return kind==='omok'?newOmok(other(game.resetRequest)):newCode(other(game.resetRequest));
    return game;
  }
  function apply(room,kind,who,expected,action) {
    if(who!=='me'&&who!=='you')return false;
    if(!room.boardGames)room.boardGames={};
    var current=room.boardGames[kind];
    if(action.type==='start'){
      if(current)return false;
      room.boardGames[kind]=kind==='omok'?newOmok(who):newCode(who);return true;
    }
    if(!current||!expected||current.id!==expected.id||current.revision!==expected.revision)return false;
    var next=action.type==='reset'?resetGame(current,who,action.action,kind):kind==='omok'?playOmok(current,who,action.index):playCode(current,who,action);
    if(next===current)return false;room.boardGames[kind]=next;return true;
  }
  function ResetControls(props){var game=props.game,who=props.who,send=props.send;
    if(!game.resetRequest)return h('button',{className:'btn ghost block',onClick:function(){send({type:'reset',action:'request'});}},'새 판 제안하기');
    return h('section',{className:'card reset-request',role:'status'},h('p',null,game.resetRequest===who?'상대의 새 판 동의를 기다려요.':'상대가 새 판을 제안했어요. 수락하면 현재 판이 초기화됩니다.'),game.resetRequest===who?h('button',{className:'btn ghost block',onClick:function(){send({type:'reset',action:'cancel'});}},'제안 취소'):h('div',{className:'row'},h('button',{className:'btn',onClick:function(){send({type:'reset',action:'accept'});}},'새 판 시작'),h('button',{className:'btn ghost',onClick:function(){send({type:'reset',action:'decline'});}},'현재 판 이어가기')));
  }
  function SharedGame(props){
    var kind=props.kind,who=props.member,room=props.data,game=(room.boardGames||{})[kind];
    var ss=React.useState(null),selected=ss[0],setSelected=ss[1];
    var cs=React.useState(null),candidate=cs[0],setCandidate=cs[1];
    React.useEffect(function(){setSelected(null);setCandidate(null);},[game&&game.id,game&&game.revision]);
    function send(action){var expected=game?{id:game.id,revision:game.revision}:null;(props.updateGame || props.update)(function(next){apply(next,kind,who,expected,action);});setSelected(null);setCandidate(null);}
    var title=kind==='omok'?'⚫ 오목':'🔐 다빈치코드';
    if(!game)return h('section',{className:'card'},h('h2',{className:'title-xl'},title),h('p',{className:'muted'},'시간제한 없이 둘이 이어가는 게임이에요. 먼저 시작한 사람이 첫 차례를 가져요.'),h('button',{className:'btn block',onClick:function(){send({type:'start'});}},'둘이 시작하기'));
    var mine=game.turn===who&&game.winner===null&&!game.resetRequest;
    var status=game.winner==='draw'?'무승부예요':game.winner!==null?'🏆 '+room.settings[game.winner]+' 승리!':game.resetRequest?'새 판 제안에 답해주세요':mine?'내 차례예요':room.settings[game.turn]+'의 차례를 기다려요';
    var body;
    if(kind==='omok'){
      body=h('div',null,h('p',{className:'muted'},'금수 없는 자유 오목 · 5개 이상 이어도 승리. 칸을 고른 뒤 확인 버튼을 눌러 두세요.'),
        h('div',{className:'omok-scroll'},h('div',{className:'omok-board',role:'group','aria-label':'15 곱하기 15 오목판'},game.board.map(function(value,index){return h('button',{key:index,className:'omok-cell'+(value?' stone-'+value:'')+(game.last===index?' last':'')+(game.line.indexOf(index)>=0?' win':'')+(candidate===index?' candidate':''),disabled:!mine||value!==null,'aria-label':(Math.floor(index/N)+1)+'행 '+(index%N+1)+'열 '+(value?(value==='me'?'검은 돌':'흰 돌'):'빈 칸'),'aria-pressed':candidate===index,onClick:function(){setCandidate(index);}},value?h('span',{className:'stone','aria-hidden':true}):candidate===index?'＋':null);}))),
        mine?h('button',{className:'btn block',disabled:candidate===null,style:{marginTop:12},onClick:function(){send({type:'move',index:candidate});}},candidate===null?'둘 칸을 골라주세요':(Math.floor(candidate/N)+1)+'행 '+(candidate%N+1)+'열에 두기'):null,
        h('div',{className:'player-legend'},h('span',{className:'pill gray'},'⚫ '+room.settings.me),h('span',{className:'pill gray'},'⚪ '+room.settings.you)));
    }else{
      var opponent=other(who),target=game.hands[opponent].find(function(t){return t.id===selected&&!t.revealed;});
      function tileNode(tile,index,own){var visible=own||tile.revealed||game.winner!==null;
        return h('button',{key:tile.id,className:'code-tile '+tile.color+(tile.revealed?' revealed':'')+(selected===tile.id?' selected':''),disabled:own||!mine||game.phase!=='guess'||tile.revealed,'aria-label':(index+1)+'번 '+(tile.color==='black'?'검정':'흰색')+' 타일 '+(visible?tile.value:'비공개'),'aria-pressed':selected===tile.id,onClick:function(){setSelected(tile.id);}},h('span',null,visible?tile.value:'?'),h('small',null,tile.revealed?'공개':own?'나만 보기':(index+1)+'번'));}
      body=h('div',null,h('p',{className:'muted'},'0~11 검정·흰색 타일 · 작은 숫자가 왼쪽, 같은 숫자는 검정이 먼저. 조커 없이 플레이해요.'),
        h('h3',null,room.settings[opponent]+'의 코드'),h('div',{className:'code-hand'},game.hands[opponent].map(function(t,i){return tileNode(t,i,false);})),
        h('h3',null,'내 코드'),h('div',{className:'code-hand'},game.hands[who].map(function(t,i){return tileNode(t,i,true);})),
        game.drawn?h('p',{className:'code-drawn'},(game.turn===who?'이번에 뽑은 타일: '+(game.drawn.color==='black'?'검정 ':'흰색 ')+game.drawn.value:'상대가 '+(game.drawn.color==='black'?'검정':'흰색')+' 타일을 뽑았어요')):null,
        mine&&game.phase==='draw'?h('section',{className:'card'},h('h3',null,'타일을 뽑고 추리를 시작해요'),game.pool.length?h('div',{className:'row'},['black','white'].map(function(color){var count=game.pool.filter(function(t){return t.color===color;}).length;return h('button',{key:color,className:'btn '+(color==='white'?'ghost':''),disabled:!count,onClick:function(){send({type:'draw',color:color});}},(color==='black'?'검정':'흰색')+' 뽑기 · '+count+'개');})):h('button',{className:'btn block',onClick:function(){send({type:'draw'});}},'남은 타일 없이 추리 시작')):null,
        mine&&game.phase==='guess'?h('section',{className:'card'},h('h3',null,target?'선택한 타일의 숫자는?':'상대의 비공개 타일을 골라주세요'),h('div',{className:'code-numbers'},Array.from({length:12},function(_,n){return h('button',{key:n,className:'btn ghost',disabled:!target,onClick:function(){send({type:'guess',tile:target.id,value:n});}},String(n));})),h('p',{className:'muted'},'정답이면 계속 추리하거나 멈출 수 있어요. 오답이면 뽑은 타일이 공개되고 차례가 넘어가요.'),game.guessed?h('button',{className:'btn block',onClick:function(){send({type:'stop'});}},'여기서 멈추고 차례 넘기기'):null):null,
        h('p',{className:'muted'},'타일을 모두 쓰면 오답일 때 내 비공개 타일 중 맨 왼쪽이 공개됩니다.'));
    }
    return h('div',null,h('h2',{className:'title-xl'},title),h('p',{className:'muted'},'시간제한 없음 · 나중에 돌아와도 여기서 이어져요'),h('p',{className:'shared-status',role:'status','aria-live':'polite'},status),body,
      game.history.length?h('details',{className:'card'},h('summary',null,'최근 수와 추리 기록'),h('ol',null,game.history.slice(-12).reverse().map(function(item,i){return h('li',{key:i},room.settings[item.who]+': '+item.text);} ))):null,
      h(ResetControls,{game:game,who:who,send:send}));
  }
  function BoardHub(props){var state=React.useState('omok'),tab=state[0],setTab=state[1];
    return h('div',null,h('div',{className:'seg board-selector'},[['omok','⚫ 오목'],['code','🔐 다빈치코드'],['bounce','🏓 바운스오프']].map(function(x){var g=(props.data.boardGames||{})[x[0]],myTurn=g&&g.winner===null&&g.turn===props.member;return h('button',{key:x[0],className:tab===x[0]?'on':'','aria-pressed':tab===x[0],onClick:function(){setTab(x[0]);}},x[1],myTurn?h('span',{className:'turn-dot','aria-label':'내 차례'},'●'):null);})),tab==='bounce'?h(window.FutariGames.GamePage,props):h(SharedGame,Object.assign({},props,{kind:tab,key:tab})));
  }
  window.FutariBoardGames={BoardHub:BoardHub,SharedGame:SharedGame,newOmok:newOmok,playOmok:playOmok,newCode:newCode,playCode:playCode,resetGame:resetGame,apply:apply};
})();
