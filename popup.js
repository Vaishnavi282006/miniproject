// =============================================
//  PhishGuard AI — popup.js FINAL FIXED
// =============================================

const API_BASE = 'http://127.0.0.1:5000';

// ─── DOM Refs (assigned after DOM loads) ───
let tabBtns, tabSlider, panels;

let urlInput, urlClearBtn, useTabBtn, scanUrlBtn;
let urlLoading, urlResult, urlResultIcon, urlResultVerdict, urlResultConf, urlResultMsg;
let urlError, urlErrorText;

let uploadZone, uploadTrigger, imageInput, uploadIdle, uploadPreview, previewImg, clearImgBtn;
let scanImgBtn, imgLoading, imgResult, imgResultIcon, imgResultVerdict, imgResultConf;
let imgError, imgErrorText;

let currentTab = 'url';

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
  cacheDOM();
  bindEvents();
  initBgCanvas();
  loadCurrentTabUrl();
  setupTabs();
  setupRipple();
  setupUpload();
  setupUrlInput();
});

function cacheDOM() {
  tabBtns   = document.querySelectorAll('.tab-btn');
  tabSlider = document.querySelector('.tab-slider');
  panels    = {
    url:        document.getElementById('panel-url'),
    screenshot: document.getElementById('panel-screenshot')
  };

  urlInput          = document.getElementById('urlInput');
  urlClearBtn       = document.getElementById('urlClearBtn');
  useTabBtn         = document.getElementById('useTabBtn');
  scanUrlBtn        = document.getElementById('scanUrlBtn');
  urlLoading        = document.getElementById('urlLoading');
  urlResult         = document.getElementById('urlResult');
  urlResultIcon     = document.getElementById('urlResultIcon');
  urlResultVerdict  = document.getElementById('urlResultVerdict');
  urlResultConf     = document.getElementById('urlResultConfidence');
  urlResultMsg      = document.getElementById('urlResultMessage');
  urlError          = document.getElementById('urlError');
  urlErrorText      = document.getElementById('urlErrorText');

  uploadZone        = document.getElementById('uploadZone');
  uploadTrigger     = document.getElementById('uploadTrigger');
  imageInput        = document.getElementById('imageInput');
  uploadIdle        = document.getElementById('uploadIdle');
  uploadPreview     = document.getElementById('uploadPreview');
  previewImg        = document.getElementById('previewImg');
  clearImgBtn       = document.getElementById('clearImg');
  scanImgBtn        = document.getElementById('scanImgBtn');
  imgLoading        = document.getElementById('imgLoading');
  imgResult         = document.getElementById('imgResult');
  imgResultIcon     = document.getElementById('imgResultIcon');
  imgResultVerdict  = document.getElementById('imgResultVerdict');
  imgResultConf     = document.getElementById('imgResultConfidence');
  imgError          = document.getElementById('imgError');
  imgErrorText      = document.getElementById('imgErrorText');
}

function bindEvents() {
  // URL scan
  scanUrlBtn.addEventListener('click', handleUrlScan);

  // Image scan
  scanImgBtn.addEventListener('click', handleImageScan);
}

