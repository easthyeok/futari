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
frames.shift()(0);frames.shift()(1000);t=render(bounce.GamePage,props);assert(text(t).includes('B 차례'));assert.equal(slots[0].throws,1);
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
