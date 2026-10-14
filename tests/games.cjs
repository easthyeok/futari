const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
let slots=[],cursor=0,frames=[],effects=[];
const React={createElement:(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity).filter(v=>v!==null&&v!==false&&v!==undefined)}),useState:init=>{const i=cursor++;if(!(i in slots))slots[i]=typeof init==='function'?init():init;return[slots[i],value=>slots[i]=typeof value==='function'?value(slots[i]):value];},useRef:init=>{const i=cursor++;if(!(i in slots))slots[i]={current:init};return slots[i];},useEffect:f=>{effects.push(f);}};
const context={window:{React,requestAnimationFrame:f=>{frames.push(f);return frames.length;},cancelAnimationFrame:()=>{}},console,confirm:()=>true};
for(const file of ['games.js','board-games.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
const bounce=context.window.FutariGames,board=context.window.FutariBoardGames;
function render(comp,props,reset=false){if(reset){slots=[];frames=[];effects=[];}cursor=0;return comp(props);}
function all(n,p){if(!n||typeof n!=='object')return[];return(p(n)?[n]:[]).concat(...n.children.map(x=>all(x,p)));}
function text(n){return typeof n==='object'&&n?n.children.map(text).join(''):String(n??'');}
function button(t,label){const b=all(t,n=>n.type==='button'&&text(n)===label)[0];assert(b,label);return b;}
function center(index){return{x:30+(index%6)*50+25,y:20+Math.floor(index/6)*50+25};}
let g=bounce.newGame(0,[0,1,2,3,4,5,6,7,8]);
for(const index of [0,20,1,22,6,25,7])g=bounce.throwBall(g,center(index));
assert.equal(g.roundWinner,0);assert.equal(g.scores[0],1);assert.equal(g.line.length,4);
assert.equal(bounce.throwBall(g,center(12)),g);
g=bounce.nextRound(g);assert.equal(g.turn,1);assert.equal(g.card,1);assert.equal(g.scores[0],1);
assert.equal(bounce.nextRound(g),g);
let miss=bounce.throwBall(bounce.newGame(0,[0]),{x:-5,y:-5});assert.equal(miss.turn,1);assert.equal(miss.remaining[0],7);
let occupied=bounce.newGame(0,[0]);occupied.board[0]=1;occupied=bounce.throwBall(occupied,center(0));assert.equal(occupied.board[0],1);assert.equal(occupied.remaining[0],7);
let exhausted=bounce.newGame(0,[0]);for(let i=0;i<16;i++)exhausted=bounce.throwBall(exhausted,{x:-5,y:0});assert.equal(exhausted.remaining[0],8);assert(exhausted.board.every(v=>v===null));
assert.equal(bounce.aim(0,0),null);assert.equal(bounce.aim(0,30),null);assert.equal(bounce.aim(NaN,-30),null);assert(bounce.aim(0,-50).y<320);
assert.equal(bounce.landing({x:30,y:20}),-1);
const rotated=Array(36).fill(null);[0,1,2,6].forEach(i=>rotated[i]=0);assert.equal(bounce.matchPattern(rotated,0,bounce.patterns[1].cells).length,4);
let final=Object.assign(bounce.newGame(0,[0]),{scores:[2,0]});[0,1,6].forEach(i=>final.board[i]=0);final=bounce.throwBall(final,center(7));assert.equal(final.winner,0);assert.equal(bounce.nextRound(final),final);
// Actual pointer handlers, scaled coordinates, cancellation and double-release guard.
const props={data:{settings:{me:'A',you:'B'}}};let t=render(bounce.GamePage,props,true);
function surface(){return all(t,n=>n.type==='svg'&&n.props.className==='bounce-table')[0];}
const target={getBoundingClientRect:()=>({left:10,top:20,width:180,height:230}),setPointerCapture(){}};
const event=(x,y)=>({clientX:10+x/2,clientY:20+y/2,currentTarget:target,pointerId:1,pointerType:'touch',button:0,preventDefault(){}});
surface().props.onPointerDown(event(180,410));surface().props.onPointerCancel(event(180,440));surface().props.onPointerUp(event(180,450));assert.equal(frames.length,0);
surface().props.onPointerDown(event(180,410));surface().props.onPointerMove(event(180,461));t=render(bounce.GamePage,props);surface().props.onPointerUp(event(180,461));surface().props.onPointerUp(event(180,461));assert.equal(frames.length,1);
frames.shift()(0);frames.shift()(1200);t=render(bounce.GamePage,props);assert(text(t).includes('B 차례'));assert.equal(slots[0].throws,1);
assert(!text(t).includes('사목'));assert(!text(t).includes('레이스'));assert(!text(t).includes('카드 덱'));
console.log('PASS: bounce aim/landing, rotated patterns, round/match wins, misses, collisions, depleted balls, scaled touch/cancellation');
// Omok: legal turn, occupied cells, all win directions, no row wrapping, long lines.
for(const [step,start] of [[1,30],[15,4],[16,0],[14,14]]){
  let o=board.newOmok('me');for(let i=0;i<4;i++)o.board[start+step*i]='me';o=board.playOmok(o,'me',start+step*4);assert.equal(o.winner,'me');assert.equal(o.line.length,5);
}
let o=board.newOmok('me');assert.equal(board.playOmok(o,'you',0),o);o=board.playOmok(o,'me',0);assert.equal(board.playOmok(o,'you',0),o);assert.equal(board.playOmok(o,'you',225),o);
let wrap=board.newOmok('me');[13,14,15,16].forEach(i=>wrap.board[i]='me');assert.equal(board.playOmok(wrap,'me',17).winner,null);
let long=board.newOmok('me');[0,1,2,4,5].forEach(i=>long.board[i]='me');assert.equal(board.playOmok(long,'me',3).winner,'me');
// Deterministic no-joker code deck, initial four tiles each, order/tie sorting.
const deck=[];for(let n=0;n<12;n++)for(const color of ['white','black'])deck.push({id:color+'-'+n,color,value:n,revealed:false});
let code=board.newCode('me',deck);assert.equal(code.hands.me.length,4);assert.equal(code.pool.length,16);assert.equal(code.hands.me[0].color,'black');
assert.equal(board.playCode(code,'you',{type:'draw',color:'black'}),code);
assert.equal(board.playCode(code,'me',{type:'stop'}),code);
code=board.playCode(code,'me',{type:'draw',color:'black'});assert.equal(code.phase,'guess');assert.equal(code.drawn.color,'black');
const firstTarget=code.hands.you[0];code=board.playCode(code,'me',{type:'guess',tile:firstTarget.id,value:firstTarget.value});assert(code.hands.you[0].revealed);assert.equal(code.turn,'me');assert(code.guessed);
code=board.playCode(code,'me',{type:'stop'});assert.equal(code.turn,'you');assert.equal(code.hands.me.length,5);assert(!code.hands.me.find(t=>t.id==='black-4').revealed);
code=board.playCode(code,'you',{type:'draw',color:'white'});const drawn=code.drawn.id;code=board.playCode(code,'you',{type:'guess',tile:code.hands.me[0].id,value:11});assert.equal(code.turn,'me');assert(code.hands.you.find(t=>t.id===drawn).revealed);
let empty=board.newCode('me',deck);empty.pool=[];empty=board.playCode(empty,'me',{type:'draw'});empty=board.playCode(empty,'me',{type:'guess',tile:empty.hands.you[0].id,value:11});assert(empty.hands.me[0].revealed);assert.equal(empty.turn,'you');
let win=board.newCode('me',deck);win.hands.you.slice(1).forEach(t=>t.revealed=true);win=board.playCode(win,'me',{type:'draw',color:'black'});win=board.playCode(win,'me',{type:'guess',tile:win.hands.you[0].id,value:win.hands.you[0].value});assert.equal(win.winner,'me');assert.equal(board.playCode(win,'me',{type:'draw',color:'black'}),win);
// Expected revision guards stale actions; state survives reload, other member cannot move.
let room={settings:{me:'A',you:'B'},boardGames:{}};assert(board.apply(room,'omok','me',null,{type:'start'}));let expected={id:room.boardGames.omok.id,revision:0};assert(board.apply(room,'omok','me',expected,{index:112,type:'move'}));assert(!board.apply(room,'omok','me',expected,{index:113,type:'move'}));room=JSON.parse(JSON.stringify(room));assert.equal(room.boardGames.omok.board[112],'me');
expected={id:room.boardGames.omok.id,revision:1};assert(board.apply(room,'omok','me',expected,{type:'reset',action:'request'}));let requested=room.boardGames.omok;assert.equal(board.playOmok(requested,'you',113),requested);assert.equal(board.resetGame(requested,'me','accept','omok'),requested);const accepted=board.resetGame(requested,'you','accept','omok');assert(accepted.board.every(v=>v===null));assert.notEqual(accepted.id,requested.id);
// Render own secrets only; hidden opponents never appear in text/aria labels.
room.boardGames.code=board.newCode('me',deck);
t=render(board.SharedGame,{data:room,member:'me',kind:'code',update:f=>f(room)},true);
const hidden=all(t,n=>n.props.className&&n.props.className.startsWith('code-tile')).slice(0,4);assert(hidden.every(n=>text(n).startsWith('?')));assert(hidden.every(n=>n.props['aria-label'].endsWith('비공개')));
t=render(board.SharedGame,{data:room,member:'you',kind:'code',update:f=>f(room)},true);assert(text(t).includes('A의 차례를 기다려요'));assert(!text(t).includes('검정 뽑기'));
console.log('PASS: omok directions/turn legality, code sorting/draw/guess/stop/win, empty pool, persisted state, stale action guards, mutual reset, UI secret masking');

// Game quality: explicit guesses, input locks, reversible moves with consent, archival.
function drainEffects(){const list=effects.splice(0);for(const effect of list)effect();}
let undo=board.newOmok('me');undo=board.playOmok(undo,'me',112);undo=board.playOmok(undo,'you',113);
assert.equal(board.requestUndo(undo,'me','request'),undo,'only the last mover can ask');
undo=board.requestUndo(undo,'you','request');assert.equal(board.playOmok(undo,'me',114),undo);
assert.equal(board.requestUndo(undo,'you','accept'),undo,'self approval is forbidden');
undo=board.requestUndo(undo,'me','accept');assert.equal(undo.moves,1);assert.equal(undo.board[113],null);assert.equal(undo.last,112);assert.equal(undo.turn,'you');assert.equal(undo.audit.length,1);
let archived={settings:{me:'A',you:'B'},boardGames:{omok:board.newOmok('me')}};
for(const index of [0,1,2,3])archived.boardGames.omok.board[index]='me';
let stamp={id:archived.boardGames.omok.id,revision:0};assert(board.apply(archived,'omok','me',stamp,{type:'move',index:4}));assert.equal(archived.gameResults.length,1);
board.recordResult(archived,'omok',archived.boardGames.omok);assert.equal(archived.gameResults.length,1,'same finish cannot inflate wins');
stamp={id:archived.boardGames.omok.id,revision:archived.boardGames.omok.revision};board.apply(archived,'omok','me',stamp,{type:'reset',action:'request'});
stamp={id:archived.boardGames.omok.id,revision:archived.boardGames.omok.revision};board.apply(archived,'omok','you',stamp,{type:'reset',action:'accept'});assert.equal(archived.gameResults.length,1);assert.equal(archived.boardGames.omok.black,'you','starting side alternates');
let guesses={settings:{me:'A',you:'B'},boardGames:{code:board.newCode('me',deck)}};
guesses.boardGames.code=board.playCode(guesses.boardGames.code,'me',{type:'draw',color:'black'});
let calls=0;const guessProps={data:guesses,member:'me',kind:'code',update:f=>{calls++;f(guesses);}};
t=render(board.SharedGame,guessProps,true);drainEffects();
let hiddenTiles=all(t,n=>n.props.className&&n.props.className.startsWith('code-tile'));
hiddenTiles[0].props.onClick();t=render(board.SharedGame,guessProps);
button(t,'2').props.onClick();assert.equal(calls,0,'number selection must not send a guess');t=render(board.SharedGame,guessProps);
const commit=button(t,'2 · 추리 확정');commit.props.onClick();commit.props.onClick();assert.equal(calls,1,'double tap must produce one command');
t=render(board.SharedGame,{...guessProps,gameSaving:true});assert(!text(t).includes('어떤 타일을 뽑을까요?'));assert(!text(t).includes('숫자를 선택하세요'));
// Physical flight starts/ends exactly, and shrinks with each bounce.
const shot={x:100,y:120,power:80};const startFlight=bounce.sampleFlight(shot,0),endFlight=bounce.sampleFlight(shot,1);
assert.equal(startFlight.x,180);assert.equal(startFlight.y,375);assert(Math.abs(endFlight.x-shot.x)<1e-9);assert(Math.abs(endFlight.y-shot.y)<1e-9);
assert(bounce.sampleFlight(shot,.285).height>bounce.sampleFlight(shot,.715).height);assert(Math.abs(bounce.sampleFlight(shot,.57).height)<1e-9);
const local=new Map();context.localStorage={getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v)};
let persistent=bounce.newGame(0,[0]);persistent=bounce.throwBall(persistent,center(0));bounce.persistGame('room',persistent);assert.equal(bounce.savedGame('room').board[0],0);assert.equal(bounce.savedGame('other').throws,0);
local.set('futari_bounce_corrupt','{"board":[]}');assert.equal(bounce.savedGame('corrupt').board.length,36);
// A released throw is settled before animation; leaving cannot cancel a miss.
t=render(bounce.GamePage,{...props,room:'settle-room'},true);surface().props.onPointerDown(event(180,410));surface().props.onPointerUp(event(180,445));assert.equal(bounce.savedGame('settle-room').throws,1);
console.log('PASS: confirmation/double-tap locks, consent-only undo, alternating colours, unique persistent results, decreasing physical hops, local resume, committed throws before animation');