// ════════════════════════════════════════════════════════════
//  BACKGROUND CANVAS
// ════════════════════════════════════════════════════════════
function initBgCanvas() {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const TAU = Math.PI * 2;

  let W, H;
  function resize() {
    W = canvas.width  = canvas.offsetWidth  || 380;
    H = canvas.height = canvas.offsetHeight || 580;
  }
  resize();
  window.addEventListener('resize', resize);

  let frame = 0;
  const rnd  = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp  = (a, b, t) => a + (b - a) * t;

  const C = {
    purple : [109, 40, 217],
    violet : [139, 92, 246],
    lavender:[196,181,253],
    indigo : [79, 70, 229],
    teal   : [20, 184, 166],
    green  : [34, 197, 94],
    red    : [239, 68, 68],
    white  : [255,255,255],
  };
  const col = ([r,g,b], a=1) => `rgba(${r},${g},${b},${a.toFixed(3)})`;

  const aurora = [
    { xp:.15, yp:.05, r:180, c:C.violet,  sp:.00038, ph:0.0 },
    { xp:.85, yp:.90, r:160, c:C.indigo,  sp:.00051, ph:2.1 },
    { xp:.50, yp:.50, r:140, c:C.lavender,sp:.00028, ph:4.2 },
  ];

  function drawAurora() {
    aurora.forEach(a => {
      const b = .82 + .18 * Math.sin(frame * a.sp * TAU + a.ph);
      const r = a.r * b;
      const alpha = (.14 + .07 * Math.sin(frame * a.sp * TAU + a.ph));
      const g = ctx.createRadialGradient(a.xp*W, a.yp*H, 0, a.xp*W, a.yp*H, r);
      g.addColorStop(0,   col(a.c, alpha * 3.0));
      g.addColorStop(.55, col(a.c, alpha));
      g.addColorStop(1,   col(a.c, 0));
      ctx.beginPath(); ctx.arc(a.xp*W, a.yp*H, r, 0, TAU);
      ctx.fillStyle = g; ctx.fill();
    });
  }

  const HS = 26;
  const HH = HS * Math.sqrt(3), HW = HS * 2;
  const hexPts = [];

  function rebuildHex() {
    hexPts.length = 0;
    for (let row = -1; row < Math.ceil(H/HH)+2; row++) {
      for (let col2 = -1; col2 < Math.ceil(W/(HW*.75))+2; col2++) {
        const cx = col2 * HW * .75;
        const cy = row * HH + (col2%2===0 ? 0 : HH/2);
        hexPts.push([cx, cy]);
      }
    }
  }
  rebuildHex();

  function drawHex() {
    const shimmer = .5 + .5 * Math.sin(frame * .003);
    hexPts.forEach(([cx,cy]) => {
      const d = Math.hypot(cx - W*.5, cy - H*.5);
      const fade = clamp(1 - d/(Math.max(W,H)*.7), 0, 1);
      const alpha = (.018 + .022*fade) * (.7 + .3*shimmer);
      ctx.beginPath();
      for (let i=0;i<6;i++) {
        const ang = TAU/6*i - Math.PI/6;
        const px = cx + HS*Math.cos(ang), py = cy + HS*Math.sin(ang);
        i===0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
      }
      ctx.closePath();
      ctx.strokeStyle = col(C.lavender, alpha);
      ctx.lineWidth = .55;
      ctx.stroke();
    });
  }

  const NCOUNT = 16;
  const nodes  = [];

  function makeNode(id) {
    const isThreat = Math.random() < .25;
    return {
      id,
      x: rnd(30, W-30),
      y: rnd(30, H-30),
      vx: rnd(-.14,.14),
      vy: rnd(-.14,.14),
      r: rnd(3.5, 5.5),
      phase: rnd(0, TAU),
      pspeed: rnd(.018,.032),
      status: 'scanning',
      threatNature: isThreat,
      scanProgress: 0,
      scanSpeed: rnd(.003,.007),
      statusAlpha: 0,
    };
  }

  for (let i=0;i<NCOUNT;i++) nodes.push(makeNode(i));

  function drawEdges() {
    for (let i=0;i<nodes.length;i++) {
      for (let j=i+1;j<nodes.length;j++) {
        const a=nodes[i], b=nodes[j];
        const d = Math.hypot(a.x-b.x, a.y-b.y);
        if (d > 120) continue;
        const alpha = (1-d/120)*.1;
        const bothSafe = a.status==='safe' && b.status==='safe';
        const anyThreat = a.status==='threat' || b.status==='threat';
        const edgeC = anyThreat ? C.red : bothSafe ? C.teal : C.violet;
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
        ctx.strokeStyle = col(edgeC, alpha); ctx.lineWidth=.8; ctx.stroke();
      }
    }
  }

  const SHIELD = { x: W*.5, y: H*.42, rings:[] };
  let ringTimer = 0;

  function updateShield() {
    SHIELD.x = W*.5;
    SHIELD.y = H*.42;
    ringTimer++;
    if (ringTimer > 90) {
      ringTimer = 0;
      SHIELD.rings.push({ r:12, maxR:165, alpha:.55 });
    }
    for (let i = SHIELD.rings.length - 1; i >= 0; i--) {
      const ring = SHIELD.rings[i];
      ring.r += 1.1;
      ring.alpha = lerp(ring.alpha, 0, .009);
      if (ring.r > ring.maxR || ring.alpha < .005) SHIELD.rings.splice(i,1);
    }
  }

  function drawShield() {
    const { x, y } = SHIELD;
    const breath = 1 + .08*Math.sin(frame*.025);

    SHIELD.rings.forEach(ring => {
      ctx.beginPath(); ctx.arc(x, y, ring.r, 0, TAU);
      ctx.strokeStyle = col(C.violet, ring.alpha);
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    const halo = ctx.createRadialGradient(x,y,0, x,y,48*breath);
    halo.addColorStop(0, col(C.violet, .35));
    halo.addColorStop(.5, col(C.violet, .14));
    halo.addColorStop(1, col(C.violet, 0));
    ctx.beginPath(); ctx.arc(x,y,38*breath,0,TAU);
    ctx.fillStyle = halo; ctx.fill();

    const sz = 20 * breath;
    ctx.save();
    ctx.translate(x,y);
    ctx.beginPath();
    ctx.moveTo(0, -sz);
    ctx.lineTo(sz*.75, -sz*.45);
    ctx.lineTo(sz*.75, sz*.2);
    ctx.quadraticCurveTo(sz*.75, sz*.85, 0, sz*1.1);
    ctx.quadraticCurveTo(-sz*.75, sz*.85, -sz*.75, sz*.2);
    ctx.lineTo(-sz*.75, -sz*.45);
    ctx.closePath();

    const sg = ctx.createLinearGradient(0,-sz,0,sz);
    sg.addColorStop(0, col(C.lavender,.8));
    sg.addColorStop(1, col(C.purple,.9));
    ctx.fillStyle = sg;
    ctx.fill();
    ctx.strokeStyle = col(C.white,.5);
    ctx.lineWidth = .8;
    ctx.stroke();

    ctx.strokeStyle = col(C.white,.95);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-sz*.28,  sz*.08);
    ctx.lineTo(-sz*.06,  sz*.32);
    ctx.lineTo( sz*.3,  -sz*.18);
    ctx.stroke();
    ctx.restore();
  }

  const packets = [];

  function spawnPacket() {
    const safe = nodes.filter(n => n.status==='safe'||n.status==='scanning');
    if (safe.length < 2) return;
    const a = safe[Math.floor(Math.random()*safe.length)];
    const b = safe[Math.floor(Math.random()*safe.length)];
    if (a===b) return;
    packets.push({
      ax:a.x, ay:a.y, bx:b.x, by:b.y,
      t:0, speed:rnd(.005,.011),
      c: Math.random()<.55 ? C.violet : C.teal,
    });
  }

  for (let i=0;i<4;i++) spawnPacket();

  function drawPackets() {
    if (Math.random()<.018) spawnPacket();
    for (let i=packets.length-1;i>=0;i--) {
      const p=packets[i];
      p.t += p.speed;
      if (p.t>=1) { packets.splice(i,1); continue; }

      const px=lerp(p.ax,p.bx,p.t), py=lerp(p.ay,p.by,p.t);
      const t0=Math.max(0,p.t-.1);
      const tx=lerp(p.ax,p.bx,t0), ty=lerp(p.ay,p.by,t0);

      const tg=ctx.createLinearGradient(tx,ty,px,py);
      tg.addColorStop(0,col(p.c,0));
      tg.addColorStop(1,col(p.c,.4));
      ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(px,py);
      ctx.strokeStyle=tg; ctx.lineWidth=1.4; ctx.stroke();

      const hg=ctx.createRadialGradient(px,py,0,px,py,8);
      hg.addColorStop(0,col(p.c,1.0));
      hg.addColorStop(1,col(p.c,0));
      ctx.beginPath(); ctx.arc(px,py,6,0,TAU);
      ctx.fillStyle=hg; ctx.fill();
    }
  }

  const floaters = [];

  function updateNodes() {
    nodes.forEach(n => {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x<15||n.x>W-15) n.vx*=-1;
      if (n.y<15||n.y>H-15) n.vy*=-1;
      n.phase += n.pspeed;

      if (n.status==='scanning') {
        n.scanProgress += n.scanSpeed;
        if (n.scanProgress>=1) {
          n.scanProgress=1;
          if (n.threatNature) {
            n.status='threat';
            n.neutralTimer = 80 + Math.floor(Math.random()*60);
          } else {
            n.status='safe';
            n.statusAlpha=0;
            floaters.push({ x:n.x, y:n.y, text:'✓', col:C.green, vy:-1.1, alpha:.9, life:80 });
          }
        }
      }

      if (n.status==='threat') {
        n.neutralTimer--;
        if (n.neutralTimer<=0) {
          n.status='neutralised';
          n.statusAlpha=0;
          floaters.push({ x:n.x, y:n.y, text:'✓ Blocked', col:C.violet, vy:-.9, alpha:.9, life:100 });
          n.respawnTimer = 300+Math.floor(Math.random()*300);
        }
      }

      if (n.status==='neutralised') {
        n.respawnTimer--;
        if (n.respawnTimer<=0) {
          n.status='scanning';
          n.scanProgress=0;
          n.threatNature=Math.random()<.22;
          n.statusAlpha=0;
        }
      }

      n.statusAlpha = Math.min(n.statusAlpha+.04, 1);
    });
  }

  function drawNodes() {
    nodes.forEach(n => {
      const pr = n.r + .8*Math.sin(n.phase);
      const sa = n.statusAlpha;

      let core, glow;
      if (n.status==='safe') { core=C.teal; glow=C.green; }
      else if (n.status==='threat') { core=C.red; glow=C.red; }
      else if (n.status==='neutralised') { core=C.violet; glow=C.violet; }
      else { core=C.violet; glow=C.violet; }

      const og=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,pr*5);
      og.addColorStop(0,col(glow,.28*sa));
      og.addColorStop(1,col(glow,0));
      ctx.beginPath(); ctx.arc(n.x,n.y,pr*5,0,TAU);
      ctx.fillStyle=og; ctx.fill();

      if (n.status==='threat') {
        const ring = pr+5+3*Math.sin(n.phase*3);
        ctx.beginPath(); ctx.arc(n.x,n.y,ring,0,TAU);
        ctx.strokeStyle=col(C.red,.35*sa);
        ctx.lineWidth=1;
        ctx.stroke();
      }

      if (n.status==='scanning' && n.scanProgress>0) {
        ctx.beginPath();
        ctx.arc(n.x,n.y,pr+4, -Math.PI/2, -Math.PI/2+TAU*n.scanProgress);
        ctx.strokeStyle=col(C.teal,.55);
        ctx.lineWidth=1.2;
        ctx.lineCap='round';
        ctx.stroke();
      }

      const cg=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,pr);
      cg.addColorStop(0,col(C.white,1.0));
      cg.addColorStop(.4,col(core,.95*sa));
      cg.addColorStop(1,col(core,.85*sa));
      ctx.beginPath(); ctx.arc(n.x,n.y,pr,0,TAU);
      ctx.fillStyle=cg; ctx.fill();

      ctx.save();
      ctx.beginPath(); ctx.arc(n.x,n.y,pr,0,TAU);
      ctx.clip();
      ctx.strokeStyle=col(C.white,.3);
      ctx.lineWidth=.5;
      ctx.beginPath(); ctx.ellipse(n.x,n.y,pr*.65,pr,0,0,TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(n.x-pr,n.y); ctx.lineTo(n.x+pr,n.y); ctx.stroke();
      ctx.restore();
    });
  }

  const dust = Array.from({length:28},() => ({
    x:rnd(0,W), y:rnd(0,H),
    r:rnd(1.0,2.2), alpha:rnd(.1,.28),
    vx:rnd(-.06,.06), vy:rnd(-.08,-.02),
  }));

  function drawFloaters() {
    for (let i=floaters.length-1;i>=0;i--) {
      const f=floaters[i];
      f.y += f.vy;
      f.life--;
      f.alpha -= .009;
      if (f.life<=0 || f.alpha<=0) { floaters.splice(i,1); continue; }
      ctx.save();
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = col(f.col,f.alpha);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }
  }

  function drawDust() {
    dust.forEach(d => {
      d.x += d.vx;
      d.y += d.vy;
      if (d.y < -4) { d.y = H+4; d.x = rnd(0,W); }
      ctx.beginPath(); ctx.arc(d.x,d.y,d.r,0,TAU);
      ctx.fillStyle = col(C.lavender,d.alpha);
      ctx.fill();
    });
  }

  function loop() {
    ctx.fillStyle='rgba(237,233,254,0.22)';
    ctx.fillRect(0,0,W,H);
    frame++;

    drawAurora();
    drawHex();
    drawEdges();
    drawPackets();
    updateShield();
    drawShield();
    updateNodes();
    drawNodes();
    drawFloaters();
    drawDust();

    requestAnimationFrame(loop);
  }

  loop();
}

