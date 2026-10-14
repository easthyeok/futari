/* Persistent shared village. All purchases check the current room balance. */
(function(){
  'use strict';
  var React=window.React,h=React.createElement;
  var BUILDINGS=[
    {id:'garden',name:'작은 텃밭',icon:'🌱',cost:12,description:'씨앗을 심고 수확해요'},
    {id:'flowers',name:'꽃밭',icon:'🌷',cost:18,description:'마을에 봄빛을 더해요'},
    {id:'picnic',name:'피크닉 자리',icon:'🧺',cost:24,description:'둘이 쉬어가는 자리'},
    {id:'orchard',name:'사과나무',icon:'🌳',cost:32,description:'나무 그늘 아래 쉼터'},
    {id:'pond',name:'작은 연못',icon:'🦆',cost:45,description:'오리가 놀러 왔어요'},
    {id:'workshop',name:'작업실',icon:'🪵',cost:60,description:'우리만의 작은 공방'},
    {id:'greenhouse',name:'온실',icon:'🌿',cost:90,description:'작물이 두 배 빨리 자라요'}
  ];
  var CROPS=[{id:'radish',name:'래디시',icon:'🥬',cost:2,reward:5,seconds:60},{id:'carrot',name:'당근',icon:'🥕',cost:4,reward:9,seconds:180},{id:'berry',name:'딸기',icon:'🍓',cost:6,reward:14,seconds:360},{id:'tomato',name:'토마토',icon:'🍅',cost:5,reward:11,seconds:300},{id:'sunflower',name:'해바라기',icon:'🌻',cost:5,reward:10,seconds:300}];
  var LEVELS=[{name:'작은 오두막',plots:4,cost:0,hearts:0},{name:'포근한 농가',plots:8,cost:36,hearts:10},{name:'둘만의 전원주택',plots:12,cost:84,hearts:25},{name:'꿈꾸던 우리 집',plots:16,cost:160,hearts:50}];
  function farm(d){return d.farm||{level:0,buildings:{},crops:{},seedSpent:0,harvestCoins:0,harvests:0};}
  function ensure(d){if(!d.farm)d.farm={level:0,buildings:{},crops:{},seedSpent:0,harvestCoins:0,harvests:0};return d.farm;}
  function level(d){return Math.max(0,Math.min(3,Math.floor(Number(farm(d).level)||0)));}
  function income(d){return farm(d).harvestCoins||0;}
  function spent(d){var f=farm(d),sum=f.seedSpent||0;for(var i=1;i<=level(d);i++)sum+=LEVELS[i].cost;Object.keys(f.buildings||{}).forEach(function(key){var b=BUILDINGS.find(function(b){return b.id===f.buildings[key];});if(b)sum+=b.cost;});return sum;}
  function slotValid(d,slot){return Number.isInteger(slot)&&slot>=0&&slot<LEVELS[level(d)].plots;}
  function build(d,slot,id){var b=BUILDINGS.find(function(b){return b.id===id;}),f=farm(d);if(!b||!slotValid(d,slot)||(f.buildings||{})[slot]||window.FutariHome.balance(d)<b.cost)return false;ensure(d).buildings[slot]=id;return true;}
  function upgrade(d){var next=LEVELS[level(d)+1];if(!next||window.FutariHome.balance(d)<next.cost||window.FutariHome.growth(d)<next.hearts)return false;ensure(d).level++;return true;}
  function plant(d,slot,id,now){var f=farm(d),c=CROPS.find(function(c){return c.id===id;}),b=(f.buildings||{})[slot];if(!slotValid(d,slot)||!c||!Number.isFinite(now)||(b!=='garden'&&b!=='greenhouse')||(f.crops||{})[slot]||window.FutariHome.balance(d)<c.cost)return false;
    f=ensure(d);f.seedSpent+=c.cost;f.crops[slot]={id:id,plantedAt:now,readyAt:now+c.seconds*1000/(b==='greenhouse'?2:1),watered:{}};return true;}
  function water(d,slot,who,now){var f=farm(d),c=(f.crops||{})[slot];if(!c||!Number.isFinite(now)||['me','you'].indexOf(who)<0||now>=c.readyAt||(c.watered||{})[who])return false;if(!c.watered)c.watered={};c.watered[who]=true;c.readyAt=Math.max(now,c.readyAt-15000);return true;}
  function harvest(d,slot,now){var f=farm(d),crop=(f.crops||{})[slot],c=crop&&CROPS.find(function(c){return c.id===crop.id;});if(!c||!Number.isFinite(now)||now<crop.readyAt)return false;f.harvestCoins=(f.harvestCoins||0)+c.reward+(crop.watered&&crop.watered.me&&crop.watered.you?1:0);f.harvests=(f.harvests||0)+1;if(!d.collection)d.collection={};if(!d.collection.crops)d.collection.crops={};d.collection.crops[c.id]=(d.collection.crops[c.id]||0)+1;if(c.id==='sunflower'&&d.collection.crops[c.id]>=3&&d.house&&d.house.owned.indexOf('sunflower-bouquet')<0)d.house.owned.push('sunflower-bouquet');if(!d.collection.teamHarvests)d.collection.teamHarvests=0;if(crop.watered&&crop.watered.me&&crop.watered.you)d.collection.teamHarvests++;delete f.crops[slot];return true;}
  function move(d,from,to){var f=farm(d);if(!slotValid(d,from)||!slotValid(d,to)||from===to||!(f.buildings||{})[from])return false;var b=f.buildings[to],c=f.crops[to];f.buildings[to]=f.buildings[from];if(b)f.buildings[from]=b;else delete f.buildings[from];if(f.crops[from])f.crops[to]=f.crops[from];else delete f.crops[to];if(c)f.crops[from]=c;else delete f.crops[from];return true;}
  function Cottage(props){var n=props.level;
    return h('svg',{viewBox:'0 0 260 180',className:'farm-cottage','aria-hidden':true},
      h('ellipse',{cx:130,cy:160,rx:110,ry:15,fill:'#41764e22'}),
      n>=1?h('g',null,h('path',{d:'M 28 104 L 71 72 L 111 104 V 153 H 28 Z',fill:'#f8ecd2'}),h('path',{d:'M 21 106 L 71 68 L 116 104',stroke:'#b97158',strokeWidth:12,fill:'none',strokeLinejoin:'round'}),h('rect',{x:42,y:112,width:27,height:25,rx:3,fill:'#99c9c0',stroke:'#fff7e7',strokeWidth:5})):null,
      n>=2?h('g',null,h('rect',{x:192,y:105,width:46,height:48,rx:3,fill:'#e7d4b2'}),h('path',{d:'M 185 108 L 213 83 L 244 108 Z',fill:'#aa6552'}),h('rect',{x:207,y:117,width:17,height:22,rx:2,fill:'#a5cfbf'})):null,
      h('rect',{x:86,y:n>=3?47:74,width:116,height:n>=3?107:80,rx:4,fill:'#fff4d8'}),
      h('rect',{x:178,y:n>=3?18:38,width:14,height:38,rx:2,fill:'#cf9376'}),
      h('path',{d:n>=3?'M 73 54 L 144 3 L 215 54 Z':'M 73 81 L 144 30 L 215 81 Z',fill:n>=3?'#7c9f9d':'#be8066',stroke:'#fff1d4',strokeWidth:3,strokeLinejoin:'round'}),
      n>=3?h('g',null,h('rect',{x:107,y:62,width:24,height:24,rx:3,fill:'#9bc9c4',stroke:'#fff',strokeWidth:4}),h('rect',{x:159,y:62,width:24,height:24,rx:3,fill:'#9bc9c4',stroke:'#fff',strokeWidth:4})):null,
      h('rect',{x:102,y:94,width:27,height:27,rx:4,fill:'#a5d2cb',stroke:'#fff',strokeWidth:5}),h('path',{d:'M 115 94 V 121 M 102 107 H 129',stroke:'#fff',strokeWidth:3}),
      h('rect',{x:150,y:109,width:28,height:45,rx:14,fill:'#bb8c64'}),h('circle',{cx:171,cy:134,r:2,fill:'#ffedb2'}),
      h('path',{d:'M 144 157 H 186 L 196 166 H 136 Z',fill:'#d8bb95'}),
      h('rect',{x:94,y:127,width:44,height:10,rx:2,fill:'#bd8762'}),h('circle',{cx:102,cy:125,r:5,fill:'#edb0a5'}),h('circle',{cx:116,cy:125,r:5,fill:'#eac878'}),h('circle',{cx:130,cy:125,r:5,fill:'#edb0a5'}));
  }
  function FarmPage(props){
    var animalState=React.useState(null),animal=animalState[0],setAnimal=animalState[1];
    var d=props.data,f=farm(d),lv=level(d),next=LEVELS[lv+1],home=window.FutariHome;
    var vs=React.useState('village'),view=vs[0],setView=vs[1],bs=React.useState('garden'),selected=bs[0],setSelected=bs[1],ps=React.useState(null),plot=ps[0],setPlot=ps[1],ns=React.useState(''),notice=ns[0],setNotice=ns[1],ts=React.useState(Date.now()),now=ts[0],setNow=ts[1],moving=React.useState(null),from=moving[0],setFrom=moving[1];
    React.useEffect(function(){if(props.target!==null&&props.target!==undefined&&String(Number(props.target))===String(props.target)&&slotValid(d,Number(props.target)))setPlot(Number(props.target));},[props.target]);
    React.useEffect(function(){var t;function check(){clearInterval(t);if(document.visibilityState!=='hidden'&&view==='village'){setNow(Date.now());t=setInterval(function(){setNow(Date.now());},1000);}}check();document.addEventListener('visibilitychange',check);return function(){clearInterval(t);document.removeEventListener('visibilitychange',check);};},[view]);
    function action(fn,message){props.update(function(data){fn(data);});setNotice(message);setNow(Date.now());}
    var b=BUILDINGS.find(function(b){return b.id===selected;}),building=plot!==null&&BUILDINGS.find(function(b){return b.id===(f.buildings||{})[plot];}),crop=plot!==null&&(f.crops||{})[plot],seed=crop&&CROPS.find(function(c){return c.id===crop.id;}),ready=crop&&now>=crop.readyAt,harvestReward=seed?seed.reward+(crop.watered&&crop.watered.me&&crop.watered.you?1:0):0;
    function choosePlot(i){if(from!==null){if(i===from){setFrom(null);return;}action(function(d){move(d,from,i);},'자리를 옮겼어요.');setFrom(null);setPlot(i);}else setPlot(i);}
    return h('div',{className:'farm-page'},
      h('header',{className:'farm-heading'},h('div',null,h('p',{className:'eyebrow'},'FUTARI · LITTLE COUNTRYSIDE'),h('h1',{className:'title-xl'},'우리의 작은 마을'),h('p',{className:'muted'},d.settings.me+'와 '+d.settings.you+', 오늘도 조금씩 자라요.')),h('strong',{className:'coin-badge','aria-label':'사용 가능한 마음 코인'},'💛 '+home.balance(d))),
      h('div',{className:'farm-view-tabs'},[['village','🌿 우리 마을'],['interior','🛋 집 안 꾸미기']].map(function(v){return h('button',{key:v[0],'aria-pressed':view===v[0],onClick:function(){setView(v[0]);}},v[1]);})),
      window.FutariContent?h(window.FutariContent.Missions,props):null,
      view==='interior'?h(home.Interior,props):h('div',null,
        h('section',{'aria-label':'함께 키우는 농장'},h(window.FutariVillage.Village,{farm:f,selected:plot,onPlot:choosePlot,onHouse:function(){setView('interior');},onAnimal:setAnimal})),
        h('div',{className:'farm-status'},h('span',null,'🏡 '+(lv+1)+'단계 · '+LEVELS[lv].plots+'칸'),h('span',null,'🧺 수확 '+(f.harvests||0)+'회')),
        h('p',{className:'farm-notice',role:'status'},notice||(from!==null?'옮길 자리를 골라주세요. 건물이 있으면 서로 자리를 바꿔요.':'땅을 누르면 건물을 짓거나 작물을 돌볼 수 있어요.')),
        plot!==null?h('section',{className:'card farm-inspector'},h('div',{className:'shop-heading'},h('h2',{className:'title-lg'},(plot+1)+'번 자리 · '+(building?building.name:'무엇을 지을까요?')),h('button',{className:'btn ghost sm','aria-label':'자리 선택 닫기',onClick:function(){setPlot(null);setFrom(null);}},'닫기')),
          building?h('div',null,h('p',{className:'muted'},building.description),
            building.id==='garden'||building.id==='greenhouse'?h('div',null,crop?h('div',{className:'crop-care'},h('strong',null,seed.icon+' '+seed.name),h('p',{'aria-live':'polite'},ready?'잘 자랐어요! 수확할 시간이에요.':['씨앗','새싹','성장 중','수확 가능'][window.FutariVillage.stage(crop,now)]+' · '+Math.max(0,Math.ceil((crop.readyAt-now)/1000))+'초 뒤 수확할 수 있어요'),h('progress',{max:1,value:Math.min(1,(now-crop.plantedAt)/Math.max(1,crop.readyAt-crop.plantedAt)),'aria-label':'작물 성장'}),h('button',{className:'btn block',disabled:!ready&&(crop.watered||{})[props.member],onClick:function(){var at=Date.now();action(function(d){if(at>=crop.readyAt)harvest(d,plot,at);else water(d,plot,props.member,at);},ready?'수확했어요! 💛 '+harvestReward+' 코인':'물을 줬어요. 15초 더 빨리 자라요.');}},ready?'수확하기 · 💛 '+harvestReward:(crop.watered||{})[props.member]?'물을 줬어요 ✓':'물 주기 · 15초 단축')):h('div',{className:'seed-list'},CROPS.map(function(c){return h('button',{key:c.id,className:'seed-card',disabled:home.balance(d)<c.cost,onClick:function(){action(function(d){plant(d,plot,c.id,Date.now());},c.name+' 씨앗을 심었어요.');}},h('span',null,c.icon),h('strong',null,c.name),h('small',null,'씨앗 💛 '+c.cost+' → 수확 '+c.reward),h('small',null,Math.ceil(c.seconds/(building.id==='greenhouse'?2:1))+'초'));}))):null,
            h('button',{className:'btn ghost block',style:{marginTop:12},onClick:function(){setFrom(plot);setNotice('옮길 자리를 골라주세요. 건물이 있으면 서로 자리를 바꿔요.');}},from===plot?'옮길 자리를 골라주세요':'다른 자리로 옮기기')):
          h('div',null,h('div',{className:'building-list'},BUILDINGS.map(function(item){return h('button',{key:item.id,className:'building-option'+(selected===item.id?' on':''),'aria-pressed':selected===item.id,onClick:function(){setSelected(item.id);}},h('span',null,item.icon),h('strong',null,item.name),h('small',null,'💛 '+item.cost));})),h('p',{className:'muted'},b.description),h('button',{className:'btn block',disabled:home.balance(d)<b.cost,onClick:function(){action(function(d){build(d,plot,selected);},b.name+'을 지었어요!');}},home.balance(d)<b.cost?'💛 '+(b.cost-home.balance(d))+' 코인 더 모으기':b.name+' 짓기 · 💛 '+b.cost))):null,
        h('section',{className:'card farm-upgrade'},h('span',{className:'eyebrow'},'GROW TOGETHER'),h('h2',{className:'title-lg'},next?'집을 키우면, 마을도 넓어져요':'우리가 키운 멋진 마을'),h('p',{className:'muted'},next?LEVELS[lv].name+' → '+next.name+' · 땅 '+LEVELS[lv].plots+'칸 → '+next.plots+'칸':'16칸의 마을을 마음껏 꾸며보세요. 집 안 가구도 바꿀 수 있어요.'),next?h('div',null,h('div',{className:'upgrade-requirements'},h('span',null,'💛 '+home.balance(d)+' / '+next.cost+' 코인'),h('span',null,'🫶 '+home.growth(d)+' / '+next.hearts+' 마음')),h('button',{className:'btn block',disabled:home.balance(d)<next.cost||home.growth(d)<next.hearts,onClick:function(){action(function(d){if(level(d)===lv)upgrade(d);},'집이 커졌어요! 새로운 땅도 열렸어요.');}},'집 확장하기')):null),
        h(window.FutariVillage.Animals,Object.assign({},props,{selected:animal})),
        h('section',{className:'farm-tip'},h('strong',null,'💌 오늘의 마음이 마을을 키워요'),h('p',null,'두 번째 탭 ‘오늘 우리’에서 기분과 취향을 나누고 코인을 모아보세요. 작물은 접속하지 않아도 자라고, 기다려도 시들지 않아요.'))));
  }
  window.FutariFarm={FarmPage:FarmPage,income:income,spent:spent,build:build,upgrade:upgrade,plant:plant,water:water,harvest:harvest,move:move,level:level,buildings:BUILDINGS,crops:CROPS,levels:LEVELS};
})();
