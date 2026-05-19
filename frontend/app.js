const API='http://127.0.0.1:8000';
const homeSelect=document.getElementById('home-team'),awaySelect=document.getElementById('away-team'),predictBtn=document.getElementById('predict-btn'),resultArea=document.getElementById('result-area'),resultCard=document.getElementById('result-card'),tickerTrack=document.getElementById('ticker-track'),canvas=document.getElementById('basketball-canvas'),ctx=canvas.getContext('2d');
function lerp(a,b,t){return a+(b-a)*t}

// ── PRELOADER ──
window.addEventListener('load',()=>{const l=document.getElementById('preloader-line'),p=document.getElementById('preloader');if(l)l.style.width='100%';setTimeout(()=>{if(p)p.classList.add('done');initReveals();splitHero();},2200);setTimeout(()=>{if(p)p.style.display='none'},3000)});

// ── SMOOTH SCROLL (slower/heavier for cinematic feel) ──
const ss={current:0,target:0,ease:0.055},wrap=document.getElementById('smooth-wrapper');
const heroFrame=document.querySelector('.hero-frame');
const scrollCue=document.querySelector('.scroll-cue');
function ph(){const c=document.getElementById('main-content');return c?c.scrollHeight:0}
window.addEventListener('wheel',e=>{ss.target+=e.deltaY;ss.target=Math.max(0,Math.min(ss.target,ph()-innerHeight))},{passive:true});
let ts=0;window.addEventListener('touchstart',e=>{ts=e.touches[0].clientY},{passive:true});
window.addEventListener('touchmove',e=>{const d=ts-e.touches[0].clientY;ts=e.touches[0].clientY;ss.target+=d;ss.target=Math.max(0,Math.min(ss.target,ph()-innerHeight))},{passive:true});
const progressBar=document.getElementById('scroll-progress');
const showcaseImg=document.querySelector('.scene-bg-img');
function scrollLoop(){
  ss.current=lerp(ss.current,ss.target,ss.ease);
  if(Math.abs(ss.current-ss.target)<.5)ss.current=ss.target;
  if(wrap)wrap.style.transform=`translateY(${-ss.current}px)`;
  // Scroll progress bar
  const maxS=ph()-innerHeight;
  if(progressBar&&maxS>0)progressBar.style.width=(ss.current/maxS*100)+'%';
  // Hero zoom-out parallax
  if(heroFrame){
    const p=Math.min(ss.current/(innerHeight*.8),1);
    const scale=1-p*.15;
    const opacity=1-p*1.2;
    const yOff=ss.current*.25;
    heroFrame.style.transform=`translateY(${yOff}px) scale(${Math.max(scale,.85)})`;
    heroFrame.style.opacity=Math.max(opacity,0);
  }
  // Scene background parallax (moves slower than scroll = depth)
  if(showcaseImg){
    showcaseImg.style.transform=`translateY(${ss.current*.3}px) scale(1.1)`;
  }
  // Scroll-driven dissolve (black gradient grows from bottom)
  const dissolve=document.getElementById('scene-dissolve');
  if(dissolve){
    const p=Math.min(ss.current/(innerHeight*.7),1);
    dissolve.style.height=(p*70)+'%';
  }
  if(scrollCue){
    const o=1-Math.min(ss.current/200,1);
    scrollCue.style.opacity=Math.max(o,0);
  }
  updateSideNav();
  if(typeof updateScrollText==='function')updateScrollText();
  if(typeof updateHScroll==='function')updateHScroll();
  requestAnimationFrame(scrollLoop);
}
scrollLoop();