// ════════════════════════════════════════════════
//  URL & Tab logic
// ════════════════════════════════════════════════
function loadCurrentTabUrl() {
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].url) setUrl(tabs[0].url);
    });
  } else {
    setUrl('https://example.com/test-page');
  }
}

function setUrl(val) {
  urlInput.value = val;
  toggleClearBtn();
}

function setupUrlInput() {
  urlInput.addEventListener('input', () => {
    toggleClearBtn();
    hide(urlResult);
    hide(urlError);
  });

  urlClearBtn.addEventListener('click', () => {
    urlInput.value = '';
    toggleClearBtn();
    urlInput.focus();
    hide(urlResult);
    hide(urlError);
  });

  useTabBtn.addEventListener('click', () => {
    const original = useTabBtn.innerHTML;
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].url) {
          setUrl(tabs[0].url);
          hide(urlResult);
          hide(urlError);
          useTabBtn.textContent = '✓ Loaded';
          setTimeout(() => { useTabBtn.innerHTML = original; }, 1400);
        }
      });
    } else {
      setUrl('https://example.com/test-page');
    }
  });

  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') scanUrlBtn.click();
  });
}

function toggleClearBtn() {
  if (urlInput.value.trim().length > 0) {
    urlClearBtn.classList.remove('hidden');
  } else {
    urlClearBtn.classList.add('hidden');
  }
}

