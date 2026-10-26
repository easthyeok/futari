(function(){
  'use strict';
  var R=window.React,h=R.createElement;
  var DISHES=[
    ['바지락 술찜','시원한 국물과 따뜻한 조개로 차가운 메인에 변화를 줘요.','바지락,해산물,마늘','국물,담백','과메기,회,막걸리,와인',20],
    ['골뱅이소면','새콤한 양념과 소면으로 식감과 맛을 바꿔봐요.','골뱅이,해산물,밀,오이','매콤','과메기,치킨,막걸리,맥주',20],
    ['어묵탕','뜨끈하고 익숙한 국물을 곁들이고 싶을 때 좋아요.','어묵,해산물,밀,무','국물,담백','과메기,회,치킨,소주',15],
    ['계란찜','부드럽고 순한 맛으로 진한 양념 사이를 채워줘요.','계란','담백,가벼운 메뉴','삼겹살,족발,매운 음식,소주',15],
    ['두부김치','따뜻한 두부에 김치를 조금씩 올려 먹는 조합이에요.','두부,콩,김치','매콤','과메기,막걸리,소주',15],
    ['부추전','바삭한 가장자리를 나눠 먹기 좋은 곁들임이에요.','부추,밀','담백','과메기,막걸리',20],
    ['해물파전','파와 해물이 들어간 전을 따뜻하게 나눠 먹어요.','파,밀,오징어,해산물','담백','막걸리,소주',30],
    ['김치전','새콤하고 바삭한 한 입이 당길 때 골라봐요.','김치,밀','매콤','막걸리,맥주',20],
    ['오이무침','아삭하고 새콤한 맛으로 묵직한 메뉴에 변화를 줘요.','오이','매콤,가벼운 메뉴','삼겹살,족발,치킨,막걸리',10],
    ['토마토 샐러드','상큼한 토마토를 가볍게 곁들여봐요.','토마토','담백,가벼운 메뉴','치킨,와인,하이볼',10],
    ['버섯 버터구이','따뜻한 버섯을 작게 나눠 먹기 좋은 메뉴예요.','버섯,우유','담백','삼겹살,와인,하이볼',15],
    ['감자채전','바삭한 감자채를 노릇하게 구워 나눠 먹어요.','감자','담백','막걸리,맥주,하이볼',20],
    ['콩나물국','맑은 국물 한 그릇이 필요한 조합에 곁들여요.','콩나물,콩','국물,담백,가벼운 메뉴','과메기,삼겹살,소주',15],
    ['잔치국수','따뜻한 국수로 한 끼를 마무리하고 싶을 때 좋아요.','밀,멸치,해산물','국물,담백','과메기,족발,막걸리',20],
    ['비빔국수','새콤매콤한 국수로 식사를 곁들이고 싶을 때 골라요.','밀,고추장','매콤','삼겹살,족발,맥주',15],
    ['닭볶음탕','닭과 감자를 한 냄비에 끓여 든든하게 먹어요.','닭고기,감자','매콤,국물','소주,막걸리',45],
    ['돼지고기 김치찌개','밥과 함께 먹을 진한 국물이 당길 때 골라봐요.','돼지고기,김치,두부,콩','매콤,국물','소주',30],
    ['버섯전골','버섯과 채소를 따뜻한 국물로 함께 즐겨요.','버섯,배추','국물,담백','소주,막걸리',30],
    ['제육볶음','매콤한 고기와 밥으로 든든한 식사를 골라봐요.','돼지고기,고추장','매콤','소주,맥주',20],
    ['간장 닭구이','달콤짭짤한 닭구이를 밥이나 음료와 곁들여요.','닭고기,콩,밀','담백','맥주,하이볼',30],
    ['두부 버섯덮밥','두부와 버섯을 밥 위에 올려 간단히 한 끼를 먹어요.','두부,콩,버섯','담백','없음',20],
    ['마늘 새우구이','마늘 향을 낸 새우를 한 입씩 나눠 먹어요.','새우,해산물,마늘','담백','와인,맥주,하이볼',15],
    ['떡볶이','매콤한 떡과 어묵이 당기는 날 골라봐요.','떡,어묵,해산물,밀','매콤','치킨,맥주',20],
    ['치킨','나눠 먹기 편한 메뉴가 당길 때 골라봐요.','닭고기,밀','담백','맥주,하이볼',30]
  ].map(function(v){return {name:v[0],reason:v[1],ingredients:v[2].split(','),tags:v[3].split(','),pairs:v[4].split(','),minutes:v[5]};});
  var DEFAULT={mode:'pair',main:'',drink:'없음',method:'직접 요리',taste:'상관없음',simple:false,exclude:'',note:''};
  function recommend(form,turn){
    var excluded=String(form.exclude||'').split(/[,，\n·]/).map(function(s){return s.trim().toLowerCase();}).filter(Boolean);
    var ranked=DISHES.filter(function(d){return !(form.mode==='pair'&&form.main&&d.name.indexOf(form.main.trim())>=0)&&(!form.simple||form.method==='배달·포장'||d.minutes<=20)&&(form.taste==='상관없음'||d.tags.indexOf(form.taste)>=0)&&!excluded.some(function(x){return [d.name].concat(d.ingredients).join(' ').toLowerCase().indexOf(x)>=0;});}).map(function(d,i){var score=0;d.pairs.forEach(function(p){if(form.main&&form.main.indexOf(p)>=0)score+=5;if(form.drink!=='없음'&&form.drink===p)score+=3;});return {dish:d,score:score,index:i};}).sort(function(a,b){return b.score-a.score||a.index-b.index;});
    var pool=ranked.slice(0,Math.max(6,Math.min(12,ranked.length))),start=pool.length?((turn||0)*3)%pool.length:0;
    return pool.slice(start).concat(pool.slice(0,start)).slice(0,3).map(function(v){return {name:v.dish.name,reason:v.dish.reason,preparation:form.method==='배달·포장'?'배달·포장 후보로 골라봐요. 실제 판매 여부는 가게에서 확인해요.':'직접 요리 · 약 '+v.dish.minutes+'분'};});
  }
  function validResults(value){return Array.isArray(value)&&value.length===3&&value.every(function(v){return v&&['name','reason','preparation'].every(function(k){return typeof v[k]==='string'&&v[k].trim()&&v[k].length<=(k==='name'?80:400);});})&&new Set(value.map(function(v){return v.name.trim();})).size===3;}
  function endpoint(config){if(!config||!config.FOOD_AI_ENABLED||!config.SUPABASE_URL)return '';return config.SUPABASE_URL.replace(/\/$/,'')+'/functions/v1/food-recommend';}
  function Planner(props){
    var fs=R.useState(Object.assign({},DEFAULT)),form=fs[0],setForm=fs[1],rs=R.useState(null),result=rs[0],setResult=rs[1],bs=R.useState(false),busy=bs[0],setBusy=bs[1],es=R.useState(''),error=es[0],setError=es[1];
    var request=R.useRef({id:0,controller:null,alive:true,turn:0,locked:false}),config=window.FUTARI_CONFIG||{},url=endpoint(config);
    R.useEffect(function(){request.current.alive=true;return function(){request.current.alive=false;request.current.id++;if(request.current.controller)request.current.controller.abort();};},[]);
    function cancel(){request.current.id++;request.current.locked=false;if(request.current.controller)request.current.controller.abort();request.current.controller=null;setBusy(false);}
    function field(key,value){cancel();setForm(function(previous){return Object.assign({},previous,{[key]:value});});setResult(null);setError('');request.current.turn=0;}
    function basic(){cancel();setError('');var items=recommend(form,request.current.turn++);setResult({source:'basic',items:items});}
    async function ask(){
      if(request.current.locked||!url)return;request.current.locked=true;var current=++request.current.id,controller=new AbortController();request.current.controller=controller;setBusy(true);setError('');var timer=setTimeout(function(){controller.abort();},25000);
      try{var response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',apikey:config.SUPABASE_KEY},body:JSON.stringify({room:props.room,form:form,avoid:result?result.items.map(function(v){return v.name;}):[]}),signal:controller.signal});
        var data;try{data=await response.json();}catch(e){throw Error('추천을 받지 못했어요. 기본 조합으로 먼저 골라보세요.');}
        if(!response.ok)throw Error(response.status===429?'잠시 쉬었다가 다시 물어봐요. 기본 조합은 계속 볼 수 있어요.':response.status===403?'이 공간의 GPT 추천을 아직 사용할 수 없어요. 기본 조합으로 골라보세요.':response.status===503?'GPT 추천이 아직 준비되지 않았어요. 기본 조합으로 골라보세요.':'GPT 추천을 받지 못했어요. 잠시 후 다시 시도해주세요.');
        if(!validResults(data.items))throw Error('추천 내용을 받지 못했어요. 다시 물어봐주세요.');
        if(request.current.alive&&current===request.current.id)setResult({source:'GPT',items:data.items});
      }catch(e){if(request.current.alive&&current===request.current.id)setError(e.name==='AbortError'?'답변이 늦어지고 있어요. 기본 조합을 보거나 다시 물어봐주세요.':e.message);}
      finally{clearTimeout(timer);if(current===request.current.id){request.current.locked=false;request.current.controller=null;if(request.current.alive)setBusy(false);}}
    }
    function chips(key,label,values){return h('fieldset',{className:'food-field'},h('legend',null,label),h('div',{className:'food-chips'},values.map(function(v){return h('button',{type:'button',key:v,'aria-pressed':form[key]===v,className:form[key]===v?'selected':'',onClick:function(){field(key,v);}},key==='mode'?(v==='pair'?'곁들임 찾기':'메뉴 고르기'):v);})));}
    function save(item){props.update(function(d){if(!(d.buckets||[]).some(function(b){return b.foodMenu===item.name;}))d.buckets.push({id:window.FutariActivity.id(),text:item.name+' 먹기',foodMenu:item.name,category:'맛집',done:false});});}
    return h('section',{className:'card food-planner','aria-label':'함께 고르는 음식'},h('span',{className:'eyebrow'},'SOMETHING GOOD FOR TWO'),h('h2',{className:'title-lg'},'오늘 뭐 먹지?'),h('p',{className:'muted'},'취향으로 좁혀보고, 고민되면 GPT에게 한 번 더.'),
      chips('mode','무엇을 고를까요?',['pair','meal']),
      form.mode==='pair'?h('div',null,h('label',null,'이미 정한 음식',h('input',{value:form.main,maxLength:80,placeholder:'예: 과메기, 삼겹살, 회',onChange:function(e){field('main',e.target.value);}})),h('div',{className:'food-chips'},['과메기','삼겹살','회','치킨','족발'].map(function(v){return h('button',{type:'button',key:v,'aria-pressed':form.main===v,onClick:function(){field('main',v);}},v);} ))):null,
      chips('drink','함께 마실 것',['없음','막걸리','맥주','소주','와인','하이볼']),chips('method','어떻게 먹을까요?',['직접 요리','배달·포장']),chips('taste','지금 당기는 쪽',['상관없음','국물','매콤','담백','가벼운 메뉴']),
      h('label',{className:'food-simple'},h('input',{type:'checkbox',checked:form.simple,onChange:function(e){field('simple',e.target.checked);}}),'간단하게 준비하고 싶어요'),
      h('label',null,'빼고 싶은 재료 (선택)',h('input',{value:form.exclude,maxLength:160,placeholder:'쉼표로 구분 · 예: 오이, 버섯',onChange:function(e){field('exclude',e.target.value);}})),
      h('label',null,'GPT에게 더 부탁할 것 (선택)',h('textarea',{rows:2,value:form.note,maxLength:400,placeholder:'따뜻한 국물 하나와 새콤한 메뉴 하나면 좋겠어.',onChange:function(e){field('note',e.target.value);}})),
      h('div',{className:'food-actions'},h('button',{type:'button',className:'btn',onClick:basic},result&&result.source!=='GPT'?'다른 기본 조합':'기본 조합 보기'),h('button',{type:'button',className:'btn ghost',disabled:busy||!url||!props.room,onClick:ask},busy?'메뉴를 생각하고 있어요…':url?'GPT에게 물어보기':'GPT 추천 준비 중')),
      !url?h('p',{className:'muted food-help'},'지금은 기본 조합으로 골라볼 수 있어요.'):null,error?h('p',{className:'food-error',role:'alert'},error):null,
      result?h('div',{className:'food-results','aria-live':'polite'},h('p',{className:'eyebrow'},result.source==='GPT'?'GPT가 고른 조합':'미리 준비한 기본 조합'),result.items.length?result.items.map(function(item){var saved=(props.data.buckets||[]).some(function(b){return b.foodMenu===item.name;});return h('article',{key:item.name},h('h3',null,item.name),h('p',null,item.reason),h('small',null,item.preparation),h('button',{type:'button',className:'btn ghost sm',disabled:saved,onClick:function(){save(item);}},saved?'하고 싶은 일에 담았어요':'하고 싶은 일에 담기'));}):h('p',null,'지금 조건에 맞는 기본 조합이 없어요. 조건을 바꾸거나 GPT에게 물어봐요.'),form.note&&result.source!=='GPT'?h('p',{className:'muted'},'추가 요청은 GPT에게 물어볼 때 반영돼요.'):null):null);
  }
  window.FutariFood={Planner:Planner,recommend:recommend,validResults:validResults,endpoint:endpoint};
})();
