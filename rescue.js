/* Read-only incident recovery. No network, service worker registration, or storage writes. */
(function(){'use strict';
 function collect(storage){var out={format:'futari-read-only-rescue-v1',savedAt:new Date().toISOString(),origin:window.location.origin,standalone:window.navigator.standalone===true,entries:[]};
  for(var i=0;i<storage.length;i++){var key=storage.key(i);if(key&&(key==='couple_timeline_v1'||key.indexOf('futari_')===0))out.entries.push({key:key,raw:storage.getItem(key)});}return out;
 }
 function candidates(bundle){var out=[];
  function add(key,value){if(!value||typeof value!=='object')return;if(Array.isArray(value.dates))out.push({source:key,settings:value.settings||{},dates:value.dates,data:value});}
  bundle.entries.forEach(function(e){try{var v=JSON.parse(e.raw);add(e.key,v);add(e.key+' · data',v.data);add(e.key+' · base',v.base);if(typeof v.raw==='string'){var nested=JSON.parse(v.raw);add(e.key+' · snapshot',nested);add(e.key+' · snapshot data',nested.data);add(e.key+' · snapshot base',nested.base);}}catch(error){/* original raw remains in export */}});return out;
 }
 function download(bundle){var text=JSON.stringify(bundle,null,2),blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='futari_iphone_rescue_'+Date.now()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},5000);}
 var button=document.getElementById('export-rescue'),status=document.getElementById('rescue-status'),list=document.getElementById('rescue-list');
 if(button)button.addEventListener('click',function(){try{var bundle=collect(localStorage);download(bundle);status.textContent=bundle.entries.length+'개의 원본 저장값을 내려받았어요. 아이폰의 파일 앱에서 JSON 파일을 확인해주세요.';}catch(e){status.textContent='백업 파일을 만들지 못했어요: '+e.message;}});
 if(list){try{var bundle=collect(localStorage),items=candidates(bundle);status.textContent='이 화면은 저장값을 읽기만 합니다. '+items.length+'개의 일정 데이터 후보를 찾았어요.';items.forEach(function(item){var section=document.createElement('section'),heading=document.createElement('h2'),source=document.createElement('p');heading.textContent='약속 '+item.dates.length+'개';source.textContent=item.source;section.appendChild(heading);section.appendChild(source);item.dates.slice().sort(function(a,b){return String(a.date||'').localeCompare(String(b.date||''));}).forEach(function(event){var p=document.createElement('p');p.textContent=[event.date,event.time,event.title||'(제목 없음)',event.cancelled?'취소 기록':''].filter(Boolean).join(' · ');section.appendChild(p);});list.appendChild(section);});if(!items.length)status.textContent='현재 저장 공간에서 일정을 찾지 못했어요. 성실이가 사용하던 Safari 또는 홈 화면 앱과 같은 방식으로 열었는지 확인해주세요. 원본 백업도 먼저 내려받아주세요.';}catch(e){status.textContent='기기 저장소를 읽지 못했어요: '+e.message;}}
 window.FutariRescue={collect:collect,candidates:candidates};
})();
