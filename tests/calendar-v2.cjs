const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');const c={window:{React:{createElement(){}},FutariActivity:{id:()=>String(Math.random())}}};vm.runInNewContext(fs.readFileSync(require('path').join(__dirname,'../calendar.js'),'utf8'),c);const C=c.window.FutariCalendar;
assert(C.valid('2028-02-29'));assert(!C.valid('2026-02-29'));assert(!C.valid('2026-04-31'));
assert(C.occurs({date:'2026-12-28',repeat:'weekly'},'2027-01-04'));assert(!C.occurs({date:'2026-01-31',repeat:'monthly'},'2026-02-28'));assert(C.occurs({date:'2024-02-29',repeat:'yearly'},'2028-02-29'));assert(!C.occurs({date:'2026-10-01',repeat:'daily',repeatUntil:'2026-10-02'},'2026-10-03'));
let d={dates:[{id:'legacy',date:'2026-10-15',title:'old',memo:'preserved',memoryId:'m'}],memories:[{id:'m',photo:'data:old'}],settings:{anniversaries:[{name:'생일',date:'2000-10-15'}]}};
assert.equal(C.events(d,'2026-10-15').length,2);assert(!C.save(d,{date:'bad',title:'x'},'me'));assert(!C.save(d,{date:'2026-10-15',title:'x',time:'12:00',endTime:'11:00',allDay:false},'me'));
assert(C.save(d,{id:'new',date:'2026-10-15',title:'데이트',kind:'date'},'me'));assert.equal(d.dates[1].status,'accepted','schedule is immediately shared');
assert(C.review(d,'legacy','me',{memo:'좋았어',rating:4,photos:['data:new']}));assert.equal(d.memories.length,1);assert.equal(d.memories[0].photo,'data:old');assert.equal(d.dates[0].reviews.me.rating,4);d.dates[0].cancelled=true;assert(!C.events(d,'2026-10-15').some(e=>e.id==='legacy'));
console.log('PASS: leap/year transition, daily/weekly/monthly/yearly bounds, legacy schedule/photos, validation, immediate shared scheduling, non-destructive review and cancellation');
// Earlier calendars included standalone memories as well as schedules.
const history={dates:[{id:'d',date:'2026-10-14',title:'약속'}],memories:[{id:'m',date:'2026-10-14',title:'추억',photo:'data:old',memo:'기록'}],settings:{}};
const original=JSON.stringify(history),visible=C.events(history,'2026-10-14');
assert.equal(visible.length,2);assert.equal(visible.find(e=>e.kind==='memory').photo,'data:old');assert.equal(visible.find(e=>e.kind==='memory').virtual,true);
assert.equal(C.records(history).length,2);assert.equal(JSON.stringify(history),original,'display must not rewrite history');
assert.equal(C.events({memories:history.memories},'2026-10-14').length,1);
console.log('PASS: standalone historical memories, photos, all-record list and read-only display');
