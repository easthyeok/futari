/* 저장되는 시간제한 없는 2인 보드게임. 본인의 차례만 조작한다. */
(function () {
  'use strict';
  var React=window.React, h=React.createElement, N=15;
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function other(who) { return who==='me'?'you':'me'; }
  function id() { return Date.now().toString(36)+Math.random().toString(36).slice(2,9); }
  function common(first) { return {id:id(),revision:0,first:first || 'me',turn:first || 'me',winner:null,resetRequest:null,undoRequest:null,history:[],audit:[]}; }
  function newOmok(first) { return Object.assign(common(first),{board:Array(N*N).fill(null),black:first || 'me',moves:0,last:null,line:[]}); }
  function playOmok(game, who, index) {
    if (game.winner!==null || game.resetRequest || game.undoRequest || game.turn!==who || !Number.isInteger(index) || index<0 || index>=N*N || game.board[index]!==null) return game;
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
    next.turn=other(who);next.history.push({who:who,index:index,move:next.moves,text:(r+1)+'행 '+(c+1)+'열에 두었어요'});
    return next;
  }
  function resetGame(game,who,action,kind) {
    if(who!=='me'&&who!=='you')return game;
    if(action==='request'&&!game.resetRequest&&!game.undoRequest){var next=copy(game);next.resetRequest=who;next.revision++;return next;}
    if(action==='cancel'&&game.resetRequest===who){var next=copy(game);next.resetRequest=null;next.revision++;return next;}
    if(action==='decline'&&game.resetRequest&&game.resetRequest!==who){var next=copy(game);next.resetRequest=null;next.revision++;return next;}
    if(action==='accept'&&game.resetRequest&&game.resetRequest!==who)return newOmok(other(game.first || game.black || 'me'));
    return game;
  }
  function moveIndex(item) {
    if(Number.isInteger(item.index))return item.index;
    var match=(item.text||'').match(/(\d+)행 (\d+)열/);
    return match?(Number(match[1])-1)*N+Number(match[2])-1:null;
  }
  function requestUndo(game,who,action) {
    if(game.winner!==null || game.resetRequest || !game.moves)return game;
    var last=game.history[game.history.length-1];
    if(action==='request'&&!game.undoRequest&&last&&last.who===who){var next=copy(game);next.undoRequest=who;next.revision++;return next;}
    if((action==='cancel'&&game.undoRequest===who)||(action==='decline'&&game.undoRequest&&game.undoRequest!==who)){var next=copy(game);next.undoRequest=null;next.revision++;return next;}
    if(action==='accept'&&game.undoRequest&&game.undoRequest!==who){
      var next=copy(game),requester=next.undoRequest;
      next.board[next.last]=null;next.moves--;next.history.pop();
      next.last=next.history.length?moveIndex(next.history[next.history.length-1]):null;
      next.turn=requester;next.undoRequest=null;next.revision++;
      if(!next.audit)next.audit=[];next.audit.push({type:'undo',requestedBy:requester,acceptedBy:who,at:new Date().toISOString()});return next;
    }
    return game;
  }
  function recordResult(room,kind,game) {
    if(kind!=='omok'||game.winner===null || game.winner===undefined)return;
    if(!room.gameResults)room.gameResults=[];
    var matchId=game.id || game.matchId;if(!matchId)return;
    if(room.gameResults.some(function(r){return r.id===matchId;}))return;
    var winner=game.winner;
    room.gameResults.push({id:matchId,kind:kind,winner:winner,endedAt:new Date().toISOString(),players:{me:room.settings.me,you:room.settings.you},moves:game.moves || game.throws || (game.history || []).length,history:copy(game.history || []),audit:copy(game.audit || []),scores:game.scores?game.scores.slice():null});
  }
  function apply(room,kind,who,expected,action) {
    if(kind!=='omok'||who!=='me'&&who!=='you')return false;
    if(!room.boardGames)room.boardGames={};
    var current=room.boardGames[kind];
    if(action.type==='start'){
      if(current)return false;
      room.boardGames[kind]=newOmok(who);return true;
    }
    if(!current||!expected||current.id!==expected.id||current.revision!==expected.revision)return false;
    var next=action.type==='reset'?resetGame(current,who,action.action,kind):action.type==='undo'&&kind==='omok'?requestUndo(current,who,action.action):playOmok(current,who,action.index);
    if(next===current)return false;recordResult(room,kind,current);recordResult(room,kind,next);room.boardGames[kind]=next;return true;
  }
  function SyncNotice(props) {
    if(!props.gameSaving)return null;
    var failed=(props.gameSyncMessage||'').indexOf('실패')>=0;
    return h('div',{className:'arena-sync',role:'status'},failed?'아직 상대에게 전달되지 않았어요. 저장 후 다음 수를 진행할 수 있어요.':'상대에게 수를 전달하고 있어요…',failed?h('button',{className:'arena-text-button',onClick:props.retryGameSave},'다시 시도'):null);
  }
  function MatchPlayers(props) {
    var game=props.game,room=props.room;
    return h('div',{className:'arena-players'},['me','you'].map(function(who){var active=game.turn===who&&game.winner===null;
      return h('div',{key:who,className:'arena-player'+(active?' active':'')},h('span',{className:'arena-avatar avatar-'+who},(room.settings[who]||who).slice(0,1)),h('div',null,h('strong',null,room.settings[who]),h('small',null,((game.black||'me')===who?'검은 돌 · 선공':'흰 돌 · 후공'))),active?h('span',{className:'arena-turn'},'차례'):null);
    }));
  }
  function Requests(props) {
    var game=props.game,who=props.who,send=props.send;
    var request=game.undoRequest||game.resetRequest,undo=!!game.undoRequest,type=undo?'undo':'reset';
    if(request)return h('section',{className:'arena-request',role:'status'},h('strong',null,undo?'한 수 무르기 제안':'새 경기 제안'),h('p',null,request===who?'상대의 동의를 기다립니다.':undo?'상대가 마지막 수를 되돌리고 싶어해요.':'현재 판을 마치고 새 경기를 시작할까요?'),request===who?h('button',{className:'btn ghost block',disabled:props.busy,onClick:function(){send({type:type,action:'cancel'});}},'제안 취소'):h('div',{className:'row'},h('button',{className:'btn',disabled:props.busy,onClick:function(){send({type:type,action:'accept'});}},'동의'),h('button',{className:'btn ghost',disabled:props.busy,onClick:function(){send({type:type,action:'decline'});}},'현재 판 유지')));
    var last=game.history[game.history.length-1];
    return h('div',{className:'arena-secondary-actions'},props.kind==='omok'&&game.winner===null&&last&&last.who===who?h('button',{className:'arena-text-button',disabled:props.busy,onClick:function(){send({type:'undo',action:'request'});}},'한 수 무르기 제안'):null,h('button',{className:'arena-text-button',disabled:props.busy,onClick:function(){send({type:'reset',action:'request'});}},game.winner===null?'새 판 제안':'재대결 제안'));
  }
  function SharedGame(props) {
    var kind=props.kind,who=props.member,room=props.data,game=(room.boardGames||{})[kind];
    var cs=React.useState(null),candidate=cs[0],setCandidate=cs[1];
    var zs=React.useState(false),zoom=zs[0],setZoom=zs[1];
    var ps=React.useState(null),replay=ps[0],setReplay=ps[1];
    var ms=React.useState(false),showMoves=ms[0],setShowMoves=ms[1];
    var clickLock=React.useRef(false);
    React.useEffect(function(){setCandidate(null);setReplay(null);clickLock.current=false;},[game&&game.id,game&&game.revision,props.gameSaving]);
    function send(action){
      if(props.gameSaving||clickLock.current)return;
      clickLock.current=true;
      var expected=game?{id:game.id,revision:game.revision}:null;
      (props.updateGame || props.update)(function(next){apply(next,kind,who,expected,action);});
      setCandidate(null);
    }
    if(!game)return h('section',{className:'arena-start'},h('div',{className:'arena-start-mark'},'● ○'),h('span',{className:'arena-kicker'},'둘만의 대국'),h('h2',null,'첫 수를 기다리는 판'),h('p',null,'15 × 15 자유 오목. 먼저 시작한 사람이 검은 돌을 가져요.'),h('button',{className:'btn block',disabled:props.gameSaving,onClick:function(){send({type:'start'});}},'경기 시작'),h(SyncNotice,props));
    var live=game.winner===null&&!game.resetRequest&&!game.undoRequest;
    var mine=game.turn===who&&live&&!props.gameSaving&&replay===null;
    var status=game.winner==='draw'?'무승부':game.winner!==null?room.settings[game.winner]+' 승리':game.resetRequest||game.undoRequest?'상대와 제안을 확인해주세요':props.gameSaving?'수를 전달하고 있어요':game.turn===who?'내 차례예요':room.settings[game.turn]+'의 차례를 기다려요';
    var moves=game.history.map(function(item){return {index:moveIndex(item),who:item.who};}).filter(function(item){return item.index!==null;});
    var canReplay=kind==='omok'&&moves.length===game.moves&&moves.length>0;
    var board=game.board,last=game.last;
    if(kind==='omok'&&replay!==null){board=Array(N*N).fill(null);moves.slice(0,replay).forEach(function(m){board[m.index]=m.who;});last=replay?moves[replay-1].index:null;}
    var body;
    if(kind==='omok') {
      var black=game.black||'me',columnLabels='ABCDEFGHIJKLMNO'.split('');
      body=h('section',{className:'arena-omok'},
        h('div',{className:'arena-board-tools'},h('span',null,replay!==null?'복기 '+replay+' / '+moves.length:game.moves+'수'),h('div',null,h('button',{className:'arena-text-button','aria-pressed':showMoves,onClick:function(){setShowMoves(!showMoves);}},'수 번호'),h('button',{className:'arena-text-button','aria-pressed':zoom,onClick:function(){setZoom(!zoom);}},zoom?'축소':'판 확대'))),
        h('div',{className:'omok-scroll'},h('div',{className:'omok-frame'+(zoom?' zoom':'')},h('div',{className:'omok-coordinates'},columnLabels.map(function(label){return h('span',{key:label},label);})),h('div',{className:'omok-board',role:'group','aria-label':'15 곱하기 15 오목판'},board.map(function(value,index){
          var moveNumber=showMoves?moves.findIndex(function(m){return m.index===index;})+1:0;
          var star=[48,52,56,108,112,116,168,172,176].indexOf(index)>=0;
          return h('button',{key:index,className:'omok-cell'+(value?(value===black?' stone-me':' stone-you'):'')+(last===index?' last':'')+(replay===null&&game.line.indexOf(index)>=0?' win':'')+(candidate===index?' candidate':'')+(star?' star':''),disabled:!mine||value!==null,'aria-label':(Math.floor(index/N)+1)+'행 '+(index%N+1)+'열 '+(value?(value===black?'검은 돌':'흰 돌'):'빈 칸'),'aria-pressed':candidate===index,onClick:function(){setCandidate(index);}},index%N===0?h('span',{className:'omok-row-label','aria-hidden':true},Math.floor(index/N)+1):null,value?h('span',{className:'stone','aria-hidden':true},moveNumber?h('small',null,moveNumber):null):candidate===index?h('span',{className:'preview-stone '+(who===black?'preview-black':'preview-white')},''):null);
        })))),
        h('div',{className:'arena-decision'},replay!==null?h('div',null,h('p',null,'복기 중에는 수를 둘 수 없어요.'),h('input',{type:'range',min:0,max:moves.length,value:replay,'aria-label':'복기할 수',onChange:function(e){setReplay(Number(e.target.value));}}),h('button',{className:'btn block',onClick:function(){setReplay(null);}},'현재 판으로 돌아가기')):mine?h('div',null,h('p',null,candidate===null?'판에서 교차점을 선택하세요.':columnLabels[candidate%N]+(Math.floor(candidate/N)+1)+' · 선택한 자리에 돌을 둡니다.'),h('button',{className:'btn block',disabled:candidate===null,onClick:function(){send({type:'move',index:candidate});}},candidate===null?'둘 자리를 선택하세요':'착수 확정')):h('p',null,status)),
        canReplay&&replay===null?h('button',{className:'arena-text-button',onClick:function(){setReplay(moves.length);setCandidate(null);}},'대국 복기'):null);
    }
    return h('div',{className:'arena-match'},h(MatchPlayers,{game:game,room:room,kind:kind}),h('div',{className:'arena-match-status',role:'status','aria-live':'polite'},h('span',{className:'arena-status-dot'}),status,h('small',null,'시간제한 없음')),h(SyncNotice,props),
      game.winner!==null?h('section',{className:'arena-result'},h('span',{className:'arena-kicker'},'MATCH RESULT'),h('h2',null,game.winner==='draw'?'좋은 승부였어요':room.settings[game.winner]+' 승리'),h('p',null,'오늘 첫 완주라면 마음 코인 15개가 우리 집에 쌓여요. 집에서 가구를 골라보세요!')):null,
      body,h('details',{className:'arena-rules'},h('summary',null,'게임 규칙'),h('p',null,'15×15 자유 오목. 금수 없이 가로·세로·대각선으로 5개 이상 이어도 승리합니다. 마지막 수만 상대 동의로 되돌릴 수 있습니다.')),
      game.history.length?h('details',{className:'arena-history'},h('summary',null,'최근 착수 기록 · '+game.history.length),h('ol',null,game.history.slice(-12).reverse().map(function(item,i){return h('li',{key:i},h('strong',null,room.settings[item.who]),' '+item.text);} ))):null,
      h(Requests,{game:game,kind:kind,who:who,send:send,busy:props.gameSaving}));
  }
  var CATALOG=[{id:'dodge',name:'총알 피하기',tag:'기록 대결',description:'총알 사이, 한 끗 차이의 커피 승부',detail:'각자 편할 때 · 하루 3번 최고 기록'},{id:'omok',name:'오목',tag:'둘만의 대국',description:'한 판의 즐거움이 우리 집의 가구로',detail:'하루 첫 완주 · 마음 코인 +15'}];
  function GameArtwork(props){
    if(props.kind==='dodge')return h('div',{className:'dodge-lobby-art','aria-hidden':true},h('span',null,'✦'),h('i',null),h('i',null),h('i',null));
    return h('svg',{className:'lobby-board-art',viewBox:'0 0 150 120','aria-hidden':true},h('rect',{x:8,y:8,width:134,height:104,rx:10,fill:'#cba36d'}),Array.from({length:5},function(_,r){return Array.from({length:6},function(_,c){return h('g',{key:r+'-'+c},h('path',{d:'M '+(20+c*22)+' 18 V 102 M 20 '+(18+r*21)+' H 130',stroke:'#987545',strokeWidth:.7}),((r*6+c)%7===0||(r===2&&c===3))?h('circle',{cx:20+c*22,cy:18+r*21,r:7,fill:c%2?'#f8f5e9':'#172725'}):null);});}));
  }
  function Results(props){var results=(props.data.gameResults||[]).filter(function(r){return r.kind==='omok';}),who=props.member,wins=results.filter(function(r){return r.winner===who;}).length,losses=results.filter(function(r){return r.winner===other(who);}).length;
    return h('section',{className:'arena-records'},h('div',{className:'arena-section-title'},h('h2',null,'우리의 전적'),h('span',null,results.length+'경기')),h('div',{className:'arena-stat-grid'},h('div',null,h('strong',null,wins),h('small',null,'나의 승리')),h('div',null,h('strong',null,losses),h('small',null,'상대의 승리')),h('div',null,h('strong',null,results.filter(function(r){return r.winner==='draw';}).length),h('small',null,'무승부'))),results.length?h('details',null,h('summary',null,'지난 경기 보기'),results.slice().reverse().slice(0,20).map(function(r){var catalog=CATALOG.find(function(x){return x.id===r.kind;});return h('div',{key:r.id,className:'arena-result-row'},h('span',null,catalog?catalog.name:r.kind),h('strong',null,r.winner==='draw'?'무승부':(r.players||props.data.settings)[r.winner]+' 승리'),h('small',null,new Date(r.endedAt).toLocaleDateString('ko-KR')));})):h('p',null,'첫 승부를 마치면 이곳에 기록돼요.'));
  }
  function BoardHub(props){var state=React.useState(null),tab=state[0],setTab=state[1];
    var selected=CATALOG.find(function(g){return g.id===tab;});
    function fullscreen(){if(typeof document==='undefined')return;if(document.fullscreenElement){document.exitFullscreen().catch(function(){});}else if(document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(function(){});}
    return h('div',{className:'game-hub'},selected?h('div',null,h('header',{className:'arena-game-header'},h('button',{className:'arena-back',onClick:function(){setTab(null);}},'‹ 게임룸'),h('div',null,h('small',null,selected.tag),h('h1',null,selected.name)),typeof document!=='undefined'&&document.documentElement&&document.documentElement.requestFullscreen?h('button',{className:'arena-text-button',onClick:fullscreen},'전체 화면'):null),tab==='dodge'?h(window.FutariDodge.DodgePage,Object.assign({},props,{key:tab})):h(SharedGame,Object.assign({},props,{kind:tab,key:tab}))):h('div',null,h('header',{className:'arena-lobby-header'},h('span',{className:'arena-kicker'},'FUTARI GAME ROOM'),h('h1',null,'오늘, 한 판 할까요?'),h('p',null,'우리만의 승부가 시작되는 곳')),h('div',{className:'arena-game-list'},CATALOG.map(function(item){var game=(props.data.boardGames||{})[item.id],live=game&&game.winner===null;return h('button',{key:item.id,className:'arena-game-card',onClick:function(){setTab(item.id);}},h(GameArtwork,{kind:item.id}),h('div',{className:'arena-game-card-copy'},h('span',{className:'arena-game-category'},item.tag),h('h2',null,item.name),h('p',null,item.description),h('small',null,item.detail),h('strong',{className:'arena-game-cta'},item.id==='dodge'?'기록에 도전 →':live?(game.turn===props.member?'내 차례 · 이어하기':'진행 중 · 판 보기'):'경기 시작 →')));})),h(Results,props)));
  }
  window.FutariBoardGames={BoardHub:BoardHub,SharedGame:SharedGame,newOmok:newOmok,playOmok:playOmok,resetGame:resetGame,requestUndo:requestUndo,recordResult:recordResult,apply:apply};
})();