// ── STATS COUNTER ANIMATION ──
let statsAnimated=false;
function animateStats(){
  if(statsAnimated)return;
  const counters=document.querySelectorAll('[data-count-to]');
  if(!counters.length)return;
  const first=counters[0].getBoundingClientRect();
  if(first.top<innerHeight*.85){
    statsAnimated=true;
    counters.forEach(el=>{
      const target=parseInt(el.dataset.countTo);
      const dur=1800;const st=performance.now();
      function tick(now){
        const t=Math.min((now-st)/dur,1);
        const ease=1-Math.pow(1-t,3);
        el.textContent=Math.round(target*ease).toLocaleString();
        if(t<1)requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }
}
setInterval(animateStats,200);

// ── SCROLL-DRIVEN WORD REVEAL ──
function initScrollText(){
  document.querySelectorAll('[data-scroll-reveal]').forEach(el=>{
    const text=el.textContent.trim();
    el.innerHTML=text.split(/\s+/).map(w=>`<span class="word">${w}</span>`).join('');
  });
}
initScrollText();

function updateScrollText(){
  document.querySelectorAll('[data-scroll-reveal]').forEach(el=>{
    const words=el.querySelectorAll('.word');
    if(!words.length)return;
    const rect=el.getBoundingClientRect();
    const start=innerHeight*.8;
    const end=innerHeight*.2;
    const range=start-end;
    words.forEach((w,i)=>{
      const wordProgress=(start-rect.top)/(range)-(i/words.length)*.6;
      if(wordProgress>0.1){
        w.classList.add('lit');
      }else{
        w.classList.remove('lit');
      }
    });
  });
}

// ── SCROLL-DRIVEN HORIZONTAL CARDS ──
function updateHScroll(){
  const viewport=document.getElementById('hscroll-viewport');
  const track=document.getElementById('hscroll-track');
  if(!viewport||!track)return;
  const rect=viewport.getBoundingClientRect();
  const trackWidth=track.scrollWidth-viewport.offsetWidth;
  if(trackWidth<=0)return;
  // Map section visibility to horizontal scroll
  const sectionTop=rect.top;
  const sectionH=viewport.offsetHeight;
  const progress=Math.max(0,Math.min(1,(innerHeight*.6-sectionTop)/(sectionH+innerHeight*.2)));
  const xOffset=-progress*trackWidth;
  track.style.transform=`translateX(${xOffset}px)`;
}

// ── SIDE NAV TRACKING ──
function updateSideNav(){const items=document.querySelectorAll('.side-nav-item');const sections=['hero','predict','how-it-works','ticker','footer'];let active='hero';const maxScroll=ph()-innerHeight;const atBottom=maxScroll>0&&ss.current>=maxScroll-50;if(atBottom){active='footer'}else{sections.forEach(id=>{const el=document.getElementById(id);if(el){const r=el.getBoundingClientRect();if(r.top<innerHeight*.5)active=id}})}items.forEach(i=>{i.classList.toggle('active',i.dataset.target===active)})}
document.querySelectorAll('.side-nav-item').forEach(i=>{i.addEventListener('click',()=>{const t=document.getElementById(i.dataset.target);if(t){const r=t.getBoundingClientRect();ss.target=ss.current+r.top;ss.target=Math.max(0,Math.min(ss.target,ph()-innerHeight))}})});

// ── HERO TEXT ──
function splitHero(){const t=document.getElementById('hero-title');if(!t||t.dataset.done)return;const tx=t.textContent;t.innerHTML='';t.dataset.done='1';let d=200;const words=tx.split(' ');words.forEach((word,wi)=>{const w=document.createElement('span');w.style.display='inline-block';w.style.whiteSpace='nowrap';for(let i=0;i<word.length;i++){const s=document.createElement('span');s.className='char';s.textContent=word[i];s.style.animationDelay=d+'ms';d+=55;w.appendChild(s)}t.appendChild(w);if(wi<words.length-1){const sp=document.createElement('span');sp.className='char space';sp.textContent='\u00A0';sp.style.animationDelay=d+'ms';d+=55;t.appendChild(sp)}})}

// ── SCROLL REVEALS ──
function initReveals(){const els=document.querySelectorAll('[data-reveal]');function check(){const vh=innerHeight;els.forEach(el=>{if(el.classList.contains('revealed'))return;const r=el.getBoundingClientRect();if(r.top<vh*.88){const d=parseInt(el.dataset.revealDelay||'0');setTimeout(()=>el.classList.add('revealed'),d)}});requestAnimationFrame(check)}check()}

// ── CURSOR ──
const dot=document.getElementById('cursor-dot'),ring=document.getElementById('cursor-ring'),cp={x:0,y:0,dx:0,dy:0,rx:0,ry:0};
let spring=null;
function cursorLoop(){cp.dx=lerp(cp.dx,cp.x,.25);cp.dy=lerp(cp.dy,cp.y,.25);cp.rx=lerp(cp.rx,cp.x,.12);cp.ry=lerp(cp.ry,cp.y,.12);if(dot){dot.style.left=cp.dx+'px';dot.style.top=cp.dy+'px'}if(ring){ring.style.left=cp.rx+'px';ring.style.top=cp.ry+'px'}requestAnimationFrame(cursorLoop)}
cursorLoop();
document.addEventListener('mousemove',e=>{cp.x=e.clientX;cp.y=e.clientY;if(spring){const r=spring.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;spring.style.transform=`translate(${(e.clientX-cx)*.25}px,${(e.clientY-cy)*.25}px)`}});
document.addEventListener('mouseover',e=>{const i=e.target.closest('button,select,a,.glass-card,[data-magnetic],[data-magnetic-spring]');if(i){dot?.classList.add('hover');ring?.classList.add('hover')}if(e.target.closest('[data-magnetic-spring]'))spring=e.target.closest('[data-magnetic-spring]')});
document.addEventListener('mouseout',e=>{const i=e.target.closest('button,select,a,.glass-card,[data-magnetic],[data-magnetic-spring]');if(i){dot?.classList.remove('hover');ring?.classList.remove('hover')}if(e.target.closest('[data-magnetic-spring]')===spring){if(spring)spring.style.transform='';spring=null}});

// ── TILT CARDS ──
document.querySelectorAll('.tilt-card').forEach(c=>{const sh=document.createElement('div');sh.className='tilt-shine';c.appendChild(sh);c.addEventListener('mousemove',e=>{const r=c.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,rx=((r.height/2-y)/r.height)*4,ry=((x-r.width/2)/r.width)*4;c.style.transform=`perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;c.style.setProperty('--mouse-x',x+'px');c.style.setProperty('--mouse-y',y+'px')});c.addEventListener('mouseleave',()=>{c.style.transform=''})});

// ── 3D BASKETBALL ──
let W,H;function rc(){W=canvas.width=innerWidth;H=canvas.height=innerHeight}rc();window.addEventListener('resize',rc);
function genRing(n,fn){const p=[];for(let i=0;i<=n;i++){const t=(i/n)*Math.PI*2;p.push(fn(t))}return p}
const rings=[genRing(80,t=>({x:Math.cos(t),y:0,z:Math.sin(t)})),genRing(80,t=>({x:0,y:Math.cos(t),z:Math.sin(t)})),genRing(80,t=>({x:Math.cos(t),y:Math.sin(t),z:0})),genRing(80,t=>({x:Math.cos(t),y:.35*Math.sin(2*t),z:Math.sin(t)})),genRing(80,t=>({x:Math.cos(t),y:-.35*Math.sin(2*t),z:Math.sin(t)}))];
const sdots=[];for(let i=0;i<120;i++){const phi=Math.acos(2*Math.random()-1),th=Math.random()*Math.PI*2;sdots.push({x:Math.sin(phi)*Math.cos(th),y:Math.sin(phi)*Math.sin(th),z:Math.cos(phi)})}
function rot(p,rx,ry){let x1=p.x*Math.cos(ry)-p.z*Math.sin(ry),z1=p.x*Math.sin(ry)+p.z*Math.cos(ry),y1=p.y,y2=y1*Math.cos(rx)-z1*Math.sin(rx),z2=y1*Math.sin(rx)+z1*Math.cos(rx);return{x:x1,y:y2,z:z2}}
const ball={cx:0,cy:0,radius:0,rotX:0,rotY:0,opacity:0,tcx:0,tcy:0,tr:0,trx:0,try:0,to:0};
const m={x:.5,y:.5,tx:.5,ty:.5};let ar=0;
document.addEventListener('mousemove',e=>{m.tx=e.clientX/W;m.ty=e.clientY/H});
function ubt(){const s=ss.current,vh=H,p=Math.min(s/(vh*2.5),1);if(p<.3){const t=p/.3;ball.tcx=lerp(W*.5,W*.72,t);ball.tcy=lerp(H*.42,H*.45,t);ball.tr=lerp(Math.min(W,H)*.18,Math.min(W,H)*.14,t);ball.to=lerp(.55,.4,t)}else if(p<.6){const t=(p-.3)/.3;ball.tcx=lerp(W*.72,W*.25,t);ball.tcy=lerp(H*.45,H*.5,t);ball.tr=lerp(Math.min(W,H)*.14,Math.min(W,H)*.12,t);ball.to=lerp(.4,.25,t)}else{const t=(p-.6)/.4;ball.tcx=lerp(W*.25,W*.5,t);ball.tcy=lerp(H*.5,H*.7,t);ball.tr=lerp(Math.min(W,H)*.12,Math.min(W,H)*1.2,t);ball.to=lerp(.25,.12,t)}}
function anim(){requestAnimationFrame(anim);ctx.clearRect(0,0,W,H);ar+=.003;m.x=lerp(m.x,m.tx,.04);m.y=lerp(m.y,m.ty,.04);ubt();ball.try=ar+(m.x-.5)*1.2;ball.trx=-.3+(m.y-.5)*.8;const s=.05;ball.cx=lerp(ball.cx,ball.tcx,s);ball.cy=lerp(ball.cy,ball.tcy,s);ball.radius=lerp(ball.radius,ball.tr,s);ball.rotX=lerp(ball.rotX,ball.trx,s);ball.rotY=lerp(ball.rotY,ball.try,s);ball.opacity=lerp(ball.opacity,ball.to,s);if(ball.opacity<.01)return;drawBall()}
function drawBall(){const{cx,cy,radius,rotX,rotY,opacity}=ball;const ra=[.7,.5,.5,.4,.4];rings.forEach((ring,ri)=>{ctx.beginPath();let st=false;for(let i=0;i<ring.length;i++){const rp=rot(ring[i],rotX,rotY),px=cx+rp.x*radius,py=cy+rp.y*radius,d=(rp.z+1)/2,a=opacity*(.05+d*ra[ri]);if(!st){ctx.moveTo(px,py);st=true}else{ctx.strokeStyle=`rgba(255,255,255,${a})`;ctx.lineWidth=.6+d*.8;ctx.lineTo(px,py);ctx.stroke();ctx.beginPath();ctx.moveTo(px,py)}}});sdots.forEach(p=>{const rp=rot(p,rotX,rotY),px=cx+rp.x*radius,py=cy+rp.y*radius,d=(rp.z+1)/2;ctx.beginPath();ctx.arc(px,py,.8,0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${opacity*d*.12})`;ctx.fill()});ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.strokeStyle=`rgba(255,255,255,${opacity*.1})`;ctx.lineWidth=.8;ctx.stroke()}
ball.cx=ball.tcx=innerWidth*.5;ball.cy=ball.tcy=innerHeight*.42;ball.radius=ball.tr=Math.min(innerWidth,innerHeight)*.18;ball.opacity=ball.to=.55;anim();

// ── PARTICLES ──
const pc=document.getElementById('particle-canvas'),pctx=pc?pc.getContext('2d'):null;let parts=[];
function rpc(){if(pc){pc.width=innerWidth;pc.height=innerHeight}}rpc();window.addEventListener('resize',rpc);
function emit(x,y){for(let i=0;i<40;i++){const a=Math.random()*Math.PI*2,sp=2+Math.random()*5;parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1,sz:1+Math.random()*2})}}
function ploop(){if(!pctx)return;requestAnimationFrame(ploop);pctx.clearRect(0,0,pc.width,pc.height);parts=parts.filter(p=>p.life>0);parts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.08;p.life-=.02;pctx.beginPath();pctx.arc(p.x,p.y,p.sz*p.life,0,Math.PI*2);pctx.fillStyle=`rgba(255,255,255,${p.life*.6})`;pctx.fill()})}ploop();