// ════════════════════════════════════════════════
//  Tabs
// ════════════════════════════════════════════════
function setupTabs() {
  tabBtns.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      if (target === currentTab) return;

      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      Object.values(panels).forEach(p => p.classList.remove('active'));
      panels[target].classList.add('active');

      tabSlider.classList.toggle('right', idx === 1);
      currentTab = target;
      resetResults();
    });
  });
}

// ════════════════════════════════════════════════
//  Ripple
// ════════════════════════════════════════════════
function setupRipple() {
  [scanUrlBtn, scanImgBtn].forEach(btn => {
    btn.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.classList.add('ripple');
      ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 700);
    });
  });
}

function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

function resetResults() {
  hide(urlLoading); hide(urlResult); hide(urlError);
  hide(imgLoading); hide(imgResult); hide(imgError);
}

// ════════════════════════════════════════════════
//  URL Scan
// ════════════════════════════════════════════════
async function handleUrlScan() {
  const url = urlInput.value.trim();

  if (!url) {
    showUrlError('Please enter a URL to scan.');
    return;
  }

  try {
    new URL(url);
  } catch {
    showUrlError('Invalid URL. Example: https://example.com');
    return;
  }

  hide(urlResult);
  hide(urlError);
  show(urlLoading);
  scanUrlBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || `HTTP ${res.status}`);
    }

    hide(urlLoading);
    renderUrlResult(data);
  } catch (err) {
    console.error('URL scan error:', err);
    hide(urlLoading);
    showUrlError(`⚠️ ${err.message || 'Server not reachable. Ensure backend is running on port 5000.'}`);
  } finally {
    scanUrlBtn.disabled = false;
  }
}

