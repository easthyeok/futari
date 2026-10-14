const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
let slots=[],cursor=0,frames=[],effects=[];
const React={createElement:(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity).filter(v=>v!==null&&v!==false&&v!==undefined)}),useState:init=>{const i=cursor++;if(!(i in slots))slots[i]=typeof init==='function'?init():init;return[slots[i],value=>slots[i]=typeof value==='function'?value(slots[i]):value];},useRef:init=>{const i=cursor++;if(!(i in slots))slots[i]={current:init};return slots[i];},useEffect:f=>{effects.push(f);}};
const context={window:{React,requestAnimationFrame:f=>{frames.push(f);return frames.length;},cancelAnimationFrame:()=>{}},console,confirm:()=>true};
for(const file of ['board-games.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
const board=context.window.FutariBoardGames;
function render(comp,props,reset=false){if(reset){slots=[];frames=[];effects=[];}cursor=0;return comp(props);}
function all(n,p){if(!n||typeof n!=='object')return[];return(p(n)?[n]:[]).concat(...n.children.map(x=>all(x,p)));}
function text(n){return typeof n==='object'&&n?n.children.map(text).join(''):String(n??'');}
function button(t,label){const b=all(t,n=>n.type==='button'&&text(n)===label)[0];assert(b,label);return b;}
// Omok: legal turn, occupied cells, all win directions, no row wrapping, long lines.
for(const [step,start] of [[1,30],[15,4],[16,0],[14,14]]){
  let o=board.newOmok('me');for(let i=0;i<4;i++)o.board[start+step*i]='me';o=board.playOmok(o,'me',start+step*4);assert.equal(o.winner,'me');assert.equal(o.line.length,5);
}
let o=board.newOmok('me');assert.equal(board.playOmok(o,'you',0),o);o=board.playOmok(o,'me',0);assert.equal(board.playOmok(o,'you',0),o);assert.equal(board.playOmok(o,'you',225),o);
let wrap=board.newOmok('me');[13,14,15,16].forEach(i=>wrap.board[i]='me');assert.equal(board.playOmok(wrap,'me',17).winner,null);
let long=board.newOmok('me');[0,1,2,4,5].forEach(i=>long.board[i]='me');assert.equal(board.playOmok(long,'me',3).winner,'me');
// Expected revision guards stale actions; state survives reload, other member cannot move.
let room={settings:{me:'A',you:'B'},boardGames:{}};assert(board.apply(room,'omok','me',null,{type:'start'}));let expected={id:room.boardGames.omok.id,revision:0};assert(board.apply(room,'omok','me',expected,{index:112,type:'move'}));assert(!board.apply(room,'omok','me',expected,{index:113,type:'move'}));room=JSON.parse(JSON.stringify(room));assert.equal(room.boardGames.omok.board[112],'me');
expected={id:room.boardGames.omok.id,revision:1};assert(board.apply(room,'omok','me',expected,{type:'reset',action:'request'}));let requested=room.boardGames.omok;assert.equal(board.playOmok(requested,'you',113),requested);assert.equal(board.resetGame(requested,'me','accept','omok'),requested);const accepted=board.resetGame(requested,'you','accept','omok');assert(accepted.board.every(v=>v===null));assert.notEqual(accepted.id,requested.id);
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
assert.equal(board.apply(room,'code','me',null,{type:'start'}),false);
console.log('PASS: omok rules, stale actions, reset consent, undo consent, unique results, removed games rejected');