// ── TEAMS ──
async function loadTeams(){try{const r=await fetch(`${API}/teams`);if(!r.ok)throw 0;const d=await r.json();homeSelect.innerHTML='<option value="">Select Home Team</option>';awaySelect.innerHTML='<option value="">Select Away Team</option>';d.teams.forEach(t=>{homeSelect.innerHTML+=`<option value="${t}">${t}</option>`;awaySelect.innerHTML+=`<option value="${t}">${t}</option>`});buildTicker(d.teams)}catch(e){homeSelect.innerHTML='<option value="">API Offline</option>';awaySelect.innerHTML='<option value="">API Offline</option>'}}
function buildTicker(t){const a=[...t,...t];tickerTrack.innerHTML=a.map(t=>`<div class="ticker-item"><span class="ticker-dot"></span>${t}</div>`).join('')}

// ── PREDICT ──
async function handlePredict(){const h=homeSelect.value,a=awaySelect.value;if(!h||!a){showError('Please select both teams.');return}if(h===a){showError('Teams must be different.');return}const br=predictBtn.getBoundingClientRect();emit(br.left+br.width/2,br.top+br.height/2);predictBtn.disabled=true;predictBtn.innerHTML='<span class="spinner"></span> Analyzing...';resultCard.innerHTML='<div class="skeleton-circle skeleton-block"></div><div class="skeleton-line skeleton-block w60" style="margin:0 auto"></div><div style="height:12px"></div><div class="skeleton-line skeleton-block w80" style="margin:0 auto"></div><div style="height:20px"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px"><div class="skeleton-box skeleton-block"></div><div class="skeleton-box skeleton-block"></div></div>';resultArea.classList.add('visible');try{const r=await fetch(`${API}/predict`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({home_team:h,away_team:a})});if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.detail||'Failed')}showResult(await r.json())}catch(e){showError(e.message||'Backend unreachable.')}finally{predictBtn.disabled=false;predictBtn.innerHTML='Predict Winner'}}

