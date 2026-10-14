(function(){'use strict';var D=window.FutariData;
 function Session(opts){this.o=opts;this.base=opts.cached&&opts.cached.base?D.migrate(opts.cached.base):null;this.data=opts.cached&&opts.cached.data?D.migrate(opts.cached.data):null;this.version=opts.cached&&opts.cached.version;this.confirmed=this.base;this.dirty=!!(opts.cached&&opts.cached.pending);this.outbox=opts.cached&&opts.cached.outbox||[];this.running=false;this.closed=false;this.timer=null;}
 Session.prototype.emit=function(message){this.lastMessage=message;try{this.o.persist({data:this.data,base:this.base,version:this.version,pending:this.dirty,outbox:this.outbox});}catch(e){message='기기 백업 실패 · 저장 공간을 확인해주세요. '+message;}this.o.onChange(this.data,this.confirmed,message,this.dirty);};
 Session.prototype.open=async function(){try{var r=await this.o.load();if(this.closed)return;this.fatal=false;
  if(this.dirty){if(!this.base){if(this.version!==r.version)throw Error('이전 미저장 변경의 기준 버전을 확인할 수 없어요. 백업 후 복구해주세요.');this.base=r.data;}
   if(!this.outbox.length&&this.version!==r.version&&!D.same(this.base,r.data))throw Error('이전 버전 미저장 변경을 백업한 뒤 복구해주세요.');this.data=this.outbox.length?D.replay(r.data,this.outbox):D.reconcile(this.base,this.data,r.data);this.base=r.data;this.version=r.version;this.confirmed=r.data;this.emit('미저장 변경을 이어서 저장합니다');this.flush();
  }else{this.base=this.data=this.confirmed=r.data;this.version=r.version;this.emit('연결됨 ✓');}
 }catch(e){if(e.migration)this.fatal=true;if(!this.closed)this.emit('연결 실패 · '+e.message);}};
 Session.prototype.change=function(mutator,who){if(!this.data||this.fatal||this.closed)return;var before=this.data,next=D.copy(before);mutator(next);if(D.same(before,next))return;
  var id=window.FutariActivity.id();window.FutariActivity.capture(before,next,who,id);if(!next.commits)next.commits={};next.commits[id]=true;this.outbox.push({id:id,ops:D.diff(before,next)});this.data=next;this.dirty=true;this.emit('저장 대기…');this.schedule();};
 Session.prototype.schedule=function(){var self=this;clearTimeout(this.timer);this.timer=setTimeout(function(){self.flush();},250);};
 Session.prototype.flush=async function(){if(this.running||this.closed||this.fatal||!this.dirty)return;this.running=true;clearTimeout(this.timer);var snapshot=D.copy(this.data),base=D.copy(this.base||{}),committed=false;
  try{if(!this.base)throw Error('먼저 서버 기준 데이터를 확인해주세요. 미저장 변경은 보관됩니다.');for(var attempt=0;attempt<5;attempt++){
   try{var result=await this.o.save(snapshot,this.version);if(this.closed)return;this.version=result.version;committed=true;break;}
   catch(e){if(!e.cas)throw e;var remote=await this.o.load();if(this.closed)return;var pendingSnapshot=this.outbox.filter(function(tx){return(snapshot.commits||{})[tx.id];});var merged=this.outbox.length?D.replay(remote.data,pendingSnapshot):D.reconcile(base,snapshot,remote.data),working=this.outbox.length?D.replay(remote.data,this.outbox):D.reconcile(base,this.data,remote.data);snapshot=merged;this.data=working;this.base=this.confirmed=remote.data;this.version=remote.version;base=D.copy(remote.data);this.emit('서로의 변경을 합치는 중…');}
  }
  if(!committed)throw Error('변경이 많아 저장을 잠시 기다립니다. 다시 시도해주세요.');
  this.data=D.reconcile(snapshot,this.data,snapshot);this.outbox=this.outbox.filter(function(tx){return !(snapshot.commits||{})[tx.id];});this.base=this.confirmed=D.copy(snapshot);this.dirty=!D.same(this.data,snapshot);this.emit(this.dirty?'다음 변경 저장 중…':'저장됨 ✓');
 }catch(e){if(!this.closed)this.emit('저장 실패 · '+e.message);}finally{this.running=false;if(committed&&this.dirty&&!this.closed)this.schedule();}
 };
 Session.prototype.refresh=async function(){if(this.running||this.closed)return;try{var r=await this.o.load();if(this.closed||this.running)return;this.fatal=false;if(r.version===this.version&&!this.dirty){if((this.lastMessage||'').indexOf('연결 실패')===0)this.emit('다시 연결됨 ✓');return;}
  var current=this.data;if(this.dirty){if(!this.base){if(this.version!==r.version)throw Error('미저장 변경의 기준 버전이 달라요. 백업 후 복구해주세요.');this.base=r.data;}this.data=this.outbox.length?D.replay(r.data,this.outbox):D.reconcile(this.base,current,r.data);}else this.data=r.data;
  this.base=this.confirmed=r.data;this.version=r.version;this.emit(this.dirty?'미저장 변경 복구 중…':'동기화됨 ✓');if(this.dirty)this.schedule();
 }catch(e){if(e.migration)this.fatal=true;if(!this.closed)this.emit('연결 실패 · '+e.message);}};
 Session.prototype.close=function(){this.closed=true;clearTimeout(this.timer);};
 window.FutariSync={Session:Session};
})();
