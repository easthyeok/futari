/* Futari / NEON DRIFT. Deterministic 120 Hz simulation; no network in the game loop. */
(function () {
  'use strict';
  var React=window.React,h=React.createElement,W=360,H=480,STEP=1/120,LIMIT=90,VERSION=1;
  var PHASES=['FIRST LIGHT','CROSS CURRENT','STAR FALL','EVENT HORIZON','LAST ORBIT'];
  function day(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function hash(s){var n=2166136261;for(var i=0;i<s.length;i++)n=Math.imul(n^s.charCodeAt(i),16777619);return n>>>0;}
  function random(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function create(seed){return {seed:seed>>>0,t:0,tick:0,x:W/2,y:H*.76,bullets:[],warnings:[],trail:[],flash:0,dead:false,clear:false,near:0,next:0,event:0,phase:0};}
  function bullet(s,x,y,angle,speed,color){s.bullets.push({x:x,y:y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:3.2,color:color,near:false});}
  function spawn(s){
    var level=Math.min(4,Math.floor(s.t/18)),speed=65+level*14,k=s.event++;
    s.phase=level;
    if(k%3===0){
      var x=36+random(s)*288,y=-14,angle=Math.atan2(s.y-y,s.x-x),count=3+level*2;
      for(var i=0;i<count;i++)bullet(s,x,y,angle+(i-(count-1)/2)*.16,speed+12,'#ff799e');
    }else if(k%3===1){
      var left=k%2===0,cx=left?-16:W+16,cy=65+random(s)*220;
      for(var j=0;j<9+level*2;j++)bullet(s,cx,cy,(left?0:Math.PI)+(j-(8+level*2)/2)*.15,speed,'#bba2ff');
    }else{
      var gap=45+random(s)*270;
      s.warnings.push({kind:'rain',gap:gap,at:s.t+.85,speed:speed+22});
    }
    if(level>=2&&k%5===0){var side=k%2?'left':'right';s.warnings.push({kind:'cross',side:side,gap:110+random(s)*270,at:s.t+1.1,speed:speed});}
    s.next=s.t+Math.max(.57,1.35-level*.15);
  }
  function distanceSegment(px,py,ax,ay,bx,by){var dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy,t=l?clamp(((px-ax)*dx+(py-ay)*dy)/l,0,1):0;return Math.hypot(px-ax-t*dx,py-ay-t*dy);}
  function step(s,input){
    if(s.dead||s.clear)return;
    var ox=s.x,oy=s.y,dx=0,dy=0;
    if(input.target){dx=input.target.x-s.x;dy=input.target.y-s.y;}else{dx=(input.right?1:0)-(input.left?1:0);dy=(input.down?1:0)-(input.up?1:0);}
    var len=Math.hypot(dx,dy),travel=(input.focus?115:245)*STEP;
    if(len){var scale=input.target?Math.min(1,travel/len):travel/len;s.x=clamp(s.x+dx*scale,10,W-10);s.y=clamp(s.y+dy*scale,10,H-10);}
    s.tick++;s.t=s.tick*STEP;
    if(s.t>=LIMIT){s.t=LIMIT;s.clear=true;return;}
    if(s.t>=1.6&&s.t>=s.next)spawn(s);
    s.warnings=s.warnings.filter(function(w){if(s.t<w.at)return true;
      if(w.kind==='rain'){for(var x=9;x<W;x+=19)if(Math.abs(x-w.gap)>39)bullet(s,x,-9,Math.PI/2,w.speed,'#69e6e2');}
      else{for(var y=12;y<H;y+=23)if(Math.abs(y-w.gap)>46)bullet(s,w.side==='left'?-9:W+9,y,w.side==='left'?0:Math.PI,w.speed,'#ffd38a');}return false;});
    s.bullets=s.bullets.filter(function(b){
      var bx=b.x,by=b.y;b.x+=b.vx*STEP;b.y+=b.vy*STEP;
      // Relative swept collision also catches a fast player crossing a bullet.
      var dist=distanceSegment(0,0,bx-ox,by-oy,b.x-s.x,b.y-s.y);
      if(dist<3+b.r){s.dead=true;}
      if(!b.near&&dist<17&&dist>=3+b.r){b.near=true;s.near++;s.flash=s.t;}
      return b.x>-35&&b.x<W+35&&b.y>-35&&b.y<H+35;
    });
    if(s.tick%4===0){s.trail.unshift({x:s.x,y:s.y});if(s.trail.length>12)s.trail.pop();}
  }
  function runs(d,date,who){return (((d.dodge||{})[date]||{})[who]||[]).filter(function(r){return r.version===VERSION;});}
  function reserve(d,date,who,id){
    if(['me','you'].indexOf(who)<0||runs(d,date,who).length>=3)return false;
    if(!d.dodge)d.dodge={};if(!d.dodge[date])d.dodge[date]={me:[],you:[]};
    if(!d.dodge[date][who])d.dodge[date][who]=[];
    if(d.dodge[date][who].some(function(r){return r.id===id;}))return false;
    d.dodge[date][who].push({id:id,version:VERSION,seconds:0,near:0,status:'started'});return true;
  }
  function finish(d,date,who,id,seconds,near,reason){
    var r=runs(d,date,who).find(function(v){return v.id===id;});
    if(!r||r.status!=='started'||!Number.isFinite(seconds)||seconds<0||seconds>LIMIT)return false;
    r.seconds=Math.floor(seconds*100)/100;r.near=Math.max(0,Math.floor(near)||0);r.status='finished';r.reason=reason;r.endedAt=new Date().toISOString();return true;
  }
  function best(list){return list.reduce(function(v,r){return Math.max(v,r.seconds||0);},0);}
  function number(v){return v.toFixed(2);}
  function draw(ctx,s,clock,mode){
    ctx.fillStyle='#090e20';ctx.fillRect(0,0,W,H);
    var bg=ctx.createRadialGradient(W/2,H*.35,10,W/2,H*.4,340);bg.addColorStop(0,'#202746');bg.addColorStop(1,'#090e20');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    ctx.lineWidth=.5;ctx.strokeStyle='#7584bd14';
    for(var x=0;x<=W;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(var y=(clock*9)%30;y<H;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    for(var i=0;i<40;i++){var sx=(i*137.3)%W,sy=(i*79.7+clock*(3+i%4))%H;ctx.globalAlpha=.2+(i%4)*.12;ctx.fillStyle='#cbd9ff';ctx.fillRect(sx,sy,1,1);}ctx.globalAlpha=1;
    s.warnings.forEach(function(w){var alpha=.25+.2*Math.sin(clock*18);ctx.strokeStyle='rgba(105,230,226,'+alpha+')';ctx.fillStyle='#69e6e214';ctx.setLineDash([5,5]);
      if(w.kind==='rain'){ctx.fillRect(w.gap-38,0,76,H);ctx.strokeRect(w.gap-38,0,76,H);ctx.fillStyle='#69e6e2';ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillText('SAFE GAP',w.gap,22);}
      else{ctx.fillRect(0,w.gap-45,W,90);ctx.strokeRect(0,w.gap-45,W,90);}ctx.setLineDash([]);
    });
    s.trail.forEach(function(p,i){ctx.globalAlpha=(1-i/12)*.24;ctx.fillStyle='#75eeeb';ctx.beginPath();ctx.arc(p.x,p.y,7*(1-i/14),0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
    s.bullets.forEach(function(b){ctx.strokeStyle=b.color;ctx.globalAlpha=.25;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.x-b.vx*.055,b.y-b.vy*.055);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle=b.color;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffffffbb';ctx.beginPath();ctx.arc(b.x-.7,b.y-.7,1.1,0,Math.PI*2);ctx.fill();});
    var px=s.x,py=s.y;
    if(s.flash&&s.t-s.flash<.35){var pulse=(s.t-s.flash)/.35;ctx.globalAlpha=(1-pulse)*.7;ctx.strokeStyle='#bafff0';ctx.lineWidth=1;ctx.beginPath();ctx.arc(px,py,16+pulse*16,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
    if(mode==='playing'&&s.t>18&&s.t%18<1.8){ctx.textAlign='center';ctx.font='800 12px sans-serif';ctx.fillStyle='#d1c0ff';ctx.fillText('SECTOR '+(s.phase+1)+' / '+PHASES[s.phase],W/2,45);}
    ctx.shadowColor='#7ef9f0';ctx.shadowBlur=16;ctx.fillStyle='#82fff0';ctx.beginPath();ctx.moveTo(px,py-10);ctx.lineTo(px+8,py+7);ctx.lineTo(px,py+3);ctx.lineTo(px-8,py+7);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
    ctx.strokeStyle='#82fff055';ctx.beginPath();ctx.arc(px,py,16,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(px,py,3,0,Math.PI*2);ctx.fill();
    if(s.dead){var age=clamp(clock-s.t,0,1);ctx.strokeStyle='#ff8aa6';ctx.lineWidth=2;ctx.globalAlpha=1-age;ctx.beginPath();ctx.arc(px,py,12+age*65,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
    if(mode==='countdown'){ctx.fillStyle='#090e2077';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='800 68px sans-serif';ctx.fillText(String(Math.max(1,Math.ceil(3-clock))),W/2,H/2);ctx.font='12px sans-serif';ctx.fillStyle='#83ece5';ctx.fillText('FIND YOUR FLOW',W/2,H/2+32);}
    ctx.strokeStyle='#a7c4ff33';ctx.lineWidth=1;ctx.strokeRect(.5,.5,W-1,H-1);
  }
  function DodgePage(props){
    var canvas=React.useRef(null),engine=React.useRef(null),input=React.useRef({}),live=React.useRef(props),run=React.useRef(null),modeRef=React.useRef('idle');live.current=props;
    var ms=React.useState('idle'),mode=ms[0],setMode=ms[1],hs=React.useState({seconds:0,near:0,phase:0}),hud=hs[0],setHud=hs[1],rs=React.useState(null),result=rs[0],setResult=rs[1];
    var ds=React.useState(day()),date=ds[0],setDate=ds[1],ss=React.useState(false),sound=ss[0],setSound=ss[1],audio=React.useRef(null),soundRef=React.useRef(false),endRef=React.useRef(null);
    soundRef.current=sound;
    function change(value){modeRef.current=value;setMode(value);}
    function tone(f,length){if(!soundRef.current)return;try{var Audio=window.AudioContext||window.webkitAudioContext;if(!audio.current&&Audio)audio.current=new Audio();var ac=audio.current;if(!ac)return;ac.resume();var osc=ac.createOscillator(),gain=ac.createGain();osc.type='sine';osc.frequency.setValueAtTime(f,ac.currentTime);osc.frequency.exponentialRampToValueAtTime(f*.5,ac.currentTime+length);gain.gain.setValueAtTime(.045,ac.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ac.currentTime+length);osc.connect(gain);gain.connect(ac.destination);osc.start();osc.stop(ac.currentTime+length);}catch(e){/* Audio is optional. */}}
    function end(reason){
      if(!run.current)return;
      var active=run.current,s=engine.current;run.current=null;
      var seconds=s?Math.floor(s.t*100)/100:0,near=s?s.near:0;
      setHud({seconds:seconds,near:near,phase:s?s.phase:0});
      if(active.official)(live.current.updateGame||live.current.update)(function(d){finish(d,active.date,active.who,active.id,seconds,near,reason);});
      setResult({seconds:seconds,near:near,official:active.official,reason:reason});change('result');tone(reason==='clear'?660:180,.35);
    }
    endRef.current=end;
    function start(official){
      if(run.current)return;
      var p=live.current,today=day();setDate(today);
      if(official&&(p.gameSaving||runs(p.data,today,p.member).length>=3))return;
      var id=Date.now().toString(36)+Math.random().toString(36).slice(2);
      if(official)(p.updateGame||p.update)(function(d){reserve(d,today,p.member,id);});
      // Reserve is persisted before play; abandoned/reloaded attempts remain used.
      run.current={id:id,date:today,who:p.member,official:official};
      engine.current=create(hash('futari-dodge-v'+VERSION+'-'+today));input.current={};touch.current=null;setHud({seconds:0,near:0,phase:0});setResult(null);change('countdown');tone(520,.1);
    }
    React.useEffect(function(){
      // A crash or reload consumes the reserved attempt instead of offering a retry.
      var p=live.current,abandoned=runs(p.data,day(),p.member).filter(function(r){return r.status==='started';});
      if(abandoned.length)(p.updateGame||p.update)(function(d){abandoned.forEach(function(r){finish(d,day(),p.member,r.id,0,0,'away');});});
      var el=canvas.current;if(!el)return;var ctx=el.getContext('2d');if(!ctx)return;
      var dpr=Math.min(window.devicePixelRatio||1,2);el.width=W*dpr;el.height=H*dpr;ctx.scale(dpr,dpr);
      if(!engine.current)engine.current=create(hash('futari-idle'));
      var frame,last=null,acc=0,countdown=0,was='idle',hudAt=0,visual=0;
      function loop(time){
        var state=modeRef.current,dt=last===null?0:Math.min((time-last)/1000,.1);last=time;
        if(state!==was){if(state==='countdown'){countdown=0;visual=0;}if(state==='result')visual=0;acc=0;was=state;}
        if(state==='countdown'){countdown+=dt;if(countdown>=3){modeRef.current='playing';setMode('playing');last=time;acc=0;tone(800,.12);}}
        else if(state==='playing'){
          acc+=dt;while(acc>=STEP){step(engine.current,input.current);acc-=STEP;if(engine.current.dead||engine.current.clear){endRef.current(engine.current.clear?'clear':'hit');break;}}
          if(time-hudAt>80){var s=engine.current;setHud({seconds:s.t,near:s.near,phase:s.phase});hudAt=time;}
        }
        if(state!=='paused')visual+=dt;
        draw(ctx,engine.current,state==='countdown'?countdown:state==='idle'?visual:engine.current.t+(state==='result'?visual:0),state);
        frame=window.requestAnimationFrame(loop);
      }
      frame=window.requestAnimationFrame(loop);
      function visibility(){if(!document.hidden&&!run.current)setDate(day());if(document.hidden){input.current={};if(run.current){if(run.current.official)endRef.current('away');else if(modeRef.current==='playing'||modeRef.current==='countdown'){modeRef.current='paused';setMode('paused');}}}}
      function key(e){var map={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',Shift:'focus'};if(map[e.key]&&(modeRef.current==='playing'||modeRef.current==='countdown')){e.preventDefault();input.current[map[e.key]]=e.type==='keydown';input.current.target=null;}}
      function blur(){input.current={};if(run.current){if(run.current.official)endRef.current('away');else if(modeRef.current==='playing'||modeRef.current==='countdown'){modeRef.current='paused';setMode('paused');}}}
      document.addEventListener('visibilitychange',visibility);window.addEventListener('keydown',key);window.addEventListener('keyup',key);window.addEventListener('blur',blur);
      return function(){window.cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('keydown',key);window.removeEventListener('keyup',key);window.removeEventListener('blur',blur);
        if(run.current){var active=run.current;run.current=null;if(active.official){var s=engine.current;(live.current.updateGame||live.current.update)(function(d){finish(d,active.date,active.who,active.id,s.t,s.near,'away');});}}
        if(audio.current)audio.current.close();
      };
    },[]);
    var touch=React.useRef(null);
    function down(e){if(modeRef.current!=='playing'&&modeRef.current!=='countdown'||touch.current)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);var rect=e.currentTarget.getBoundingClientRect();touch.current={id:e.pointerId,x:e.clientX,y:e.clientY,px:engine.current.x,py:engine.current.y,sx:W/rect.width,sy:H/rect.height};input.current.target={x:engine.current.x,y:engine.current.y};}
    function move(e){var t=touch.current;if(!t||t.id!==e.pointerId)return;e.preventDefault();input.current.target={x:clamp(t.px+(e.clientX-t.x)*t.sx,10,W-10),y:clamp(t.py+(e.clientY-t.y)*t.sy,10,H-10)};}
    function up(e){if(touch.current&&touch.current.id===e.pointerId){touch.current=null;input.current.target=null;}}
    var mine=runs(props.data,date,props.member),other=props.member==='me'?'you':'me',theirs=runs(props.data,date,other),myBest=best(mine),theirBest=best(theirs),done=mine.length===3&&theirs.length===3&&mine.concat(theirs).every(function(r){return r.status==='finished';});
    var history=Object.keys(props.data.dodge||{}).filter(function(d){return runs(props.data,d,'me').length||runs(props.data,d,'you').length;}).sort().reverse();
    function personal(who){return history.reduce(function(v,d){return Math.max(v,best(runs(props.data,d,who)));},0);}
    var active=mode==='playing'||mode==='countdown'||mode==='paused';
    return h('div',{className:'dodge-game'},
      h('header',{className:'dodge-heading'},h('div',null,h('span',{className:'dodge-kicker'},'FUTARI ARCADE / 01'),h('h2',null,'NEON DRIFT'),h('p',null,'총알 사이, 둘만의 승부.')),h('button',{className:'dodge-icon-button','aria-label':sound?'효과음 끄기':'효과음 켜기','aria-pressed':sound,onClick:function(){setSound(!sound);}},sound?'♪ ON':'♪ OFF')),
      h('div',{className:'dodge-hud'},h('div',null,h('small',null,'SURVIVAL'),h('strong',null,number(hud.seconds),h('span',null,' s'))),h('div',null,h('small',null,'CLOSE CALL'),h('strong',null,String(hud.near))),h('div',{className:'dodge-stage'},h('small',null,'SECTOR '+(hud.phase+1)),h('span',null,PHASES[hud.phase]))),
      h('div',{className:'dodge-surface'},h('canvas',{ref:canvas,className:'dodge-canvas',tabIndex:0,'aria-label':'총알 피하기 게임판. 드래그 또는 방향키로 이동, Shift로 정밀 이동.',onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerCancel:up,onLostPointerCapture:up}),
        mode==='idle'?h('div',{className:'dodge-overlay'},h('span',{className:'dodge-orbit'},'✦'),h('span',{className:'dodge-kicker'},'ONE HIT. ONE MORE TRY.'),h('h3',null,'얼마나 버틸 수 있어요?'),h('p',null,'빛나는 중심점만 지켜주세요.',h('br'),'90초 생존에 도전하세요.'),h('button',{className:'dodge-primary',onClick:function(){start(false);}},'연습 시작'),h('small',null,'화면 어디서든 드래그 · PC는 방향키 / WASD')):null,
        mode==='paused'?h('div',{className:'dodge-overlay'},h('h3',null,'잠깐 숨 고르기'),h('p',null,'준비되면 계속해요.'),h('button',{className:'dodge-primary',onClick:function(){input.current={};change('playing');}},'계속하기')):null,
        mode==='result'&&result?h('div',{className:'dodge-overlay dodge-result'},h('span',{className:'dodge-kicker'},result.official?'DAILY CHALLENGE':'PRACTICE RUN'),h('h3',null,result.reason==='clear'?'완벽한 생존!':result.reason==='away'?'도전을 마쳤어요':'아슬아슬했어요!'),h('div',{className:'dodge-score'},number(result.seconds),h('small',null,'SECONDS')),h('p',null,'근접 회피 '+result.near+'회 · '+(result.official?'오늘의 기록에 반영돼요':'연습 기록은 승부에 포함되지 않아요')),h('button',{className:'dodge-primary',onClick:function(){start(false);}},'한 번 더 연습'),h('button',{className:'dodge-secondary',onClick:function(){change('idle');}},'대결 기록 보기')):null),
      h('div',{className:'dodge-control-strip'},h('span',null,'✧ 흰 중심점이 피격 판정'),active?h('button',{className:'dodge-icon-button',onClick:function(){input.current={};if(run.current&&run.current.official)end('quit');else if(mode==='paused')change('playing');else change('paused');}},run.current&&run.current.official?'도전 종료':mode==='paused'?'계속하기':'일시정지'):h('span',null,'매일 새로운 패턴')),
      h('section',{className:'dodge-challenge'},h('div',{className:'dodge-section-title'},h('div',null,h('span',{className:'dodge-kicker'},date+' · SAME PATTERN'),h('h3',null,'오늘의 커피 대결 ☕')),h('span',{className:'dodge-ticket'},'각자 3번')),
        h('p',{className:'dodge-description'},'같은 날에는 같은 순서로 탄막이 등장해요. 각자 3번 중 최고 생존 시간으로 승부해요.'),
        h('div',{className:'dodge-leaderboard'},[props.member,other].map(function(who){var list=runs(props.data,date,who);return h('div',{key:who,className:'dodge-player'+(who===props.member?' mine':'')},h('span',null,props.data.settings[who],who===props.member?h('small',null,' 나'):null),h('strong',null,list.length?number(best(list))+'s':'—'),h('div',{className:'dodge-attempts'},[0,1,2].map(function(i){var r=list[i];return h('span',{key:i,className:r?'used':'',title:r&&r.status==='started'?'중단된 도전도 횟수에 포함돼요':undefined},r?r.status==='started'?'사용됨':number(r.seconds):'대기');})));})),
        h('p',{className:'dodge-verdict','aria-live':'polite'},done?(myBest===theirBest?'무승부! 다음 대결에서 만나요.':props.data.settings[myBest>theirBest?props.member:other]+' 승리! 커피 한 잔 예약 ☕'):mine.length&&theirs.length?(myBest===theirBest?'현재 동점이에요.':props.data.settings[myBest>theirBest?props.member:other]+'님이 앞서고 있어요.'):'각자 편할 때 도전하고 기록을 남겨주세요.'),
        h('button',{className:'dodge-primary',disabled:active||props.gameSaving||mine.length>=3,onClick:function(){start(true);}},mine.length>=3?'오늘의 도전 완료':props.gameSaving?'기록 저장 중…':'실전 도전 · '+(3-mine.length)+'회 남음'),
        h('small',{className:'dodge-note'},'실전은 시작하면 1회 사용해요. 화면을 떠나면 현재 기록으로 종료돼요. 연습은 횟수 제한이 없어요.')),
      history.length?h('details',{className:'dodge-archive'},h('summary',null,'우리의 기록실'),h('div',{className:'dodge-personal'},[props.member,other].map(function(who){return h('div',{key:who},h('small',null,props.data.settings[who]+' · 최고 기록'),h('strong',null,number(personal(who))+'s'));})),history.slice(0,7).map(function(d){return h('div',{key:d,className:'dodge-archive-row'},h('span',null,d),h('strong',null,runs(props.data,d,props.member).length?number(best(runs(props.data,d,props.member)))+'s':'—'),h('strong',null,runs(props.data,d,other).length?number(best(runs(props.data,d,other)))+'s':'—'));})):null,
      h('details',{className:'dodge-help'},h('summary',null,'조작과 승부 규칙'),h('p',null,'캐릭터를 직접 가리지 않도록 화면 아무 곳에서 드래그하세요. PC는 방향키 또는 WASD, Shift는 느린 정밀 이동입니다. 흰 중심점에 총알이 닿으면 끝나요. 청록색 통로는 다음 탄막의 빈틈을 알려줘요. 18초마다 난도가 올라가고 90초를 버티면 완주합니다. 근접 회피는 연출용 기록이며 승부는 생존 시간만 비교해요.')));
  }
  window.FutariDodge={DodgePage:DodgePage,create:create,step:step,hash:hash,draw:draw,reserve:reserve,finish:finish,runs:runs,best:best,day:day,STEP:STEP,LIMIT:LIMIT};
})();