function renderUrlResult(data) {
  const isSafe = data.result === 'safe';
  urlResult.className = 'result-card ' + (isSafe ? 'safe' : 'phishing');
  urlResultIcon.textContent = isSafe ? '✅' : '⚠️';
  urlResultVerdict.textContent = isSafe ? 'Secure Website' : 'Phishing Detected';
  urlResultConf.textContent = `Confidence: ${data.confidence || 'N/A'}`;
  urlResultMsg.textContent = data.message || (isSafe
    ? 'No phishing indicators found on this page.'
    : 'This page shows signs of credential harvesting or impersonation.');
  show(urlResult);
}

function showUrlError(msg) {
  urlErrorText.textContent = msg;
  show(urlError);
}

// ════════════════════════════════════════════════
//  Image Upload
// ════════════════════════════════════════════════
function setupUpload() {
  uploadTrigger.addEventListener('click', e => {
    e.stopPropagation();
    imageInput.click();
  });

  uploadZone.addEventListener('click', () => imageInput.click());

  imageInput.addEventListener('change', e => {
    if (e.target.files[0]) loadPreview(e.target.files[0]);
  });

  clearImgBtn.addEventListener('click', e => {
    e.stopPropagation();
    clearPreview();
  });

  uploadZone.addEventListener('dragover', e => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
  });

  uploadZone.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) loadPreview(f);
  });
}