// ── HELPERS ──
function getTier(w){if(w>=.65)return{n:'Elite',c:'tier-elite'};if(w>=.55)return{n:'Strong',c:'tier-strong'};if(w>=.45)return{n:'Contender',c:'tier-contender'};return{n:'Rebuilding',c:'tier-rebuilding'}}
function countUp(el,target,suf='',dur=1500){const st=performance.now();function tick(now){const t=Math.min((now-st)/dur,1),e=1-Math.pow(1-t,3);el.textContent=(target*e).toFixed(1)+suf;if(t<1)requestAnimationFrame(tick)}requestAnimationFrame(tick)}

// ── SHOW RESULT ──
function showResult(data){const cp=(data.confidence*100).toFixed(1),hp=(data.home_win_prob*100).toFixed(1),ap=((1-data.home_win_prob)*100).toFixed(1),st=data.stats||{},ht=getTier(st.home_win_pct||.5),at=getTier(st.away_win_pct||.5);
const metrics=[{l:'Win Rate',h:st.home_win_pct,a:st.away_win_pct,mx:1,p:1},{l:'Avg Points',h:st.home_avg_pts,a:st.away_avg_pts,mx:130},{l:'Off Rating',h:st.home_off_rating,a:st.away_off_rating,mx:130},{l:'Def Rating',h:st.home_def_rating,a:st.away_def_rating,mx:130},{l:'Pace',h:st.home_pace,a:st.away_pace,mx:110},{l:'Last 5',h:st.home_last5_win_pct,a:st.away_last5_win_pct,mx:1,p:1}];
let tel='';if(Object.keys(st).length){const rows=metrics.map(m=>{const hP=Math.min(((m.h||0)/m.mx)*100,100).toFixed(1),aP=Math.min(((m.a||0)/m.mx)*100,100).toFixed(1),hD=m.p?((m.h||0)*100).toFixed(1)+'%':(m.h||0).toFixed(1),aD=m.p?((m.a||0)*100).toFixed(1)+'%':(m.a||0).toFixed(1);return`<div class="telemetry-row"><div class="telemetry-bar-wrap home"><div class="telemetry-bar-fill home-fill" data-width="${hP}"></div></div><div class="telemetry-label">${m.l}</div><div class="telemetry-bar-wrap"><div class="telemetry-bar-fill away-fill" data-width="${aP}"></div></div></div><div class="telemetry-values"><div class="telemetry-val home-val">${hD}</div><div class="telemetry-val-center"></div><div class="telemetry-val away-val">${aD}</div></div>`}).join('');tel=`<div class="telemetry-section"><div class="telemetry-title">Head-to-Head</div><div style="display:flex;justify-content:space-between;margin-bottom:14px"><span style="font-size:.6rem;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.35)">${data.home_team}</span><span style="font-size:.6rem;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.35)">${data.away_team}</span></div><div class="telemetry-grid">${rows}</div></div><div class="radar-section"><canvas class="radar-canvas" id="radar-canvas"></canvas></div>`}
let feat='';if(data.feature_importances&&data.feature_importances.length){const mx=data.feature_importances[0].importance;feat=`<div class="feat-imp-section"><div class="feat-imp-title">What Drove This</div><div class="feat-imp-grid">${data.feature_importances.map(f=>{const p=((f.importance/mx)*100).toFixed(1),d=(f.importance*100).toFixed(1);return`<div class="feat-imp-row"><div class="feat-imp-name">${f.name}</div><div class="feat-imp-bar-track"><div class="feat-imp-bar-fill" data-width="${p}"></div></div><div class="feat-imp-pct">${d}%</div></div>`}).join('')}</div></div>`}
resultCard.className='result-card glass-card';resultCard.innerHTML=`<div class="arc-gauge-section"><canvas class="arc-gauge-canvas" id="arc-gauge"></canvas><div class="arc-gauge-label">Confidence</div></div><div class="result-label">Predicted Winner</div><div class="result-winner glitch">${data.winner}</div><div class="result-stats"><div class="stat-box"><div class="stat-label">${data.home_team}</div><div class="stat-value" data-count="${hp}">0.0%</div><div class="tier-badge ${ht.c}">${ht.n}</div></div><div class="stat-box"><div class="stat-label">${data.away_team}</div><div class="stat-value" data-count="${ap}">0.0%</div><div class="tier-badge ${at.c}">${at.n}</div></div></div><div class="confidence-bar-wrapper"><div class="confidence-bar-label"><span>Confidence</span><span>${cp}%</span></div><div class="confidence-bar-track"><div class="confidence-bar-fill" id="confidence-fill"></div></div></div>${tel}${feat}`;
resultArea.classList.add('visible');
setTimeout(()=>{document.querySelectorAll('[data-count]').forEach(el=>countUp(el,parseFloat(el.dataset.count),'%'))},200);
setTimeout(()=>{const f=document.getElementById('confidence-fill');if(f)f.style.width=cp+'%'},300);
setTimeout(()=>{document.querySelectorAll('.telemetry-bar-fill,.feat-imp-bar-fill').forEach(b=>{b.style.width=b.dataset.width+'%'})},500);
setTimeout(()=>drawGauge(data.confidence),200);
if(Object.keys(st).length)setTimeout(()=>drawRadar(data),600)}

