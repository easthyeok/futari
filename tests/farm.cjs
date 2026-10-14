const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const context={window:{React:{createElement(){}}}};
for(const file of ['home.js','farm.js','today.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
const home=context.window.FutariHome,farm=context.window.FutariFarm,today=context.window.FutariToday;
function fresh(){return{settings:{me:'A',you:'B'},together:{},memories:[]};}
function complete(d,date){for(const w of ['me','you']){home.act(d,date,w,'moods','😊');home.act(d,date,w,'travel',0);home.act(d,date,w,'food',2);home.act(d,date,w,'notes','같이 산책하고 싶어');}}
let d=fresh();assert.equal(home.balance(d),0);assert(!farm.build(d,0,'garden'));
complete(d,'2026-10-14');assert.equal(home.earned(d),36,'four paired missions plus 12 bonus');
const before=home.earned(d);complete(d,'2026-10-14');home.act(d,'2026-10-14','me','notes','다른 답');assert.equal(home.earned(d),before,'edits do not farm rewards');
home.act(d,'2026-10-14','me','food',1);assert.equal(d.together['2026-10-14'].food.me,2,'paired choice is locked');
home.act(d,'2026-10-14','you','travel',4);assert.equal(d.together['2026-10-14'].travel.you,0);
assert(farm.build(d,0,'garden'));assert.equal(home.balance(d),24);assert(!farm.build(d,0,'garden'));assert(!farm.build(d,4,'garden'));assert(!farm.build(d,-1,'garden'));assert(!farm.build(d,1,'unknown'));
const now=100000;assert(farm.plant(d,0,'radish',now));assert.equal(home.balance(d),22);assert(!farm.plant(d,0,'radish',now));assert(!farm.harvest(d,0,now+100));
assert(farm.water(d,0,'me',now));assert(!farm.water(d,0,'me',now));assert(farm.water(d,0,'you',now));assert.equal(d.farm.crops[0].readyAt,now+30000);
assert(!farm.water(d,0,'alien',now));assert(!farm.harvest(d,0,NaN));assert(farm.harvest(d,0,now+30000));assert.equal(home.balance(d),28);assert(!farm.harvest(d,0,now+30000),'harvest cannot be claimed twice');assert.equal(d.farm.harvests,1);
assert(farm.build(d,1,'flowers'));assert.equal(home.balance(d),10);assert(farm.plant(d,0,'radish',now));let balance=home.balance(d),crop=d.farm.crops[0];assert(farm.move(d,0,1));assert.equal(d.farm.buildings[1],'garden');assert.equal(d.farm.buildings[0],'flowers');assert.equal(d.farm.crops[1],crop);assert.equal(home.balance(d),balance,'swapping keeps costs and crops');assert(farm.move(d,1,2));assert.equal(d.farm.crops[2],crop);assert(!d.farm.crops[1]);assert(!farm.move(d,2,4));
assert(!farm.upgrade(d),'insufficient balance/hearts cannot expand');
for(let i=1;i<14;i++)complete(d,'2026-10-'+String(i).padStart(2,'0'));
assert(farm.upgrade(d));assert.equal(farm.level(d),1);assert(farm.build(d,7,'greenhouse'));assert(farm.plant(d,7,'carrot',now));assert.equal(d.farm.crops[7].readyAt,now+90000,'greenhouse is twice as fast');assert(!farm.plant(d,0,'radish',now));
assert(farm.upgrade(d));assert.equal(farm.level(d),2);assert(farm.upgrade(d));assert.equal(farm.level(d),3);assert(!farm.upgrade(d),'max level');assert(farm.build(d,15,'pond'));
const copy=JSON.parse(JSON.stringify(d));assert.equal(home.balance(copy),home.balance(d));assert(farm.harvest(copy,7,now+999999),'crops can be harvested after offline wait');
assert.equal(today.options('travel','2026-10-14').length,4);assert.equal(today.options('food','2026-10-14').length,4);assert.equal(today.question('2026-10-14'),today.question('2026-10-14'));
console.log('PASS: daily card bonus/idempotence, paired choice lock, build affordability/occupied/locked plots, seeds, two-member watering, harvest timing/uniqueness, crop-preserving swaps, expansions/max level, greenhouse, offline growth and JSON restore');
