const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const map=new Map([['futari_recovery_snapshot_room_1','original'],['futari_cache_room','pending edits']]),saved=new Map();let fail=false;
const storage={get length(){return map.size;},key:i=>[...map.keys()][i],getItem:k=>map.get(k)||null,removeItem:k=>map.delete(k)};
const db={close(){},transaction(){const tx={objectStore:()=>({put(e){saved.set(e.key,e);},getAll(){return {result:[...saved.values()]};}})};queueMicrotask(()=>{if(fail)tx.onabort();else tx.oncomplete();});return tx;}};
const c={window:{indexedDB:{open(){const req={result:db};queueMicrotask(()=>req.onsuccess());return req;}}}};
vm.runInNewContext(fs.readFileSync(require('path').join(__dirname,'../preservation.js'),'utf8'),c);
(async()=>{const p=c.window.FutariPreservation;await p.archive(storage);assert(!map.has('futari_recovery_snapshot_room_1'));assert.equal(map.get('futari_cache_room'),'pending edits');assert.equal((await p.archived())[0].raw,'original');map.set('futari_recovery_snapshot_room_2','keep on failure');fail=true;await assert.rejects(p.archive(storage));assert.equal(map.get('futari_recovery_snapshot_room_2'),'keep on failure');console.log('PASS: archival before cleanup, downloadable exact originals, pending cache exclusion, failed transaction retains local backups');})().catch(e=>{console.error(e);process.exitCode=1;});
