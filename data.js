(function(){'use strict';
 var VERSION=2;
 function copy(v){return JSON.parse(JSON.stringify(v),function(k,v){if(['__proto__','prototype','constructor'].indexOf(k)>=0)throw Error('지원하지 않는 데이터 키입니다.');return v;});}
 function migrate(raw){var d=copy(raw||{});if((d.schemaVersion||0)>VERSION)throw Error('더 새로운 데이터입니다. 앱을 업데이트해주세요.');
  d.settings=Object.assign({me:'나',you:'너',startDate:'',anniversaries:[]},d.settings||{});
  ['foodWishes','memories','places','buckets','dates','moods','polls','gameResults','activities','mail'].forEach(function(k){if(d[k]===undefined)d[k]=[];if(!Array.isArray(d[k]))throw Error(k+' 데이터 형식 오류');});
  ['answers','together','boardGames','dodge','animalCare','collection','commits'].forEach(function(k){if(d[k]===undefined)d[k]={};});
  d.collection=Object.assign({crops:{},teamHarvests:0},d.collection||{});
  d.house=Object.assign({owned:[],equipped:{},placements:{},avatars:{me:{color:'#d58b79',style:'round'},you:{color:'#8baabd',style:'round'}}},d.house||{});
  d.farm=Object.assign({level:0,buildings:{},crops:{},seedSpent:0,harvestCoins:0,harvests:0},d.farm||{});
  d.notificationReads=Object.assign({me:{},you:{}},d.notificationReads||{});d.schemaVersion=VERSION;return d;
 }
 function backup(storage,room,raw){if(!raw||(raw.schemaVersion||0)>=VERSION)return;var key='futari_backup_v'+(raw.schemaVersion||0)+'_'+room;if(storage.getItem(key))return;storage.setItem(key,JSON.stringify({savedAt:new Date().toISOString(),data:raw}));if(!storage.getItem(key))throw Error('마이그레이션 백업을 저장하지 못했어요. 설정에서 백업을 내보내주세요.');}
 function same(a,b){if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;var ak=Object.keys(a),bk=Object.keys(b);return ak.length===bk.length&&ak.every(function(k){return Object.prototype.hasOwnProperty.call(b,k)&&same(a[k],b[k]);});}
 function conflict(path){var e=Error('동시에 같은 항목을 변경했어요: '+path.join(' / ')+'. 미저장 변경은 보관됩니다.');e.conflict=true;throw e;}
 function merge(base,local,remote,path){path=path||[];var key=path.join('.');
  if(same(base,local))return remote===undefined?undefined:copy(remote);
  if(same(base,remote))return local===undefined?undefined:copy(local);
  if(['farm.seedSpent','farm.harvestCoins','farm.harvests','collection.teamHarvests'].indexOf(key)>=0||key.indexOf('collection.crops.')===0)return (remote||0)+(local||0)-(base||0);
  if(same(local,remote))return local===undefined?undefined:copy(local);
  if(Array.isArray(local)&&Array.isArray(remote)&&(!base||Array.isArray(base))){base=base||[];
   var keyed=local.concat(remote,base).every(function(v){return v&&typeof v==='object'&&v.id;});
   if(keyed){var out=[],ids=Array.from(new Set(remote.concat(local,base).map(function(v){return v.id;})));ids.forEach(function(id){var find=function(a){return a.find(function(v){return v.id===id;});};var v=merge(find(base),find(local),find(remote),path.concat(id));if(v!==undefined)out.push(v);});return out;}
   if(/house.owned/.test(key))return Array.from(new Set(remote.concat(local)));conflict(path);
  }
  if(local&&remote&&typeof local==='object'&&typeof remote==='object'&&!Array.isArray(local)&&!Array.isArray(remote)&&(base===undefined||base&&typeof base==='object')){
   var out={};Object.keys(Object.assign({},base||{},local,remote)).forEach(function(k){var value=merge((base||{})[k],local[k],remote[k],path.concat(k));if(value!==undefined)out[k]=value;});return out;
  }
  conflict(path);
 }
 function reconcile(base,local,remote){local=copy(local);remote=copy(remote);var crops=(base.farm||{}).crops||{};Object.keys(crops).forEach(function(k){var l=((local.farm||{}).crops||{})[k],r=((remote.farm||{}).crops||{})[k];if(!same(crops[k],l)&&!same(crops[k],r)){var b=crops[k];if(l&&r&&l.id===b.id&&r.id===b.id&&l.plantedAt===b.plantedAt&&r.plantedAt===b.plantedAt){var watered=merge(b.watered||{},l.watered||{},r.watered||{},['farm','watered']),newCount=Object.keys(watered).filter(function(w){return watered[w]&&!(b.watered||{})[w];}).length,readyAt=Math.min(l.readyAt,r.readyAt,b.readyAt-newCount*15000);l.watered=r.watered=watered;l.readyAt=r.readyAt=readyAt;}else conflict(['farm','crops',k]);}});
  var d=merge(base,local,remote);if(window.FutariHome&&window.FutariHome.balance(d)<0)conflict(['공동 지갑','잔액 부족']);return d;
 }

 function diff(a,b,path){path=path||[];if(same(a,b))return[];
  if(Array.isArray(a)&&Array.isArray(b)&&a.concat(b).every(function(v){return v&&v.id;})){var out=[],ids=Array.from(new Set(a.concat(b).map(function(v){return v.id;})));ids.forEach(function(id){out=out.concat(diff(a.find(function(v){return v.id===id;}),b.find(function(v){return v.id===id;}),path.concat({id:id})));});return out;}
  if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b)){var out=[];Array.from(new Set(Object.keys(a).concat(Object.keys(b)))).forEach(function(k){out=out.concat(diff(a[k],b[k],path.concat(k)));});return out;}
  return[{path:path,base:a,value:b,removed:b===undefined}];
 }
 function get(d,path){return path.reduce(function(v,k){return v===undefined?undefined:typeof k==='object'?(Array.isArray(v)?v.find(function(x){return x.id===k.id;}):undefined):v[k];},d);}
 function put(d,path,value,removed){var key=path[path.length-1],parent=get(d,path.slice(0,-1));if(parent===undefined)conflict(path);if(typeof key==='object'){var i=parent.findIndex(function(v){return v.id===key.id;});if(removed){if(i>=0)parent.splice(i,1);}else if(i>=0)parent[i]=copy(value);else parent.push(copy(value));}else if(removed)delete parent[key];else parent[key]=copy(value);}
 function apply(remote,ops){var d=copy(remote);
  ops.forEach(function(op){var key=op.path.join('.'),current=get(d,op.path),value=op.value;
   if(op.removed&&op.path[0]==='farm'&&op.path[1]==='crops'&&current===undefined&&op.base!==undefined)conflict(op.path);
   var counter=['farm.seedSpent','farm.harvestCoins','farm.harvests','collection.teamHarvests'].indexOf(key)>=0||key.indexOf('collection.crops.')===0;
   if(counter&&typeof value==='number'){value=(current||0)+value-(op.base||0);}
   else if(op.path[0]==='farm'&&op.path[1]==='crops'&&op.path[3]==='readyAt'&&typeof current==='number'&&!same(current,op.base)){value=current+value-op.base;}
   else if(key==='house.owned'&&Array.isArray(current)&&Array.isArray(value)&&!same(current,op.base)){value=Array.from(new Set(current.concat(value)));}
   else if(op.base===undefined&&current&&value&&typeof current==='object'&&typeof value==='object'&&!Array.isArray(current)&&!Array.isArray(value)){value=merge({},value,current,op.path);}
   else if(same(current,value))return;
   else if(!same(current,op.base))conflict(op.path);
   put(d,op.path,value,op.removed);
  });if(window.FutariHome&&window.FutariHome.balance(d)<0)conflict(['공동 지갑','잔액 부족']);return d;
 }
 function replay(remote,outbox){var d=copy(remote);outbox.forEach(function(tx){if(!(d.commits||{})[tx.id])d=apply(d,tx.ops);});return d;}
 window.FutariData={VERSION:VERSION,migrate:migrate,backup:backup,merge:merge,reconcile:reconcile,copy:copy,same:same,diff:diff,apply:apply,replay:replay};
})();