// ── ARC GAUGE ──
function drawGauge(conf){const gc=document.getElementById('arc-gauge');if(!gc)return;const g=gc.getContext('2d');gc.width=360;gc.height=220;g.scale(2,2);const cx=90,cy=100,r=65,sa=Math.PI,ea=2*Math.PI,ta=sa+(ea-sa)*conf;let ca=sa;function f(){ca+=(ta-ca)*.06;g.clearRect(0,0,180,110);g.beginPath();g.arc(cx,cy,r,sa,ea);g.strokeStyle='rgba(255,255,255,0.05)';g.lineWidth=5;g.lineCap='round';g.stroke();g.beginPath();g.arc(cx,cy,r,sa,ca);const gr=g.createLinearGradient(cx-r,cy,cx+r,cy);gr.addColorStop(0,'rgba(255,255,255,0.12)');gr.addColorStop(1,'rgba(255,255,255,0.7)');g.strokeStyle=gr;g.lineWidth=5;g.lineCap='round';g.stroke();const dx=cx+r*Math.cos(ca),dy=cy+r*Math.sin(ca);g.beginPath();g.arc(dx,dy,3,0,Math.PI*2);g.fillStyle='#fff';g.shadowColor='#fff';g.shadowBlur=10;g.fill();g.shadowBlur=0;const pct=((ca-sa)/(ea-sa)*100).toFixed(1);g.fillStyle='#fff';g.font='700 20px Outfit';g.textAlign='center';g.textBaseline='middle';g.fillText(pct+'%',cx,cy-14);if(Math.abs(ca-ta)>.001)requestAnimationFrame(f)}f()}