function loadPreview(file) {
  const dt = new DataTransfer();
  dt.items.add(file);
  imageInput.files = dt.files;

  const reader = new FileReader();
  reader.onload = e => {
    previewImg.src = e.target.result;
    hide(uploadIdle);
    show(uploadPreview);
  };
  reader.readAsDataURL(file);

  hide(imgResult);
  hide(imgError);
}

function clearPreview() {
  imageInput.value = '';
  previewImg.src = '';
  show(uploadIdle);
  hide(uploadPreview);
  hide(imgResult);
  hide(imgError);
}

// ════════════════════════════════════════════════
//  Screenshot Scan
// ════════════════════════════════════════════════
async function handleImageScan() {
  const file = imageInput.files[0];

  if (!file) {
    imgErrorText.textContent = 'Please upload a screenshot first.';
    show(imgError);
    return;
  }

  hide(imgResult);
  hide(imgError);
  show(imgLoading);
  scanImgBtn.disabled = true;

  try {
    const fd = new FormData();
    fd.append('image', file);

    const res = await fetch(`${API_BASE}/predict-image`, {
      method: 'POST',
      body: fd
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || `HTTP ${res.status}`);
    }

    hide(imgLoading);
    renderImgResult(data);
  } catch (err) {
    console.error('Image scan error:', err);
    hide(imgLoading);
    imgErrorText.textContent = `⚠️ ${err.message || 'Server not reachable. Ensure backend is running on port 5000.'}`;
    show(imgError);
  } finally {
    scanImgBtn.disabled = false;
  }
}

function renderImgResult(data) {
  const isSafe = data.result === 'safe';
  imgResult.className = 'result-card ' + (isSafe ? 'safe' : 'phishing');
  imgResultIcon.textContent = isSafe ? '✅' : '⚠️';
  imgResultVerdict.textContent = isSafe ? 'Visuals look safe' : 'Suspicious UI detected';
  imgResultConf.textContent = `Confidence: ${data.confidence || 'N/A'}`;
  show(imgResult);
}