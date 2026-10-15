/* Snapshot before replacement. Never remove an existing recovery snapshot. */
(function(){'use strict';
 function preserve(storage,room,raw,reason){if(raw===null||raw===undefined)return null;var text=typeof raw==='string'?raw:JSON.stringify(raw),prefix='futari_recovery_snapshot_'+encodeURIComponent(room)+'_',known=[];if(typeof storage.key==='function'){for(var n=0;n<storage.length;n++){var candidate=storage.key(n);if(candidate&&candidate.indexOf(prefix)===0)known.push(candidate);}}else known=Object.keys(storage).filter(function(k){return k.indexOf(prefix)===0;});
  for(var i=0;i<known.length;i++){try{if(JSON.parse(storage.getItem(known[i])).raw===text)return known[i];}catch(e){}}
  var key=prefix+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8),value=JSON.stringify({savedAt:new Date().toISOString(),room:room,reason:reason,raw:text});
  storage.setItem(key,value);if(storage.getItem(key)!==value)throw Error('이전 저장값을 보관하지 못했어요. 먼저 기기 백업을 내려받아주세요.');return key;
 }
 function write(storage,room,next){var key='futari_cache_'+room,raw=storage.getItem(key),serialized=JSON.stringify(next);
  if(raw&&raw!==serialized)preserve(storage,room,raw,'before-cache-replacement');storage.setItem(key,serialized);
 }
 function entry(storage,room,loaded,version){var key='futari_cache_'+room,raw=storage.getItem(key);if(raw){var existing;try{existing=JSON.parse(raw);}catch(e){preserve(storage,room,raw,'unreadable-cache');throw Error('기존 기기 저장값을 확인할 수 없어요. 읽기 전용 복구 화면에서 백업해주세요.');}
   preserve(storage,room,raw,'before-room-entry');
   // Pending local edits must be handed to the sync session, never replaced by a login read.
   if(existing.pending)return existing;
  }
  var next={data:loaded,base:loaded,pending:false,version:version,outbox:[]};write(storage,room,next);return next;
 }
 window.FutariPreservation={preserve:preserve,write:write,entry:entry};
})();