// ── RADAR ──
function drawRadar(data){const rc=document.getElementById('radar-canvas');if(!rc)return;const g=rc.getContext('2d'),sz=rc.offsetWidth;rc.width=sz*2;rc.height=sz*2;g.scale(2,2);const cx=sz/2,cy=sz/2,r=sz*.35,st=data.stats;const ax=[{l:'OFF',h:st.home_off_rating/130,a:st.away_off_rating/130},{l:'DEF',h:1-(st.home_def_rating/130),a:1-(st.away_def_rating/130)},{l:'WIN',h:st.home_win_pct,a:st.away_win_pct},{l:'PTS',h:st.home_avg_pts/130,a:st.away_avg_pts/130},{l:'PACE',h:st.home_pace/110,a:st.away_pace/110}],n=ax.length;
for(let ring=1;ring<=4;ring++){const rr=(ring/4)*r;g.beginPath();for(let i=0;i<=n;i++){const a=(i/n)*Math.PI*2-Math.PI/2,px=cx+Math.cos(a)*rr,py=cy+Math.sin(a)*rr;i===0?g.moveTo(px,py):g.lineTo(px,py)}g.closePath();g.strokeStyle=`rgba(255,255,255,${ring===4?.08:.03})`;g.lineWidth=.5;g.stroke()}
for(let i=0;i<n;i++){const a=(i/n)*Math.PI*2-Math.PI/2;g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);g.strokeStyle='rgba(255,255,255,0.05)';g.lineWidth=.5;g.stroke();g.fillStyle='rgba(255,255,255,0.25)';g.font='500 8px Inter';g.textAlign='center';g.textBaseline='middle';g.fillText(ax[i].l,cx+Math.cos(a)*(r+14),cy+Math.sin(a)*(r+14))}
dp(g,cx,cy,r,n,ax.map(a=>Math.min(a.h,1)),'rgba(255,255,255,0.4)','rgba(255,255,255,0.05)');dp(g,cx,cy,r,n,ax.map(a=>Math.min(a.a,1)),'rgba(255,255,255,0.15)','rgba(255,255,255,0.02)');
g.fillStyle='rgba(255,255,255,0.35)';g.font='500 7px Inter';g.textAlign='left';g.fillRect(cx-45,sz-20,6,2);g.fillText(data.home_team.split(' ').pop(),cx-35,sz-18);g.fillStyle='rgba(255,255,255,0.12)';g.fillRect(cx+10,sz-20,6,2);g.fillStyle='rgba(255,255,255,0.35)';g.fillText(data.away_team.split(' ').pop(),cx+20,sz-18)}
function dp(c,cx,cy,r,n,v,s,f){c.beginPath();for(let i=0;i<=n;i++){const idx=i%n,a=(idx/n)*Math.PI*2-Math.PI/2,val=v[idx]||0,px=cx+Math.cos(a)*r*val,py=cy+Math.sin(a)*r*val;i===0?c.moveTo(px,py):c.lineTo(px,py)}c.closePath();c.fillStyle=f;c.fill();c.strokeStyle=s;c.lineWidth=1;c.stroke()}

