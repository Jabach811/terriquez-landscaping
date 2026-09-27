(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduce.matches;
  const videos = $$('video');
  const visibleVideos = new Set();
  function syncVideo(video) {
    if (!paused && visibleVideos.has(video) && !video.dataset.userPaused && !document.hidden) {
      video.play().catch(() => { video.closest('figure').querySelector('.video-toggle').textContent = '▶'; });
    } else video.pause();
  }
  function setMotion(value) {
    paused = value;
    document.body.classList.toggle('motion-paused', paused);
    $$('.motion-toggle').forEach(b => {b.textContent = paused ? 'Play motion ▶' : 'Pause motion Ⅱ'; b.setAttribute('aria-pressed', String(paused));});
    videos.forEach(syncVideo);
    if (!paused) requestMowFrame();
  }
  $$('.motion-toggle').forEach(b => b.addEventListener('click', () => setMotion(!paused)));
  reduce.addEventListener('change', e => setMotion(e.matches));
  document.addEventListener('visibilitychange', () => {videos.forEach(syncVideo); if (!document.hidden) requestMowFrame();});
  const videoObserver = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) visibleVideos.add(e.target); else visibleVideos.delete(e.target);
    syncVideo(e.target);
  }), {threshold:.15});
  videos.forEach(v => {
    videoObserver.observe(v);
    const b = v.closest('figure').querySelector('.video-toggle');
    b.addEventListener('click', () => {
      if (v.paused) {delete v.dataset.userPaused; v.play().catch(() => {});} else {v.dataset.userPaused = 'true';v.pause();}
    });
    v.addEventListener('play', () => {b.textContent='Ⅱ';b.setAttribute('aria-label','Pause '+ (v===videos[0]?'point-of-view':'close-up')+' mowing video');});
    v.addEventListener('pause', () => {b.textContent='▶';b.setAttribute('aria-label','Play '+ (v===videos[0]?'point-of-view':'close-up')+' mowing video');});
    v.addEventListener('error', () => {b.textContent='↻'; b.setAttribute('aria-label','Retry video');});
  });
  if (!reduce.matches) document.body.classList.add('js-motion');
  const reveals = new IntersectionObserver(es => es.forEach(e => {if(e.isIntersecting){e.target.classList.add('in-view');reveals.unobserve(e.target);}}), {threshold:.12});
  $$('.reveal').forEach(el=>reveals.observe(el));
  const menu = $('.menu-toggle');
  menu.addEventListener('click', () => {const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close menu':'Open menu');menu.textContent=open?'✕':'☰';$('#mobile-menu').hidden=!open;});
  $$('#mobile-menu a').forEach(a=>a.addEventListener('click',()=>{menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open menu');menu.textContent='☰';$('#mobile-menu').hidden=true;}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape' && !$('#mobile-menu').hidden){menu.click();menu.focus();}});
  const projects = [
    {before:'5c455220e6165eeb',after:'8dbea7f57764e3ba',title:'Overgrown to open again.',detail:'Side-yard cleanup · Weed removal',beforeAlt:'Before: tall weeds along a narrow fenced side yard',afterAlt:'After: the same side yard cleared and accessible'},
    {before:'c5d835a2234679de',after:'1b869d00fb598b5b',title:'A cleaner welcome home.',detail:'Front-yard refresh · Lawn and border cleanup',beforeAlt:'Before: front lawn and sidewalk with untidy borders',afterAlt:'After: the same front yard with cleared borders and a neater lawn'}
  ];
  const compare = $('#compare-range');
  const updateCompare = () => {$('.comparison').style.setProperty('--split',compare.value+'%');compare.setAttribute('aria-valuetext',`${compare.value} percent before, ${100-compare.value} percent after`);};
  compare.addEventListener('input',updateCompare);
  function chooseProject(i) {
    const p=projects[i];
    $$('.project-tabs button').forEach((b,n)=>{b.setAttribute('aria-selected',String(n===i));b.tabIndex=n===i?0:-1;});
    $('#project-panel').setAttribute('aria-labelledby',$$('.project-tabs button')[i].id);
    $('#before-photo').src=`assets/${p.before}.jpg`;$('#before-photo').alt=p.beforeAlt;
    $('#after-photo').src=`assets/${p.after}.jpg`;$('#after-photo').alt=p.afterAlt;
    $('#project-title').textContent=p.title;$('#project-detail').textContent=p.detail;
    compare.value=50;updateCompare();
  }
  $$('.project-tabs button').forEach((b,i)=>{
    b.addEventListener('click',()=>chooseProject(i));
    b.addEventListener('keydown',e=>{if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?1:1-i;chooseProject(n);$$('.project-tabs button')[n].focus();}});
  });
  const dialog=$('#photo-dialog');
  $$('.gallery-item').forEach(b=>b.addEventListener('click',()=>{dialog.querySelector('img').src=b.dataset.photo;dialog.querySelector('img').alt=b.dataset.caption;dialog.querySelector('p').textContent=b.dataset.caption+' · Terriquez Landscaping gallery on Yelp';dialog.showModal();}));
  $('.dialog-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left || e.clientX>r.right || e.clientY<r.top || e.clientY>r.bottom)dialog.close();}});
  $('#year').textContent=new Date().getFullYear();

  // Cached grass textures keep the interactive scene light even on phones.
  const canvas=$('#lawn'),ctx=canvas.getContext('2d');
  const range=$('#mow-range'),output=$('#mow-output');
  let width=650,height=270,progress=0,interacted=false,mowVisible=false,raf=0,lastTime=0;
  const wild=document.createElement('canvas'),cut=document.createElement('canvas');
  function texture(c,short) {
    c.width=width;c.height=height;const g=c.getContext('2d');
    g.fillStyle=short?'#527630':'#364e24';g.fillRect(0,0,width,height);
    let seed=14821; const rand=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
    for(let i=0;i<width*height/9;i++){
      const x=rand()*width,y=rand()*height,length=short?2+rand()*4:5+rand()*13;
      g.strokeStyle=`rgba(${60+Math.floor(rand()*55)},${88+Math.floor(rand()*70)},${22+Math.floor(rand()*36)},${.3+rand()*.5})`;
      g.lineWidth=.6+rand()*.6;g.beginPath();g.moveTo(x,y);g.lineTo(x+(rand()-.5)*(short?3:9),y-length);g.stroke();
    }
    if(short){for(let r=0;r<6;r++){g.fillStyle=r%2?'#142d1726':'#d2e77a18';g.fillRect(0,r*height/6,width,height/6);}}
  }
  function mower(x,y,angle){
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.shadowColor='#0b170dbb';ctx.shadowBlur=10;ctx.shadowOffsetY=5;
    ctx.fillStyle='#17201a';ctx.beginPath();ctx.roundRect(-19,-21,38,42,8);ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    ctx.fillStyle='#0b110d';[[-21,-22],[-21,12],[13,-22],[13,12]].forEach(([a,b])=>{ctx.fillRect(a,b,9,13);});
    ctx.fillStyle='#d4ed7a';ctx.beginPath();ctx.roundRect(-14,-17,28,29,5);ctx.fill();
    ctx.fillStyle='#263629';ctx.beginPath();ctx.roundRect(-10,-11,20,16,4);ctx.fill();ctx.strokeStyle='#81966d';ctx.lineWidth=1;for(let i=-6;i<=6;i+=4){ctx.beginPath();ctx.moveTo(i,-8);ctx.lineTo(i,2);ctx.stroke();}
    ctx.strokeStyle='#d8dfcd';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-12,9);ctx.lineTo(-15,30);ctx.lineTo(15,30);ctx.lineTo(12,9);ctx.stroke();
    ctx.fillStyle='#14251c';ctx.fillRect(-15,27,30,5);ctx.restore();
  }
  function draw(){
    ctx.clearRect(0,0,width,height);ctx.drawImage(wild,0,0);
    const rows=6,rowH=height/rows,p=progress/100*rows,row=Math.min(5,Math.floor(p)),fraction=progress===100?1:p-row;
    for(let r=0;r<=row;r++){
      const f=r<row?1:fraction,w=width*f,x=r%2?width-w:0;
      if(w>0)ctx.drawImage(cut,x,r*rowH,w,rowH,x,r*rowH,w,rowH);
    }
    const mx=row%2?width*(1-fraction):width*fraction;
    mower(Math.max(18,Math.min(width-18,mx)),row*rowH+rowH/2,row%2?-Math.PI/2:Math.PI/2);
    range.value=String(Math.round(progress));output.textContent=Math.round(progress)+'%';
  }
  function resize(){const box=canvas.getBoundingClientRect();width=Math.round(box.width);height=Math.round(box.height);const dpr=Math.min(devicePixelRatio||1,2);canvas.width=width*dpr;canvas.height=height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);texture(wild,false);texture(cut,true);draw();}
  function frame(t){raf=0;if(!mowVisible||paused||interacted||document.hidden){lastTime=0;return;}if(lastTime)progress=Math.min(100,progress+Math.min(t-lastTime,50)*.006);lastTime=t;draw();if(progress<100)requestMowFrame();}
  function requestMowFrame(){if(!raf&&mowVisible&&!paused&&!interacted&&progress<100)raf=requestAnimationFrame(frame);}
  const mowerObserver=new IntersectionObserver(es=>{mowVisible=es[0].isIntersecting;lastTime=0;requestMowFrame();},{threshold:.25});mowerObserver.observe(canvas);
  range.addEventListener('input',()=>{interacted=true;progress=+range.value;draw();});
  canvas.addEventListener('pointermove',e=>{if(e.pointerType==='touch'&&!e.buttons)return;interacted=true;const r=canvas.getBoundingClientRect();const row=Math.max(0,Math.min(5,Math.floor((e.clientY-r.top)/r.height*6)));const frac=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));progress=(row+(row%2?1-frac:frac))/6*100;draw();});
  canvas.addEventListener('pointerdown',e=>{interacted=true;const r=canvas.getBoundingClientRect();const row=Math.max(0,Math.min(5,Math.floor((e.clientY-r.top)/r.height*6)));const frac=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));progress=(row+(row%2?1-frac:frac))/6*100;draw();});
  $('#mow-reset').addEventListener('click',()=>{progress=0;interacted=false;lastTime=0;draw();requestMowFrame();});
  new ResizeObserver(resize).observe(canvas);resize();setMotion(paused);
})();
