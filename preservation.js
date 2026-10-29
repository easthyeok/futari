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
 function entry(storage,room,loaded,version){if(deviceCaches[room])return deviceCaches[room];var key='futari_cache_'+room,raw=storage.getItem(key);if(raw){var existing;try{existing=JSON.parse(raw);}catch(e){preserve(storage,room,raw,'unreadable-cache');throw Error('기존 기기 저장값을 확인할 수 없어요. 읽기 전용 복구 화면에서 백업해주세요.');}
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
 var deviceCaches={},largeRooms={},queue=Promise.resolve();
 function cacheDB(){return new Promise(function(resolve,reject){if(!window.indexedDB)return reject(Error('기기 저장소를 사용할 수 없어요'));var r=window.indexedDB.open('futari-device-cache',1);r.onupgradeneeded=function(){r.result.createObjectStore('rooms');};r.onerror=function(){reject(r.error);};r.onsuccess=function(){resolve(r.result);};});}
 function hydrate(){return cacheDB().then(function(db){return new Promise(function(resolve,reject){var tx=db.transaction('rooms','readonly'),r=tx.objectStore('rooms').openCursor();r.onsuccess=function(){var cursor=r.result;if(cursor){deviceCaches[cursor.key]=cursor.value;cursor.continue();}};tx.oncomplete=function(){db.close();resolve();};tx.onabort=function(){db.close();reject(tx.error);};});});}
 function cached(storage,room){return deviceCaches[room]||JSON.parse(storage.getItem('futari_cache_'+room)||'null');}
 function persist(storage,room,next){
  // Confirmed snapshots need only one copy; pending changes retain their merge base.
  var compact=Object.assign({},next);if(!next.pending)delete compact.base;
  if(!deviceCaches[room]&&!largeRooms[room]){try{write(storage,room,compact);return Promise.resolve();}catch(e){if(!window.indexedDB)return Promise.reject(e);}}
  largeRooms[room]=true;var task=queue.catch(function(){}).then(function(){return cacheDB();}).then(function(db){return new Promise(function(resolve,reject){var tx=db.transaction('rooms','readwrite');tx.objectStore('rooms').put(compact,room);tx.oncomplete=function(){deviceCaches[room]=compact;db.close();resolve();};tx.onabort=function(){db.close();reject(tx.error);};});});queue=task;return task;
 }
 // A separate, verified snapshot lets the repair page upgrade a stuck writer.
 // The live room cache and pending flag are never cleared or replaced here.
 function backupPending(storage,room){return new Promise(function(resolve,reject){
  var value;try{value=cached(storage,room);if(!value||!value.pending)return resolve(false);if(!value.data||typeof value.data!=='object')throw Error('미저장 변경의 원본을 확인할 수 없어요. 먼저 기기 원본 백업을 내려받아주세요.');}catch(e){return reject(e);}
  var raw=JSON.stringify(value),key='futari_recovery_snapshot_'+encodeURIComponent(room)+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
  if(!window.indexedDB){try{preserve(storage,room,raw,'before-pending-shell-update');resolve(true);}catch(e){reject(e);}return;}
  var request=window.indexedDB.open('futari-recovery',1);
  request.onupgradeneeded=function(){request.result.createObjectStore('snapshots',{keyPath:'key'});};
  request.onerror=function(){reject(request.error);};
  request.onsuccess=function(){var db=request.result;try{var tx=db.transaction('snapshots','readwrite');
   tx.objectStore('snapshots').put({key:key,savedAt:new Date().toISOString(),room:room,reason:'before-pending-shell-update',raw:raw});
   tx.onabort=function(){db.close();reject(tx.error||Error('미저장 변경 백업 실패'));};
   tx.oncomplete=function(){try{var check=db.transaction('snapshots','readonly'),read=check.objectStore('snapshots').get(key);
    check.oncomplete=function(){db.close();if(read.result&&read.result.raw===raw)resolve(true);else reject(Error('미저장 변경 백업을 확인하지 못했어요.'));};
    check.onabort=function(){db.close();reject(check.error||Error('미저장 변경 백업 확인 실패'));};
   }catch(e){db.close();reject(e);}};
  }catch(e){db.close();reject(e);}};
 });}
 window.FutariPreservation={cached:cached,persist:persist,hydrate:hydrate,preserve:preserve,write:write,entry:entry,archive:archive,archived:archived,backupPending:backupPending};
})();