function showError(msg){resultCard.innerHTML=`<div class="error-card glass-card"><div class="error-icon">!</div><div class="error-message">${msg}</div></div>`;resultArea.classList.add('visible')}
document.addEventListener('DOMContentLoaded',loadTeams);

// ═══════════════════════════════════════════════════════════════
// WOW EFFECTS
// ═══════════════════════════════════════════════════════════════

// ── 1. AMBIENT FLOATING ORBS ──
const orbCanvas=document.createElement('canvas');
orbCanvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;opacity:.6';
document.body.appendChild(orbCanvas);
const orbCtx=orbCanvas.getContext('2d');
const orbs=[];
function initOrbs(){
  orbCanvas.width=innerWidth;orbCanvas.height=innerHeight;
  orbs.length=0;
  for(let i=0;i<8;i++){
    orbs.push({
      x:Math.random()*innerWidth,y:Math.random()*innerHeight,
      r:60+Math.random()*120,
      vx:(Math.random()-.5)*.15,vy:(Math.random()-.5)*.1,
      hue:30+Math.random()*20,
      alpha:.01+Math.random()*.015
    });
  }
}
initOrbs();window.addEventListener('resize',initOrbs);
function orbLoop(){
  requestAnimationFrame(orbLoop);
  orbCtx.clearRect(0,0,orbCanvas.width,orbCanvas.height);
  orbs.forEach(o=>{
    o.x+=o.vx;o.y+=o.vy;
    if(o.x<-o.r)o.x=orbCanvas.width+o.r;
    if(o.x>orbCanvas.width+o.r)o.x=-o.r;
    if(o.y<-o.r)o.y=orbCanvas.height+o.r;
    if(o.y>orbCanvas.height+o.r)o.y=-o.r;
    const g=orbCtx.createRadialGradient(o.x,o.y,0,o.x,o.y,o.r);
    g.addColorStop(0,`hsla(${o.hue},50%,60%,${o.alpha})`);
    g.addColorStop(1,'hsla(0,0%,0%,0)');
    orbCtx.fillStyle=g;
    orbCtx.beginPath();
    orbCtx.arc(o.x,o.y,o.r,0,Math.PI*2);
    orbCtx.fill();
  });
}
orbLoop();

