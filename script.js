// @ts-nocheck
window.addEventListener('DOMContentLoaded', () => {
    const OPENAI_API_KEY = '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';
  
    const statusText     = document.getElementById('statusText');
    const wizard         = document.getElementById('wizard');
    const cardContainer  = document.getElementById('cardContainer');
    const cardStack      = document.getElementById('cardStack');
    const likeCountEl    = document.getElementById('likeCount');
    const dislikeCountEl = document.getElementById('dislikeCount');
    const reportContainer= document.getElementById('reportContainer');
    const reportText     = document.getElementById('reportText');
    const restartBtn     = document.getElementById('restart');
  
    let answers={}, likes=0, dislikes=0, stepIndex=0;
    let currentPicks=[], likedTitles=[], dislikedTitles=[];
  
    const steps = [
      {t:'choice', q:'When working, you prefer to…',        k:'focus',       options:['One task','Multiple tasks']},
      {t:'choice', q:'Decisions guided by…',                 k:'decision',    options:['Data','Intuition']},
      {t:'slider', q:'Risk tolerance (1–10)?',               k:'risk',        min:1,max:10,def:5},
      {t:'slider', q:'Passion level (1–10)?',                k:'passion',     min:1,max:10,def:5},
      {t:'slider', q:'Creativity (1–10)?',                   k:'creativity',  min:1,max:10,def:5},
      {t:'slider', q:'Leadership (1–10)?',                   k:'leadership',  min:1,max:10,def:5},
      {t:'slider', q:'Communication (1–10)?',                k:'communication',min:1,max:10,def:5},
      {t:'choice', q:'You recharge by…',                     k:'energy',      options:['Alone','With others']},
      {t:'choice', q:'Structure or spontaneity?',            k:'structure',   options:['Plan ahead','Go with flow']},
      {t:'choice', q:'Value Impact or Stability?',           k:'value',       options:['Impact','Stability']},
      {t:'cardSelect', q:'Select your degrees:',             k:'education',   options:[
        {label:'Below HS',value:'Below High School'},
        {label:'High School',value:'High School'},
        {label:'Associate’s',value:'Associate’s'},
        {label:'Bachelor’s',value:'Bachelor’s'},
        {label:'Master’s',value:'Master’s'},
        {label:'PhD',value:'PhD'}
      ]},
      {t:'slider', q:'Years of industry experience?',        k:'exp',         min:0,max:30,def:3},
      {t:'text',   q:'Preferred location?',                  k:'location',    placeholder:'e.g. New York, NY'},
      {t:'cardSelect', q:'Pick up to 3 industries:',         k:'industries',  options:[
        {label:'Tech',value:'Tech'},{label:'Design',value:'Design'},
        {label:'Finance',value:'Finance'},{label:'Health',value:'Health'},
        {label:'Education',value:'Education'},{label:'Manufacturing',value:'Manufacturing'},
        {label:'Green Econ',value:'Green Economy'},{label:'Creative',value:'Creative Economy'},
        {label:'Freelance',value:'Freelance'},{label:'Digital Econ',value:'Digital Economy'}
      ]},
      {t:'action', q:'Assess My Ideal Job',                  k:'run',         text:'Run Assessment'}
    ];
  
    function render(){
      wizard.innerHTML = '';
      document.onkeydown = null;
      steps.forEach((s,i)=>{
        const div = document.createElement('div');
        div.className = 'step' + (i===stepIndex?' active':'');
        const h2 = document.createElement('h2');
        h2.textContent = `Step ${i+1}: ${s.q}`;
        div.appendChild(h2);
  
        if(i===stepIndex){
          if(s.t==='choice'){
            const cb=document.createElement('div'); cb.className='choice-buttons';
            s.options.forEach(opt=>{
              const b=document.createElement('button');
              b.textContent=opt;
              b.onclick=()=>{ answers[s.k]=opt; stepIndex++; render(); };
              cb.appendChild(b);
            });
            div.appendChild(cb);
          }
          else if(s.t==='text'){
            const inp=document.createElement('input');
            inp.type='text'; inp.placeholder=s.placeholder;
            if(s.k==='location') inp.classList.add('white-input');
            const b=document.createElement('button');
            b.textContent='Next';
            b.onclick=()=>{ if(inp.value.trim()){ answers[s.k]=inp.value.trim(); stepIndex++; render(); } };
            div.appendChild(inp); div.appendChild(b);
          }
          else if(s.t==='slider'){
            const inp=document.createElement('input');
            inp.type='range'; inp.min=s.min; inp.max=s.max; inp.value=s.def;
            const lbl=document.createElement('div'); lbl.textContent=inp.value;
            inp.oninput=()=>lbl.textContent=inp.value;
            const b=document.createElement('button');
            b.textContent='Next';
            b.onclick=()=>{ answers[s.k]=+inp.value; stepIndex++; render(); };
            div.appendChild(inp); div.appendChild(lbl); div.appendChild(b);
          }
          else if(s.t==='cardSelect'){
            const cont=document.createElement('div'); cont.className='card-select-container';
            s.options.forEach(opt=>{
              const c=document.createElement('div');
              c.className='select-card'; c.textContent=opt.label;
              c.onclick=()=>{
                answers[s.k]=answers[s.k]||[];
                if(!answers[s.k].includes(opt.value) && answers[s.k].length < (s.k==='industries'?3:Infinity)){
                  answers[s.k].push(opt.value);
                  c.classList.add('selected');
                }
              };
              cont.appendChild(c);
            });
            div.appendChild(cont);
            if(s.k==='education' || s.k==='industries'){
              const b=document.createElement('button');
              b.textContent='Next';
              b.onclick=()=>{ if((answers[s.k]||[]).length>0){ stepIndex++; render(); } };
              div.appendChild(b);
            }
          }
          else if(s.t==='action'){
            const b=document.createElement('button');
            b.textContent=s.text;
            b.onclick=runAssessment;
            div.appendChild(b);
          }
          document.onkeydown = e => {
            if(e.key==='Enter'){
              const btn=div.querySelector('button');
              if(btn) btn.click();
            }
          };
        }
        wizard.appendChild(div);
      });
    }
  
    function runAssessment(){
      wizard.style.display='none';
      cardContainer.classList.remove('hidden');
      fetchJobs();
    }
  
    async function fetchJobs(){
      let allJobs=[], page=1;
      while(allJobs.length<100 && page<=5){
        const res=await fetch(
          `https://www.themuse.com/api/public/jobs?page=${page}&location=${encodeURIComponent(answers.location)}`
        );
        const data=await res.json();
        if(!data.results.length) break;
        allJobs=allJobs.concat(data.results);
        page++;
      }
      const filtered=allJobs.filter(job=>
        job.locations.some(loc=>loc.name.toLowerCase().includes(answers.location.toLowerCase()))
      );
      const source=filtered.length>=15?filtered:allJobs;
  
      const picks=[], used=new Set();
      while(picks.length<15 && picks.length<source.length){
        const i=Math.floor(Math.random()*source.length);
        if(!used.has(i)){ used.add(i); picks.push(source[i]); }
      }
      currentPicks=picks; renderStack();
    }
  
    function renderStack(){
      cardStack.innerHTML='';
      currentPicks.forEach(job=>{
        const c=document.createElement('div');
        c.className='card';
        c.innerHTML=`<h4>${job.name}</h4><p>@ ${job.company.name}</p>`;
        cardStack.appendChild(c);
      });
      updatePositions();
      const top=cardStack.querySelector('.card');
      if(top) makeDraggable(top);
      document.onkeydown=e=>{
        if(!cardContainer.classList.contains('hidden')){
          if(e.key==='ArrowLeft') swipe('left');
          if(e.key==='ArrowRight') swipe('right');
        }
      };
    }
  
    function updatePositions(){
      const cards=Array.from(cardStack.children);
      cards.forEach((c,i)=>{
        c.style.zIndex=cards.length-i;
        const offset=i*20;
        requestAnimationFrame(()=>{
          c.style.transform=`translate(-50%,-50%) translateY(${offset}px) scale(${1-i*0.02})`;
          c.style.opacity='1';
        });
      });
      if(cards.length===0) showReport();
    }
  
    function makeDraggable(el){
      let startX, removed=false;
      const threshold=window.innerWidth/6;
      el.addEventListener('pointerdown', e=>{
        startX=e.clientX; el.setPointerCapture(e.pointerId);
      });
      el.addEventListener('pointermove', e=>{
        if(startX===undefined||removed) return;
        const dx=e.clientX-startX;
        el.style.transform=`translate(${dx}px,-50%)`;
        const pct=Math.min(Math.abs(dx)/threshold,1);
        el.style.opacity=1-pct;
        el.style.backgroundColor=dx>0
          ?`rgba(150,255,150,${pct})`
          :`rgba(255,150,150,${pct})`;
        if(Math.abs(dx)>threshold){
          removed=true;
          const title=el.querySelector('h4').textContent;
          if(dx>0){ likes++; likeCountEl.textContent=likes; likedTitles.push(title); }
          else { dislikes++; dislikeCountEl.textContent=dislikes; dislikedTitles.push(title); }
          el.style.transition='transform .5s ease,opacity .5s ease';
          const offX=dx>0?window.innerWidth:-window.innerWidth;
          el.style.transform=`translate(${offX}px,-50%) scale(0.8)`;
          el.style.opacity='0';
          setTimeout(()=>{
            currentPicks.shift(); renderStack();
          },500);
        }
      });
      el.addEventListener('pointerup', ()=>{
        if(!removed){
          el.style.transition='transform .3s ease,opacity .3s ease,background-color .3s ease';
          el.style.transform='translate(-50%,-50%)';
          el.style.opacity='1';
          el.style.backgroundColor='#fff';
        }
        startX=undefined;
      });
    }
  
    function swipe(dir){
      const top=cardStack.querySelector('.card');
      if(!top) return;
      const title=top.querySelector('h4').textContent;
      if(dir==='right'){ likes++; likeCountEl.textContent=likes; likedTitles.push(title); }
      else { dislikes++; dislikeCountEl.textContent=dislikes; dislikedTitles.push(title); }
      top.style.transition='transform .5s ease,opacity .5s ease';
      const offX=dir==='right'?window.innerWidth:-window.innerWidth;
      top.style.transform=`translate(${offX}px,-50%) rotate(${dir==='right'?15:-15}deg)`;
      top.style.opacity='0';
      setTimeout(()=>{
        currentPicks.shift(); renderStack();
      },500);
    }
  
    async function showReport(){
      cardContainer.classList.add('hidden');
      reportContainer.classList.remove('hidden');
      statusText.textContent = 'Calling OpenAI…';
  
      const messages=[
        {role:"system", content:"You are a professional career coach."},
        {role:"user", content:
          `Personality Answers:\n${JSON.stringify(answers,null,2)}\n\n`+
          `Liked Jobs: ${JSON.stringify(likedTitles)}\n`+
          `Disliked Jobs: ${JSON.stringify(dislikedTitles)}\n`+
          `\nPlease write a concise ~100-word career summary.`}
      ];
  
      try {
        const resp = await fetch("https://api.openai.com/v1/chat/completions", {
          method:"POST",
          headers:{
            "Content-Type":"application/json",
            "Authorization":`Bearer ${OPENAI_API_KEY}`
          },
          body:JSON.stringify({
            model:"gpt-4o-mini",
            messages,
            temperature:0.7,
            max_tokens:200
          })
        });
        console.log("OpenAI HTTP status:", resp.status);
        const data = await resp.json();
        console.log("OpenAI raw response:", data);
        if(!resp.ok || !data.choices?.[0]?.message?.content){
          throw new Error(`OpenAI error: ${resp.status} ${data.error?.message||''}`);
        }
        statusText.textContent = '✅ OpenAI OK';
        reportText.textContent = data.choices[0].message.content.trim();
      }
      catch(err){
        console.error(err);
        statusText.textContent = '❌ OpenAI Error';
        reportText.textContent = `Error generating summary: ${err.message}`;
      }
    }
  
    restartBtn.onclick = ()=>location.reload();
    render();
  });