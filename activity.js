(function(){'use strict';var h=window.React.createElement;
 function id(){return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,11);}
 function capture(before,after,who,batch){if(who!=='me'&&who!=='you')return;var events=[],same=window.FutariData.same;
  function add(type,text,tab,target){events.push({id:batch+'-'+events.length,actor:who,type:type,text:text,tab:tab,target:target||null,at:new Date().toISOString()});}
  ['dates','buckets','mail'].forEach(function(k){var old=before[k]||[],list=after[k]||[];list.forEach(function(v){var prev=old.find(function(x){return x.id===v.id;});if(same(prev,v))return;
   if(k==='dates')add('calendar',v.journalEdited?'우리의 하루 기록을 수정했어요':!prev?'새로운 일정을 등록했어요':v.cancelled?'일정을 취소했어요':'일정을 변경했어요','together',v.id);
   if(k==='buckets')add('wishlist',!prev?'위시리스트에 '+v.text+'을 등록했어요':v.done&&!prev.done?'위시리스트를 완료했어요':'위시리스트를 변경했어요','together',v.id);
   if(k==='mail')add('mail',!prev?'우편함에 편지를 보냈어요':v.readAt&&!prev.readAt?'편지를 읽었어요':'편지를 변경했어요','mail',v.id);
  });old.forEach(function(v){if(!list.some(function(x){return x.id===v.id;}))add(k==='dates'?'calendar':'wishlist',k==='dates'?'일정을 취소했어요':'위시리스트를 정리했어요','together',v.id);});});
  (after.memories||[]).forEach(function(m){if(!m.journalEdited)return;var previous=(before.memories||[]).find(function(v){return v.id===m.id;});if(!same(previous,m))add('journal',previous?'우리의 하루 기록을 수정했어요':'우리의 하루를 기록했어요','together',m.id);});
  Object.keys(after.together||{}).forEach(function(date){var a=(before.together||{})[date]||{},b=after.together[date];['moods','travel','food','notes','choices','activity','reactions'].forEach(function(k){if(!same((a[k]||{})[who],(b[k]||{})[who]))add(k==='notes'?'answer':'today',k==='notes'?'오늘의 질문에 답했어요':k==='moods'?'오늘의 기분을 나눴어요':k==='activity'?'함께한 시간을 남겼어요':'오늘의 취향과 마음을 나눴어요','today',date);});});
  var a=before.farm||{},b=after.farm||{};
  Object.keys(b.crops||{}).forEach(function(k){var c=b.crops[k],prev=(a.crops||{})[k];if(!prev||prev.plantedAt!==c.plantedAt){var crop=window.FutariFarm&&window.FutariFarm.crops.find(function(v){return v.id===c.id;});add('plant','텃밭에 '+(crop?crop.name:c.id)+'를 심었어요','home',k);}else if(!same(prev.watered,c.watered))add('water','텃밭에 물을 줬어요','home',k);});
  if((b.harvests||0)>(a.harvests||0))add('harvest','작물을 수확했어요','home');
  if((b.level||0)>(a.level||0))add('expand','우리 집을 확장했어요','home');
  if(!same(a.buildings,b.buildings))add('building','마을 건물을 짓거나 옮겼어요','home');
  var oldHouse=before.house||{},house=after.house||{};
  if(!same(oldHouse.owned,house.owned))add('purchase','새로운 가구를 구매했어요','home');
  if(!same(oldHouse.placements,house.placements)||!same(oldHouse.equipped,house.equipped))add('furniture','집 안 가구를 배치했어요','home');
  if((after.gameResults||[]).length>(before.gameResults||[]).length)add('game','보드게임 결과를 남겼어요','games');
  Object.keys(after.dodge||{}).forEach(function(day){var runs=(after.dodge[day]||{})[who]||[],old=((before.dodge||{})[day]||{})[who]||[];if(runs.some(function(r){return r.status==='finished'&&!old.some(function(p){return p.id===r.id&&p.status==='finished';});}))add('game','총알 피하기 기록을 남겼어요','games');});
  if(!same(before.animalCare,after.animalCare))add('animal','마을 동물을 돌봤어요','home');
  if(window.FutariCreatures){var C=window.FutariCreatures;Object.values(C.state(after).pets).forEach(function(p){var prev=C.state(before).pets[p.id];if(!prev){add('creature','새로운 '+C.species[p.species].family+'의 알을 데려왔어요','home');return;}if(C.stage(after,p)>C.stage(before,prev))add('creature','함께 키운 친구가 '+C.name(after,p)+' 모습으로 자랐어요','home');Object.keys(p.care||{}).forEach(function(day){var a=((prev.care||{})[day]||{})[who]||{},b=(p.care[day]||{})[who]||{};if(!a.food&&b.food)add('creature','작은 친구에게 간식을 줬어요','home');if(!a.play&&b.play)add('creature','작은 친구와 놀아줬어요','home');});if(prev.outfit!==p.outfit)add('creature','작은 친구에게 새 옷을 입혔어요','home');});}
  if(!after.activities)after.activities=[];var known=new Set(after.activities.map(function(e){return e.id;}));events.forEach(function(e){if(!known.has(e.id))after.activities.push(e);});return events;
 }
 function list(d,who){var seen={};return(d.activities||[]).filter(function(e){if(['plant','water','harvest','expand','building','purchase','furniture','animal'].indexOf(e.type)>=0||e.id.indexOf('crop-ready-')===0)return false;if(e.actor===who||e.audience&&e.audience!=='both'&&e.audience!==who||seen[e.id])return false;seen[e.id]=true;return true;}).sort(function(a,b){return b.at.localeCompare(a.at)||b.id.localeCompare(a.id);});}
 function unread(d,who){var read=(d.notificationReads||{})[who]||{};return list(d,who).filter(function(e){return !read[e.id];});}
 function groups(events){var out=[];events.forEach(function(e){var last=out[out.length-1];if(last&&['water','today','animal'].indexOf(e.type)>=0&&last.event.type===e.type&&last.event.actor===e.actor&&Math.abs(Date.parse(last.event.at)-Date.parse(e.at))<300000){last.items.push(e);}else out.push({event:e,items:[e]});});return out;}
 function read(d,who,ids){if(!d.notificationReads)d.notificationReads={me:{},you:{}};if(!d.notificationReads[who])d.notificationReads[who]={};ids.forEach(function(id){d.notificationReads[who][id]=true;});}
 function Center(props){var d=props.confirmed||{},who=props.member,events=list(d,who),newEvents=unread(d,who);return h('section',{className:'card notification-center'},h('div',{className:'shop-heading'},h('h1',{className:'title-xl'},'둘의 소식'),h('button',{className:'btn ghost sm',disabled:!newEvents.length,onClick:function(){props.update(function(d){read(d,who,newEvents.map(function(e){return e.id;}));});}},'모두 읽음')),h('p',{className:'muted'},'상대가 남긴 새로운 활동 '+newEvents.length+'개'),events.length?groups(events).map(function(g){var e=g.event,isNew=g.items.some(function(e){return newEvents.some(function(v){return v.id===e.id;});});return h('button',{key:e.id,className:'notification-row'+(isNew?' unread':''),onClick:function(){props.update(function(d){read(d,who,g.items.map(function(e){return e.id;}));});props.navigate(e.tab,e.target);}},h('span',null,isNew?'●':'✓'),h('div',null,h('strong',null,(e.actor==='system'?'':(props.data.settings[e.actor]||'상대')+'님이 ')+e.text+(g.items.length>1?' · '+g.items.length+'회':'')),h('small',null,new Date(e.at).toLocaleString('ko-KR'))));}):h('div',{className:'empty'},'새로운 소식이 오면 여기에 모아드릴게요.'));
 }
 window.FutariActivity={id:id,capture:capture,list:list,unread:unread,read:read,groups:groups,Center:Center};
})();