// ── 2. CURSOR GLOW TRAIL ──
const trailCanvas=document.createElement('canvas');
trailCanvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:9996;pointer-events:none';
document.body.appendChild(trailCanvas);
const trailCtx=trailCanvas.getContext('2d');
const trail=[];
function initTrail(){trailCanvas.width=innerWidth;trailCanvas.height=innerHeight}
initTrail();window.addEventListener('resize',initTrail);
document.addEventListener('mousemove',e=>{
  trail.push({x:e.clientX,y:e.clientY,life:1});
  if(trail.length>30)trail.shift();
});
function trailLoop(){
  requestAnimationFrame(trailLoop);
  trailCtx.clearRect(0,0,trailCanvas.width,trailCanvas.height);
  trail.forEach((p,i)=>{
    p.life-=.04;
    if(p.life<=0)return;
    const g=trailCtx.createRadialGradient(p.x,p.y,0,p.x,p.y,15*p.life);
    g.addColorStop(0,`rgba(200,160,80,${p.life*.08})`);
    g.addColorStop(1,'rgba(200,160,80,0)');
    trailCtx.fillStyle=g;
    trailCtx.beginPath();
    trailCtx.arc(p.x,p.y,15*p.life,0,Math.PI*2);
    trailCtx.fill();
  });
  // Remove dead
  while(trail.length&&trail[0].life<=0)trail.shift();
}
trailLoop();

// ── 3. SCROLL-DRIVEN PARALLAX LAYERS ──
const parallaxEls=document.querySelectorAll('[data-reveal]');
function updateParallax(){
  parallaxEls.forEach(el=>{
    const r=el.getBoundingClientRect();
    if(r.top<innerHeight&&r.bottom>0){
      const p=(innerHeight-r.top)/(innerHeight+r.height);
      const offset=(p-.5)*-12; // subtle float
      el.style.willChange='transform';
    }
  });
}
// Called inside scroll loop already via updateSideNav

// ── 4. PREDICT BUTTON BREATHING GLOW ──
const btnStyle=document.createElement('style');
btnStyle.textContent=`
@keyframes btn-breathe{
  0%,100%{box-shadow:0 0 20px rgba(200,160,80,.05),0 4px 20px rgba(0,0,0,.2)}
  50%{box-shadow:0 0 40px rgba(200,160,80,.12),0 4px 30px rgba(0,0,0,.3)}
}
.predict-btn{animation:btn-breathe 3s ease-in-out infinite}
.predict-btn:hover{animation:none}

@keyframes orb-float{
  0%,100%{transform:translateY(0)}
  50%{transform:translateY(-8px)}
}

.stat-big{animation:orb-float 4s ease-in-out infinite}
.stat-counter:nth-child(2) .stat-big{animation-delay:.5s}
.stat-counter:nth-child(4) .stat-big{animation-delay:1s}
.stat-counter:nth-child(6) .stat-big{animation-delay:1.5s}

.hscroll-card{transition:transform .6s cubic-bezier(.16,1,.3,1),box-shadow .6s ease,border-color .6s ease}
.hscroll-card:hover{transform:translateY(-8px) scale(1.02)!important;border-color:rgba(200,160,80,.15);box-shadow:0 24px 60px rgba(0,0,0,.4),0 0 40px rgba(200,160,80,.06)}

.side-nav-item{transition:all .4s cubic-bezier(.16,1,.3,1)}
.side-nav-item.active{transform:translateX(4px)}
.side-nav-item.active .nav-num{color:rgba(200,160,80,.7)}
`;
document.head.appendChild(btnStyle);
// Removed dynamic background warmth to keep background perfectly clean
