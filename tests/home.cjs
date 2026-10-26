const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const context={window:{React:{createElement(){}}}};
vm.runInNewContext(fs.readFileSync(require('path').join(__dirname,'../home.js'),'utf8'),context);
const home=context.window.FutariHome;
let d={settings:{me:'A',you:'B'},memories:[],together:{},gameResults:[]};
assert.equal(home.balance(d),0);
assert.equal(home.decorate(d,'plant'),false,'cannot spend unavailable coins');
const date='2026-10-14';
for(const who of ['me','you']) {
 home.act(d,date,who,'moods','😊');
 home.act(d,date,who,'choices',0);
 home.act(d,date,who,'activity',true);
}
assert.equal(home.earned(d),36,'6 moods + 9 choices + 9 activity + 12 daily bonus');
assert(home.decorate(d,'plant'));assert.equal(home.balance(d),24);assert.equal(d.house.equipped.plant,'plant');
assert(home.decorate(d,'plant'));assert.equal(d.house.equipped.plant,null);assert.equal(home.balance(d),24,'removing does not refund or spend');
assert(home.decorate(d,'plant'));assert.equal(home.balance(d),24,'re-equipping is free');
assert.equal(home.decorate(d,'cat'),false);assert.equal(home.decorate(d,'missing'),false);
for(const who of ['me','you']) {home.act(d,date,who,'moods','🥰');home.act(d,date,who,'activity',true);home.act(d,date,who,'choices',1);}
assert.equal(home.earned(d),36,'repeated activity cannot farm rewards');
for(let i=0;i<3;i++)d.gameResults.push({id:String(i),kind:'omok',winner:i%2?'me':'you',endedAt:'2026-10-14T12:00:00Z'});
assert.equal(home.earned(d),51,'one match reward per day regardless of winner');
d.gameResults.push({kind:'code',winner:'me',endedAt:'2026-10-15T12:00:00Z'});assert.equal(home.earned(d),51);
d.gameResults.push({kind:'omok',winner:'draw',endedAt:'2026-10-15T12:00:00Z'});assert.equal(home.earned(d),66);
assert(home.decorate(d,'flowers'));assert.equal(d.house.equipped.plant,'flowers');assert(d.house.owned.includes('plant'));
const restored=JSON.parse(JSON.stringify(d));assert.equal(home.balance(restored),home.balance(d));assert.equal(restored.house.equipped.plant,'flowers');
assert(home.decorate(restored,'plant'));assert.equal(restored.house.owned.length,2);
console.log('PASS: legacy activity credit, daily bonus, limited match rewards, affordability, duplicate purchases, shared slots, inventory and JSON persistence');

let modern={settings:{me:'A',you:'B'},memories:[],together:{},gameResults:[]};for(const who of ['me','you'])for(const [kind,value] of [['moods','😊'],['moment',0],['imagine',1],['notes','답']])home.act(modern,date,who,kind,value);assert.equal(home.earned(modern),36);const saved=JSON.stringify(modern);home.act(modern,date,'me','moment',3);assert.equal(JSON.stringify(modern),saved);home.act(modern,date,'me','imagine',99);assert.equal(JSON.stringify(modern),saved);
