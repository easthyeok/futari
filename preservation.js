/* Snapshot before replacement. Never remove an existing recovery snapshot. */
(function(){'use strict';
 function preserve(storage,room,raw,reason){if(raw===null||raw===undefined)return null;var text=typeof raw==='string'?raw:JSON.stringify(raw),prefix='futari_recovery_snapshot_'+encodeURIComponent(room)+'_',known=[];if(typeof storage.key==='function'){for(var n=0;n<storage.length;n++){var candidate=storage.key(n);if(candidate&&candidate.indexOf(prefix)===0)known.push(candidate);}}else known=Object.keys(storage).filter(function(k){return k.indexOf(prefix)===0;});
  for(var i=0;i<known.length;i++){try{if(JSON.parse(storage.getItem(known[i])).raw===text)return known[i];}catch(e){}}
  var key=prefix+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8),value=JSON.stringify({savedAt:new Date().toISOString(),room:room,reason:reason,raw:text});
  storage.setItem(key,value);if(storage.getItem(key)!==value)throw Error('이전 저장값을 보관하지 못했어요. 먼저 기기 백업을 내려받아주세요.');return key;
 }
 function write(storage,room,next){var key='futari_cache_'+room,raw=storage.getItem(key),serialized=JSON.stringify(next);
  if(raw&&raw!==serialized){var previous=JSON.parse(raw);var continued=previous.pending&&next.pending&&(previous.outbox||[]).every(function(tx){return(next.outbox||[]).some(function(n){return n.id===tx.id;});});if(previous.pending&&!continued&&next.pending!==false)preserve(storage,room,raw,'before-cache-replacement');}storage.setItem(key,serialized);
 }
 function entry(storage,room,loaded,version){var key='futari_cache_'+room,raw=storage.getItem(key);if(raw){var existing;try{existing=JSON.parse(raw);}catch(e){preserve(storage,room,raw,'unreadable-cache');throw Error('기존 기기 저장값을 확인할 수 없어요. 읽기 전용 복구 화면에서 백업해주세요.');}
   // Entry retains pending data verbatim; confirmed caches can be read from the server.
   // Pending local edits must be handed to the sync session, never replaced by a login read.
   if(existing.pending)return existing;
  }
  var next={data:loaded,base:loaded,pending:false,version:version,outbox:[]};write(storage,room,next);return next;
 }
 function archive(storage){return new Promise(function(resolve,reject){
  if(!window.indexedDB)return resolve();
  var request=window.indexedDB.open('futari-recovery',1);
  request.onupgradeneeded=function(){request.result.createObjectStore('snapshots',{keyPath:'key'});};
  request.onerror=function(){reject(request.error);};
  request.onsuccess=function(){var db=request.result,entries=[];
   for(var i=0;i<storage.length;i++){var key=storage.key(i);if(key&&key.indexOf('futari_recovery_snapshot_')===0)entries.push({key:key,raw:storage.getItem(key)});}
   if(!entries.length){db.close();resolve();return;}
   var tx=db.transaction('snapshots','readwrite');entries.forEach(function(e){tx.objectStore('snapshots').put(e);});
   tx.oncomplete=function(){try{entries.forEach(function(e){if(storage.getItem(e.key)===e.raw)storage.removeItem(e.key);});db.close();resolve();}catch(e){db.close();reject(e);}};
   tx.onabort=function(){db.close();reject(tx.error||Error('백업 보관 실패'));};
  };
 });}
 function archived(){return new Promise(function(resolve,reject){if(!window.indexedDB)return resolve([]);var req=window.indexedDB.open('futari-recovery',1);req.onupgradeneeded=function(){req.result.createObjectStore('snapshots',{keyPath:'key'});};req.onerror=function(){reject(req.error);};req.onsuccess=function(){var db=req.result,tx=db.transaction('snapshots','readonly'),r=tx.objectStore('snapshots').getAll();tx.oncomplete=function(){db.close();resolve(r.result);};tx.onabort=function(){db.close();reject(tx.error);};};});}
 window.FutariPreservation={preserve:preserve,write:write,entry:entry,archive:archive,archived:archived};
})();
