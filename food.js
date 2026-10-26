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
  var CATEGORIES=['고기','해산물','면·밥','분식','채소·두부','세계요리','상관없음'];
  var MAINS={
    '고기':['삼겹살','소고기 구이','족발','보쌈','닭갈비','곱창'],
    '해산물':['과메기','회','굴','대게','조개구이','장어구이'],
    '면·밥':['파스타','냉면','라멘','볶음밥','비빔밥','쌀국수'],
    '분식':['떡볶이','김밥','순대','치킨','피자','만두'],
    '채소·두부':['두부구이','샐러드','버섯구이','채소전','가지구이','채소찜'],
    '세계요리':['스테이크','타코','감바스','마라탕','커리','샤부샤부']
  };
  var BASE_CATEGORIES={
    '바지락 술찜':['해산물'],'골뱅이소면':['해산물','면·밥'],'어묵탕':['분식','해산물'],
    '계란찜':['채소·두부'],'두부김치':['채소·두부'],'부추전':['채소·두부'],'해물파전':['해산물'],
    '김치전':['분식','채소·두부'],'오이무침':['채소·두부'],'토마토 샐러드':['채소·두부'],
    '버섯 버터구이':['채소·두부'],'감자채전':['분식','채소·두부'],'콩나물국':['채소·두부'],
    '잔치국수':['면·밥'],'비빔국수':['면·밥'],'닭볶음탕':['고기'],'돼지고기 김치찌개':['고기'],
    '버섯전골':['채소·두부'],'제육볶음':['고기'],'간장 닭구이':['고기'],'두부 버섯덮밥':['채소·두부','면·밥'],
    '마늘 새우구이':['해산물'],'떡볶이':['분식'],'치킨':['고기','분식']
  };
  DISHES.forEach(function(d){d.categories=BASE_CATEGORIES[d.name]||[];});
  var MORE=[
    ['보쌈','돼지고기,배추','담백','소주,막걸리',60,'고기'],
    ['닭갈비','닭고기,고추장,양배추','매콤','맥주,소주',30,'고기'],
    ['소불고기','소고기,콩,밀,양파','담백','소주',25,'고기'],
    ['고추장 삼겹살','돼지고기,고추장','매콤','소주,맥주',25,'고기'],
    ['차돌 숙주볶음','소고기,숙주,콩','담백','맥주,소주',15,'고기'],
    ['돼지고기 수육','돼지고기,대파','담백','막걸리,소주',60,'고기'],
    ['닭한마리','닭고기,감자,대파','국물,담백','소주',45,'고기'],
    ['순대볶음','순대,돼지고기,들깨','매콤','소주,맥주',20,'고기/분식'],
    ['오리 주물럭','오리고기,고추장','매콤','소주',25,'고기'],
    ['소고기 뭇국','소고기,무','국물,담백','없음',30,'고기'],
    ['고등어구이','고등어,해산물','담백','소주',20,'해산물'],
    ['오징어볶음','오징어,해산물,고추장','매콤','소주,맥주',20,'해산물'],
    ['홍합탕','홍합,해산물,마늘','국물,담백','소주,막걸리',20,'해산물'],
    ['대구 맑은탕','대구,해산물,무','국물,담백','소주',30,'해산물'],
    ['연어덮밥','연어,해산물,쌀,콩','담백','와인',15,'해산물/면·밥'],
    ['낙지볶음','낙지,해산물,고추장','매콤','소주',25,'해산물'],
    ['굴전','굴,해산물,밀,계란','담백','막걸리',20,'해산물'],
    ['새우튀김','새우,해산물,밀','담백','맥주,하이볼',25,'해산물/분식'],
    ['가리비찜','가리비,해산물','담백','소주,와인',20,'해산물'],
    ['주꾸미볶음','주꾸미,해산물,고추장','매콤','소주',20,'해산물'],
    ['김치볶음밥','김치,쌀','매콤','맥주',15,'면·밥'],
    ['간장계란밥','쌀,계란,콩,밀','담백','없음',10,'면·밥'],
    ['참치마요덮밥','참치,해산물,쌀,계란','담백','없음',10,'면·밥'],
    ['들기름 막국수','메밀,밀,들깨,콩','담백','막걸리',15,'면·밥'],
    ['얼큰 칼국수','밀,바지락,해산물,고추장','국물,매콤','막걸리',25,'면·밥'],
    ['수제비','밀,감자','국물,담백','막걸리',30,'면·밥'],
    ['콩국수','콩,밀','담백','없음',20,'면·밥'],
    ['소고기 유부초밥','소고기,콩,쌀','담백','없음',20,'면·밥'],
    ['채소비빔밥','쌀,시금치,콩나물,콩,고추장','매콤,가벼운 메뉴','없음',20,'면·밥/채소·두부'],
    ['떡국','떡,소고기,계란','국물,담백','없음',20,'면·밥'],
    ['라볶이','밀,떡,어묵,해산물','매콤','맥주',15,'분식'],
    ['쫄면','밀,양배추,고추장','매콤','맥주',15,'분식/면·밥'],
    ['군만두','돼지고기,밀,콩','담백','맥주',15,'분식'],
    ['김말이튀김','당면,김,밀','담백','맥주',25,'분식'],
    ['국물떡볶이','떡,어묵,해산물,밀','국물,매콤','맥주',20,'분식'],
    ['참치김밥','쌀,참치,해산물,계란','담백','없음',30,'분식/면·밥'],
    ['어묵볶음','어묵,해산물,밀,콩','담백','맥주',10,'분식'],
    ['떡꼬치','떡,고추장','매콤','맥주',15,'분식'],
    ['감자튀김','감자','담백','맥주,하이볼',20,'분식'],
    ['김치만두전골','김치,돼지고기,밀,콩','국물,매콤','소주',25,'분식'],
    ['두부조림','두부,콩,고추장','매콤','막걸리',20,'채소·두부'],
    ['가지구이','가지,콩','담백,가벼운 메뉴','와인',15,'채소·두부'],
    ['배추찜','배추,콩','담백,가벼운 메뉴','소주',15,'채소·두부'],
    ['버섯 들깨탕','버섯,들깨','국물,담백','막걸리',20,'채소·두부'],
    ['양배추전','양배추,계란,밀','담백','맥주',15,'채소·두부'],
    ['단호박 샐러드','단호박,우유','담백,가벼운 메뉴','와인',20,'채소·두부'],
    ['두부 스테이크','두부,콩,계란','담백','와인',25,'채소·두부'],
    ['브로콜리 버섯볶음','브로콜리,버섯,마늘','담백,가벼운 메뉴','와인',10,'채소·두부'],
    ['묵무침','도토리묵,오이,콩','매콤,가벼운 메뉴','막걸리',10,'채소·두부'],
    ['토마토 계란볶음','토마토,계란','담백','없음',10,'채소·두부/세계요리'],
    ['알리오 올리오','밀,마늘','담백','와인',15,'세계요리/면·밥'],
    ['봉골레 파스타','밀,바지락,해산물,마늘','담백','와인',20,'세계요리/면·밥'],
    ['감바스','새우,해산물,마늘','담백','와인,맥주',15,'세계요리/해산물'],
    ['소고기 타코','소고기,밀,토마토','매콤','맥주,하이볼',25,'세계요리/고기'],
    ['치킨 퀘사디아','닭고기,밀,우유','담백','맥주',20,'세계요리/고기'],
    ['팟타이','쌀국수,새우,해산물,계란,땅콩','담백','맥주',25,'세계요리/면·밥'],
    ['나시고렝','쌀,계란,새우,해산물,콩','매콤','맥주',20,'세계요리/면·밥'],
    ['그린커리','닭고기,코코넛,고추','매콤,국물','맥주',30,'세계요리/고기'],
    ['버터치킨 커리','닭고기,토마토,우유','담백','맥주',40,'세계요리/고기'],
    ['샤부샤부','소고기,배추,버섯,콩','국물,담백','소주',25,'세계요리/고기'],
    ['마파두부','두부,콩,돼지고기,고추','매콤','맥주',20,'세계요리/채소·두부'],
    ['탄탄면','밀,돼지고기,땅콩,콩','매콤,국물','맥주',25,'세계요리/면·밥'],
    ['오코노미야키','밀,계란,양배추,우유','담백','맥주,하이볼',25,'세계요리/분식'],
    ['차완무시','계란,새우,해산물','담백','소주',20,'세계요리'],
    ['스테이크','소고기,우유','담백','와인,하이볼',25,'세계요리/고기'],
    ['프렌치 어니언 수프','양파,우유,밀','국물,담백','와인',45,'세계요리'],
    ['라따뚜이','가지,토마토,애호박','담백,가벼운 메뉴','와인',40,'세계요리/채소·두부'],
    ['소바','메밀,밀,콩,멸치,해산물','담백','소주',15,'세계요리/면·밥'],
    ['쌀국수','쌀국수,소고기,숙주','국물,담백','맥주',30,'세계요리/면·밥'],
    ['우동','밀,멸치,해산물,콩','국물,담백','소주',15,'세계요리/면·밥']
  ];
  MORE.forEach(function(v){DISHES.push({name:v[0],reason:v[0]+'처럼 '+(v[2].indexOf('국물')>=0?'따뜻한 국물 메뉴':v[2].indexOf('매콤')>=0?'매콤한 메뉴':'담백한 메뉴')+'도 후보로 골라봐요.',ingredients:v[1].split(','),tags:v[2].split(','),pairs:v[3].split(','),minutes:v[4],categories:v[5].split('/')});});
  var DEFAULT={mode:'pair',category:'상관없음',main:'',drink:'없음',method:'직접 요리',taste:'상관없음',simple:false,exclude:'',note:''};
  function recommend(form,turn){
    var excluded=String(form.exclude||'').split(/[,，\n·]/).map(function(s){return s.trim().toLowerCase();}).filter(Boolean);
    var ranked=DISHES.filter(function(d){return (form.mode!=='meal'||!form.category||form.category==='상관없음'||d.categories.indexOf(form.category)>=0)&&!(form.mode==='pair'&&form.main&&d.name.indexOf(form.main.trim())>=0)&&(!form.simple||form.method==='배달·포장'||d.minutes<=20)&&(form.taste==='상관없음'||d.tags.indexOf(form.taste)>=0)&&!excluded.some(function(x){return [d.name].concat(d.ingredients).join(' ').toLowerCase().indexOf(x)>=0;});}).map(function(d,i){var score=0;d.pairs.forEach(function(p){if(form.main&&form.main.indexOf(p)>=0)score+=5;if(form.drink!=='없음'&&form.drink===p)score+=3;});return {dish:d,score:score,index:i};}).sort(function(a,b){return b.score-a.score||a.index-b.index;});
    var pool=ranked,start=pool.length?((turn||0)*3)%pool.length:0;
    return pool.slice(start).concat(pool.slice(0,start)).slice(0,3).map(function(v){return {name:v.dish.name,reason:v.dish.reason,preparation:form.method==='배달·포장'?'배달·포장 후보로 골라봐요. 실제 판매 여부는 가게에서 확인해요.':'직접 요리 · 약 '+v.dish.minutes+'분'};});
  }
  function validResults(value){return Array.isArray(value)&&value.length===3&&value.every(function(v){return v&&['name','reason','preparation'].every(function(k){return typeof v[k]==='string'&&v[k].trim()&&v[k].length<=(k==='name'?80:400);});})&&new Set(value.map(function(v){return v.name.trim();})).size===3;}
  function endpoint(config){if(!config||!config.FOOD_AI_ENABLED||!config.SUPABASE_URL)return '';return config.SUPABASE_URL.replace(/\/$/,'')+'/functions/v1/food-recommend';}
  function questions(form){
    var list=[{id:'mode',title:'오늘은 뭘 같이 골라볼까?',hint:'아직 메뉴가 없어도, 메인은 정했어도 좋아요.',choices:[['meal','아직 못 정했어','한 끼 메뉴부터 골라보자'],['pair','메인은 정했어','어울리는 곁들임을 찾자']]}];
    list.push({id:'category',title:form.mode==='pair'?'메인은 어떤 쪽이야?':'어떤 쪽부터 골라볼까?',hint:form.mode==='pair'?'종류를 고르면 음식 예시를 더 보여줄게요.':'범위만 좁혀봐요. 아직 모르겠어도 괜찮아요.',choices:CATEGORIES.map(function(value){return [value,value==='상관없음'?(form.mode==='pair'?'직접 적을게':'아직 모르겠어'):value];})});
    if(form.mode==='pair')list.push({id:'main',title:'뭘 먹기로 했어?',hint:'여기 없는 음식도 자유롭게 적어줘요. 예시는 메뉴의 전부가 아니에요.',choices:MAINS[form.category]||[],input:true});
    list.push({id:'drink',title:'같이 한잔할까?',hint:'술 없이 먹어도 좋아요.',choices:[['없음','술 없이 먹을래'],['막걸리','막걸리'],['맥주','맥주'],['소주','소주'],['와인','와인'],['하이볼','하이볼']]});
    list.push({id:'method',title:'오늘은 어떻게 먹을까?',choices:[['직접 요리','직접 만들어 먹기'],['배달·포장','배달이나 포장으로']]});
    list.push({id:'taste',title:'지금 당기는 맛은?',hint:'딱 떠오르는 쪽 하나만 골라봐요.',choices:[['국물','뜨끈한 국물'],['매콤','매콤한 게 좋아'],['담백','담백하고 순하게'],['가벼운 메뉴','가볍고 산뜻하게'],['상관없음','아무거나 잘 먹어']]});
    if(form.method==='직접 요리')list.push({id:'simple',title:'요리에 시간 좀 써도 돼?',choices:[[true,'간단하게!','20분 안팎으로 준비하고 싶어'],[false,'천천히 만들어도 좋아']]});
    list.push({id:'exclude',title:'이건 빼줬으면 해?',hint:'먹고 싶지 않은 재료가 있으면 알려줘요.',input:true,optional:true});
    list.push({id:'note',title:'마지막으로, 더 바라는 건?',hint:'예를 들면 “따뜻한 국물 하나랑 새콤한 안주도!”',input:true,optional:true});
    return list;
  }
  function Planner(props){
    var fs=R.useState(Object.assign({},DEFAULT)),form=fs[0],setForm=fs[1],rs=R.useState(null),result=rs[0],setResult=rs[1],bs=R.useState(false),busy=bs[0],setBusy=bs[1],es=R.useState(''),error=es[0],setError=es[1],ss=R.useState('mode'),step=ss[0],setStep=ss[1];
    var heading=R.useRef(null),request=R.useRef({id:0,controller:null,alive:true,turn:0,history:[],locked:false}),config=window.FUTARI_CONFIG||{},url=endpoint(config);
    R.useEffect(function(){request.current.alive=true;return function(){request.current.alive=false;request.current.id++;if(request.current.controller)request.current.controller.abort();};},[]);
    R.useEffect(function(){if(heading.current)heading.current.focus({preventScroll:true});},[step]);
    var steps=questions(form),position=steps.findIndex(function(q){return q.id===step;}),question=steps[position];
    function cancel(){request.current.id++;request.current.locked=false;if(request.current.controller)request.current.controller.abort();request.current.controller=null;setBusy(false);}
    function field(key,value){cancel();var next=Object.assign({},form,{[key]:value});if(key==='mode'&&value==='meal')next.main='';if(key==='category'&&value!==form.category&&next.mode==='pair')next.main='';if(key==='method'&&value==='배달·포장')next.simple=false;setForm(next);setResult(null);setError('');request.current.turn=0;request.current.history=[];return next;}
    function choose(value){var next=field(step,value),list=questions(next),index=list.findIndex(function(q){return q.id===step;});setStep(list[index+1].id);}
    function back(){cancel();setError('');setResult(null);if(step==='result')setStep('note');else if(position>0)setStep(steps[position-1].id);}
    function restart(){cancel();setForm(Object.assign({},DEFAULT));setResult(null);setError('');request.current.turn=0;request.current.history=[];setStep('mode');}
    function finish(){setStep('result');if(url&&props.room)return ask();basic();}
    function basic(){cancel();setError('');var items=recommend(form,request.current.turn++);setResult({source:'basic',items:items});}
    async function ask(){
      if(request.current.locked||!url)return;request.current.locked=true;var current=++request.current.id,controller=new AbortController();request.current.controller=controller;setBusy(true);setError('');var timer=setTimeout(function(){controller.abort();},25000);
      try{var response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',apikey:config.SUPABASE_KEY},body:JSON.stringify({room:props.room,form:form,avoid:Array.from(new Set(request.current.history.concat(result?result.items.map(function(v){return v.name;}):[]))).slice(-12)}),signal:controller.signal});
        var data;try{data=await response.json();}catch(e){throw Error('추천을 받지 못했어요. 기본 조합으로 먼저 골라보세요.');}
        if(!response.ok)throw Error(response.status===429?'잠시 쉬었다가 다시 물어봐요. 기본 조합은 계속 볼 수 있어요.':response.status===403?'이 공간의 GPT 추천을 아직 사용할 수 없어요. 기본 조합으로 골라보세요.':response.status===503?'GPT 추천이 아직 준비되지 않았어요. 기본 조합으로 골라보세요.':'GPT 추천을 받지 못했어요. 잠시 후 다시 시도해주세요.');
        if(!validResults(data.items))throw Error('추천 내용을 받지 못했어요. 다시 물어봐주세요.');
        if(request.current.alive&&current===request.current.id){request.current.history=Array.from(new Set(request.current.history.concat(data.items.map(function(v){return v.name;})))).slice(-12);setResult({source:'GPT',items:data.items});}
      }catch(e){if(request.current.alive&&current===request.current.id)setError(e.name==='AbortError'?'답변이 늦어지고 있어요. 기본 조합을 보거나 다시 물어봐주세요.':e.message);}
      finally{clearTimeout(timer);if(current===request.current.id){request.current.locked=false;request.current.controller=null;if(request.current.alive)setBusy(false);}}
    }
    function save(item){props.update(function(d){if(!(d.buckets||[]).some(function(b){return b.foodMenu===item.name;}))d.buckets.push({id:window.FutariActivity.id(),text:item.name+' 먹기',foodMenu:item.name,category:'맛집',done:false});});}
    return h('section',{className:'card food-planner food-wizard','aria-label':'함께 고르는 음식'},
      h('div',{className:'food-wizard-top'},h('span',{className:'eyebrow'},'오늘 뭐 먹지?'),h('span',{className:'food-step-count'},step==='result'?'우리의 메뉴 후보':(position+1)+' / '+steps.length)),
      h('div',{className:'food-progress','aria-hidden':true},h('span',{style:{width:(step==='result'?100:position/steps.length*100)+'%'}})),
      question?h('div',{key:step,className:'food-question'},h('h2',{ref:heading,tabIndex:-1,className:'food-question-title'},question.title),question.hint?h('p',{className:'muted'},question.hint):null,
        question.choices?h('div',{className:'food-answer-grid'},question.choices.map(function(option){var parts=Array.isArray(option)?option:[option,option],value=parts[0];return h('button',{type:'button',key:String(value),className:'food-answer','aria-pressed':form[step]===value,onClick:function(){choose(value);}},h('strong',null,parts[1]),parts[2]?h('small',null,parts[2]):null,h('span',{'aria-hidden':true},'→'));})):null,
        question.input?h('form',{className:'food-text-answer',onSubmit:function(ev){ev.preventDefault();if(step==='main'&&!form.main.trim())return;if(step==='note')finish();else choose(form[step]);}},
          h('label',null,step==='main'?'직접 적기':step==='exclude'?'빼고 싶은 재료':'한마디 더',step==='note'?h('textarea',{rows:3,value:form.note,maxLength:400,placeholder:'조리 간단한 걸로, 따뜻한 국물도 하나!',onChange:function(e){field('note',e.target.value);}}):h('input',{value:form[step],maxLength:step==='main'?80:160,placeholder:step==='main'?'예: 과메기랑 굴': '예: 오이, 버섯 (쉼표로 구분)',onChange:function(e){field(step,e.target.value);}})),
          h('button',{type:'submit',className:'btn block',disabled:step==='main'&&!form.main.trim()},step==='note'?'이제 메뉴 골라줘':step==='exclude'&&!form.exclude.trim()?'없어, 다음으로':'다음으로')):null,
        position>0?h('button',{type:'button',className:'food-back',onClick:back},'← 이전 질문'):null):null,
      step==='result'?h('div',{className:'food-conclusion'},h('h2',{ref:heading,tabIndex:-1,className:'food-question-title'},busy?'어울리는 메뉴를 고르는 중…':'우리, 이거 먹어볼까?'),h('p',{className:'food-summary'},[form.mode==='pair'?form.main:form.category==='상관없음'?'한 끼 메뉴':form.category,form.drink==='없음'?'술 없이':form.drink,form.method,form.taste==='상관없음'?'':form.taste,form.simple?'간단하게':''].filter(Boolean).join(' · ')),
        busy?h('p',{className:'muted',role:'status'},'방금 고른 취향으로 생각하고 있어요.'):null,
        error?h('p',{className:'food-error',role:'alert'},error):null,
        h('div',{className:'food-actions'},h('button',{type:'button',className:'btn ghost',onClick:basic},result?'다른 기본 조합':'기본 조합 보기'),url&&props.room?h('button',{type:'button',className:'btn',disabled:busy,onClick:ask},busy?'추천을 기다리는 중…':result&&result.source==='GPT'?'GPT에게 다시 물어보기':'GPT에게 물어보기'):null),
        !url?h('p',{className:'muted food-help'},'지금은 미리 준비한 조합에서 골라드려요.'):null,
        h('div',{className:'food-result-nav'},h('button',{type:'button',className:'food-back',onClick:back},'← 답변 수정하기'),h('button',{type:'button',className:'food-back',onClick:restart},'처음부터 다시'))):null,
      result?h('div',{className:'food-results','aria-live':'polite'},h('p',{className:'eyebrow'},result.source==='GPT'?'GPT가 고른 조합':'미리 준비한 기본 조합'),result.items.length?result.items.map(function(item){var saved=(props.data.buckets||[]).some(function(b){return b.foodMenu===item.name;});return h('article',{key:item.name},h('h3',null,item.name),h('p',null,item.reason),h('small',null,item.preparation),h('button',{type:'button',className:'btn ghost sm',disabled:saved,onClick:function(){save(item);}},saved?'하고 싶은 일에 담았어요':'하고 싶은 일에 담기'));}):h('p',null,'지금 조건에 맞는 기본 조합이 없어요. 조건을 바꾸거나 GPT에게 물어봐요.'),form.note&&result.source!=='GPT'?h('p',{className:'muted'},'추가 요청은 GPT에게 물어볼 때 반영돼요.'):null):null);
  }
  window.FutariFood={Planner:Planner,questions:questions,recommend:recommend,validResults:validResults,endpoint:endpoint};
})();
