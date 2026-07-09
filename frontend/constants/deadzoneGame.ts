// ============================================================
// DEADZONE — Top-Down Shooter (mobile / WebView build)
// ------------------------------------------------------------
// The full canvas game is served to a react-native-webview via
// `source={{ html: DEADZONE_HTML }}`. It has been adapted from the
// desktop (mouse + keyboard) original for touch:
//   • Full-screen responsive canvas (resizes to the device viewport)
//   • Dual floating joysticks — LEFT half = move, RIGHT half = aim + auto-fire
//   • Tap anywhere to start / continue / restart on the menu screens
//   • Audio unlocked on first touch (iOS WKWebView requirement)
// All inner template literals were rewritten as string concatenation so the
// whole document can live safely inside this outer template literal.
// ============================================================

export const DEADZONE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<title>DEADZONE</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body {
    background: #080810;
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: fixed;
    inset: 0;
    font-family: 'Courier New', monospace;
    -webkit-user-select: none;
    user-select: none;
    touch-action: none;
    overscroll-behavior: none;
  }
  canvas { display: block; touch-action: none; }
</style>
</head>
<body>
<canvas id="gameCanvas"></canvas>
<script>
// ============================================================
// CANVAS — full-screen, responsive
// ============================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let W = window.innerWidth  || 390;
let H = window.innerHeight || 700;
function resize() {
  W = window.innerWidth  || W;
  H = window.innerHeight || H;
  canvas.width = W;
  canvas.height = H;
}
resize();
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 120));

// ============================================================
// AUDIO
// ============================================================
let audioCtx = null;
function initAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { audioCtx = null; }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
function playTone(freq, endFreq, duration, type, vol) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.start(now); osc.stop(now + duration);
}
function playSound(type) {
  if (!audioCtx) return;
  switch (type) {
    case 'shoot':      playTone(900, 100, 0.07, 'sawtooth', 0.12); break;
    case 'hit':        playTone(180, 50,  0.15, 'square',   0.25); break;
    case 'enemyDeath': playTone(380, 40,  0.18, 'square',   0.18); break;
    case 'pickup':
      playTone(440, 880, 0.08, 'sine', 0.18);
      setTimeout(() => playTone(880, 1320, 0.1, 'sine', 0.12), 80);
      break;
    case 'levelUp':
      [261,329,392,523].forEach((f, i) =>
        setTimeout(() => playTone(f, f, 0.15, 'square', 0.18), i * 110));
      break;
    case 'playerDeath': playTone(300, 20, 0.8, 'sawtooth', 0.35); break;
    case 'bossHit':    playTone(120, 60, 0.12, 'square', 0.3); break;
  }
}

// ============================================================
// TOUCH INPUT — dual floating joysticks
// ============================================================
const STICK_R = 56;          // joystick ring radius (px)
const moveStick = { active:false, id:null, baseX:0, baseY:0, dx:0, dy:0 };
const aimStick  = { active:false, id:null, baseX:0, baseY:0, dx:0, dy:0 };

function assignStick(s, t) {
  s.active = true; s.id = t.identifier;
  s.baseX = t.clientX; s.baseY = t.clientY;
  s.dx = 0; s.dy = 0;
}
function updateStick(s, t) {
  let dx = t.clientX - s.baseX;
  let dy = t.clientY - s.baseY;
  const len = Math.hypot(dx, dy);
  if (len > STICK_R) {
    // slide the base toward the finger so the ring follows a long drag
    s.baseX += (dx / len) * (len - STICK_R);
    s.baseY += (dy / len) * (len - STICK_R);
    dx = t.clientX - s.baseX; dy = t.clientY - s.baseY;
  }
  s.dx = dx / STICK_R;   // normalized to [-1, 1]
  s.dy = dy / STICK_R;
}
function releaseStick(s) { s.active = false; s.id = null; s.dx = 0; s.dy = 0; }

function isScreenState() {
  return gameState === 'MENU' || gameState === 'LEVEL_CLEAR' ||
         gameState === 'GAME_OVER' || gameState === 'WIN';
}
function handleScreenTap() {
  if (gameState === 'MENU') { resetGame(); }
  else if (gameState === 'LEVEL_CLEAR') { currentLevel++; currentWave = 1; startWave(); gameState = 'PLAYING'; }
  else if (gameState === 'GAME_OVER' || gameState === 'WIN') { resetGame(); }
}

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  initAudio();
  if (isScreenState()) { handleScreenTap(); return; }
  for (const t of e.changedTouches) {
    if (t.clientX < W * 0.5) { if (!moveStick.active) assignStick(moveStick, t); }
    else { if (!aimStick.active) assignStick(aimStick, t); }
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (moveStick.active && t.identifier === moveStick.id) updateStick(moveStick, t);
    else if (aimStick.active && t.identifier === aimStick.id) updateStick(aimStick, t);
  }
}, { passive: false });

function endTouch(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (moveStick.active && t.identifier === moveStick.id) releaseStick(moveStick);
    else if (aimStick.active && t.identifier === aimStick.id) releaseStick(aimStick);
  }
}
canvas.addEventListener('touchend', endTouch, { passive: false });
canvas.addEventListener('touchcancel', endTouch, { passive: false });

// ============================================================
// SCREEN SHAKE
// ============================================================
let shakeAmt = 0, shakeX = 0, shakeY = 0;
function shake(amt) { shakeAmt = Math.max(shakeAmt, amt); }
function updateShake() {
  if (shakeAmt > 0.5) {
    shakeX = (Math.random() - 0.5) * shakeAmt * 2;
    shakeY = (Math.random() - 0.5) * shakeAmt * 2;
    shakeAmt *= 0.82;
  } else { shakeAmt = 0; shakeX = 0; shakeY = 0; }
}

// ============================================================
// PARTICLES
// ============================================================
let particles = [];
function spawnParticles(x, y, color, count, spd) {
  count = count || 10; spd = spd || 4;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = Math.random() * spd + 0.5;
    particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 1,
      decay: 0.028 + Math.random() * 0.035,
      size: Math.random() * 4 + 1.5,
      color,
    });
  }
}
function updateParticles(dt) {
  particles = particles.filter(p => {
    p.x += p.vx * dt * 60; p.y += p.vy * dt * 60;
    p.vx *= 0.91; p.vy *= 0.91;
    p.life -= p.decay * dt * 60;
    return p.life > 0;
  });
}
function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ============================================================
// PICKUPS
// ============================================================
let pickups = [];
function trySpawnPickup(x, y) {
  if (Math.random() < 0.22) {
    pickups.push({ x, y, type: Math.random() < 0.65 ? 'health' : 'rapid', anim: 0 });
  }
}
function updatePickups(dt) {
  pickups = pickups.filter(p => {
    p.anim += dt * 3;
    const dx = player.x - p.x, dy = player.y - p.y;
    if (Math.hypot(dx, dy) < player.radius + 12) {
      if (p.type === 'health') player.health = Math.min(player.maxHealth, player.health + 1);
      else player.rapidTimer = 8;
      playSound('pickup');
      spawnParticles(p.x, p.y, p.type === 'health' ? '#ff4466' : '#ffdd00', 10, 3);
      return false;
    }
    return true;
  });
}
function drawPickups() {
  for (const p of pickups) {
    const bob = Math.sin(p.anim) * 3;
    ctx.save(); ctx.translate(p.x, p.y + bob);
    if (p.type === 'health') {
      ctx.fillStyle = '#ff4466'; ctx.shadowColor = '#ff4466'; ctx.shadowBlur = 12;
      ctx.fillRect(-7, -2, 14, 4); ctx.fillRect(-2, -7, 4, 14);
    } else {
      ctx.fillStyle = '#ffdd00'; ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(4,-8); ctx.lineTo(-1,0); ctx.lineTo(2,0); ctx.lineTo(-4,8); ctx.lineTo(1,1); ctx.lineTo(-2,1);
      ctx.closePath(); ctx.fill();
    }
    ctx.shadowBlur = 0; ctx.restore();
  }
}

// ============================================================
// PLAYER
// ============================================================
const player = {
  x: W/2, y: H/2, radius: 14, speed: 210,
  angle: 0, health: 3, maxHealth: 3,
  invincible: 0, fireRate: 0.17, fireCooldown: 0,
  rapidTimer: 0, score: 0,
  animFrame: 0, animTimer: 0, moving: false,
};

function updatePlayer(dt) {
  // Movement — left joystick
  let dx = moveStick.active ? moveStick.dx : 0;
  let dy = moveStick.active ? moveStick.dy : 0;
  let mag = Math.hypot(dx, dy);
  if (mag > 1) { dx /= mag; dy /= mag; mag = 1; }
  player.moving = mag > 0.15;
  player.x = Math.max(player.radius, Math.min(W - player.radius, player.x + dx * player.speed * dt));
  player.y = Math.max(player.radius, Math.min(H - player.radius, player.y + dy * player.speed * dt));

  // Aim + fire — right joystick
  const aimMag = aimStick.active ? Math.hypot(aimStick.dx, aimStick.dy) : 0;
  if (aimMag > 0.2) player.angle = Math.atan2(aimStick.dy, aimStick.dx);

  if (player.invincible > 0) player.invincible -= dt;
  if (player.fireCooldown > 0) player.fireCooldown -= dt;
  if (player.rapidTimer > 0) player.rapidTimer -= dt;
  if (player.moving) {
    player.animTimer += dt;
    if (player.animTimer > 0.1) { player.animTimer = 0; player.animFrame = (player.animFrame + 1) % 4; }
  }
  const rate = player.rapidTimer > 0 ? player.fireRate * 0.28 : player.fireRate;
  const firing = aimMag > 0.35;
  if (firing && player.fireCooldown <= 0) { fireBullet(); player.fireCooldown = rate; }
}

function drawPlayer() {
  if (player.invincible > 0 && Math.floor(player.invincible * 9) % 2 === 0) return;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);

  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(4, 6, 13, 8, 0, 0, Math.PI*2); ctx.fill();

  const legSwing = player.moving ? Math.sin(player.animFrame * Math.PI / 2) * 5 : 0;
  ctx.fillStyle = '#1a2a4a';
  ctx.fillRect(-7, 6, 6, 9 + legSwing);
  ctx.fillRect(2,  6, 6, 9 - legSwing);
  ctx.fillStyle = '#0d1520';
  ctx.fillRect(-8, 14 + legSwing, 8, 4);
  ctx.fillRect(1,  14 - legSwing, 8, 4);

  ctx.fillStyle = '#2d5a27';
  ctx.beginPath(); ctx.ellipse(0, 0, 12, 10, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#1e3e1a';
  ctx.fillRect(-10, -5, 7, 10);

  ctx.fillStyle = '#2d5a27';
  ctx.fillRect(0, 1, 14, 5);
  ctx.fillStyle = '#444';
  ctx.fillRect(10, -1, 14, 5);
  ctx.fillStyle = '#333';
  ctx.fillRect(20, -2, 8, 2);
  ctx.fillRect(20,  3, 8, 2);
  ctx.fillStyle = '#666';
  ctx.fillRect(26, -1, 4, 4);

  ctx.fillStyle = '#c4895e';
  ctx.beginPath(); ctx.arc(3, -1, 7, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#3a3a28';
  ctx.beginPath(); ctx.arc(3, -2, 7, Math.PI, Math.PI*2); ctx.fill();
  ctx.fillRect(-5, -2, 15, 3);
  ctx.fillStyle = '#88aaff';
  ctx.shadowColor = '#88aaff'; ctx.shadowBlur = 4;
  ctx.fillRect(6, -4, 5, 3);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(10, -3, 1.5, 0, Math.PI*2); ctx.fill();

  ctx.restore();
}

// ============================================================
// BULLETS
// ============================================================
let bullets = [];
let muzzleFlash = 0;

function fireBullet() {
  const dist = 30;
  const bx = player.x + Math.cos(player.angle) * dist;
  const by = player.y + Math.sin(player.angle) * dist;
  const spread = player.rapidTimer > 0 ? 0.09 : 0.025;
  const a = player.angle + (Math.random() - 0.5) * spread;
  bullets.push({ x: bx, y: by, vx: Math.cos(a)*560, vy: Math.sin(a)*560, life: 1.3, fromPlayer: true });
  muzzleFlash = 0.07;
  playSound('shoot');
  spawnParticles(bx, by, '#ffaa33', 3, 2);
}

function updateBullets(dt) {
  muzzleFlash = Math.max(0, muzzleFlash - dt);
  bullets = bullets.filter(b => {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    return b.life > 0 && b.x > -10 && b.x < W+10 && b.y > -10 && b.y < H+10;
  });
}

function drawBullets() {
  ctx.shadowBlur = 10; ctx.shadowColor = '#ffcc00';
  ctx.fillStyle = '#ffee44';
  for (const b of bullets) {
    if (!b.fromPlayer) continue;
    ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI*2); ctx.fill();
  }
  ctx.shadowBlur = 0;
  if (muzzleFlash > 0) {
    const bx = player.x + Math.cos(player.angle) * 30;
    const by = player.y + Math.sin(player.angle) * 30;
    ctx.fillStyle = 'rgba(255,200,50,' + (muzzleFlash / 0.07) + ')';
    ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 22;
    ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
  }
}

// ============================================================
// ENEMIES
// ============================================================
let enemies = [];

const ENEMY = {
  grunt: { radius:14, speed:82,  health:1,  score:10,  color:'#cc3322', eye:'#ffaa00' },
  scout: { radius:10, speed:155, health:1,  score:20,  color:'#9922cc', eye:'#ff66ff' },
  tank:  { radius:22, speed:48,  health:3,  score:40,  color:'#446688', eye:'#44ffcc' },
  boss:  { radius:38, speed:32,  health:25, score:500, color:'#880022', eye:'#ff0044' },
};

function spawnEnemy(type, x, y) {
  const d = ENEMY[type];
  enemies.push({
    x, y, type, radius: d.radius, speed: d.speed,
    health: d.health, maxHealth: d.health, score: d.score,
    color: d.color, eye: d.eye,
    angle: 0, animFrame: 0, animTimer: 0,
    hitFlash: 0, wobble: Math.random() * Math.PI * 2,
    zigTimer: 0, zigDir: 1,
  });
}

function spawnAtEdge(type) {
  const edge = Math.floor(Math.random() * 4);
  const m = 22;
  let x, y;
  if (edge === 0) { x = Math.random() * W; y = -m; }
  else if (edge === 1) { x = W+m; y = Math.random() * H; }
  else if (edge === 2) { x = Math.random() * W; y = H+m; }
  else { x = -m; y = Math.random() * H; }
  spawnEnemy(type, x, y);
}

function updateEnemies(dt) {
  for (const e of enemies) {
    e.hitFlash = Math.max(0, e.hitFlash - dt * 6);
    e.wobble += dt * (e.type === 'boss' ? 2 : 3);
    e.animTimer += dt;
    if (e.animTimer > 0.14) { e.animTimer = 0; e.animFrame = (e.animFrame + 1) % 4; }

    const dx = player.x - e.x, dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    e.angle = Math.atan2(dy, dx);
    let mx = dx / dist, my = dy / dist;

    if (e.type === 'scout') {
      e.zigTimer += dt;
      if (e.zigTimer > 0.45) { e.zigTimer = 0; e.zigDir *= -1; }
      const perp = e.angle + Math.PI / 2;
      mx += Math.cos(perp) * e.zigDir * 0.55;
      my += Math.sin(perp) * e.zigDir * 0.55;
    }

    const lvlMult = 1 + (currentLevel - 1) * 0.14;
    e.x += mx * e.speed * lvlMult * dt;
    e.y += my * e.speed * lvlMult * dt;

    if (Math.hypot(player.x - e.x, player.y - e.y) < player.radius + e.radius - 4) {
      if (player.invincible <= 0) {
        player.health--;
        player.invincible = 1.4;
        shake(12);
        playSound('hit');
        spawnParticles(player.x, player.y, '#ff4444', 14, 6);
        if (player.health <= 0) {
          gameState = 'GAME_OVER';
          playSound('playerDeath');
          spawnParticles(player.x, player.y, '#ff4444', 30, 9);
          spawnParticles(player.x, player.y, '#ffaa44', 20, 6);
        }
      }
    }
  }
}

function drawSingleEnemy(e) {
  ctx.save(); ctx.translate(e.x, e.y);
  const flash = e.hitFlash > 0;
  const col = flash ? '#ffffff' : e.color;
  const eyeCol = flash ? '#ffffff' : e.eye;

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(4,5,e.radius,e.radius*0.6,0,0,Math.PI*2); ctx.fill();

  if (e.type === 'grunt') {
    ctx.fillStyle = col; ctx.shadowColor = e.color; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(0,0,e.radius,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = flash ? '#fff' : '#991111';
    ctx.fillRect(-e.radius, -3, e.radius*2, 6);
    const ls = Math.sin(e.animFrame * Math.PI/2) * 5;
    ctx.fillStyle = flash ? '#fff' : '#771111';
    ctx.fillRect(-8, e.radius-2, 6, 9+ls);
    ctx.fillRect(3,  e.radius-2, 6, 9-ls);
    ctx.rotate(e.angle);
    ctx.fillStyle = eyeCol; ctx.shadowColor = e.eye; ctx.shadowBlur = 7;
    ctx.beginPath(); ctx.arc(e.radius*0.45, -4, 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(e.radius*0.45,  4, 4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(e.radius*0.45+2, -4, 2.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(e.radius*0.45+2,  4, 2.2, 0, Math.PI*2); ctx.fill();

  } else if (e.type === 'scout') {
    ctx.fillStyle = col; ctx.shadowColor = e.color; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(0,0,e.radius,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.rotate(e.angle);
    ctx.fillStyle = eyeCol; ctx.shadowColor = e.eye; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(e.radius*0.5, 0, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(e.radius*0.5+2, 0, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = flash ? '#fff' : '#770099'; ctx.lineWidth = 1.5;
    for (let i=-2;i<=2;i++) { ctx.beginPath(); ctx.moveTo(-e.radius*0.2,i*3); ctx.lineTo(-e.radius*1.3,i*3); ctx.stroke(); }

  } else if (e.type === 'tank') {
    ctx.fillStyle = col; ctx.shadowColor = e.color; ctx.shadowBlur = 6;
    ctx.beginPath();
    for (let i=0;i<6;i++) {
      const a = i*Math.PI/3, r = e.radius*(1+Math.sin(e.wobble*0.5+i)*0.04);
      i===0 ? ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r) : ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
    }
    ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = flash ? '#fff' : '#2a4455';
    for (let i=0;i<6;i++) {
      const a=i*Math.PI/3;
      ctx.beginPath(); ctx.arc(Math.cos(a)*(e.radius-7),Math.sin(a)*(e.radius-7),3.5,0,Math.PI*2); ctx.fill();
    }
    ctx.rotate(e.angle);
    ctx.fillStyle = eyeCol; ctx.shadowColor = e.eye; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(e.radius*0.48,-7,6,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(e.radius*0.48, 7,6,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#111'; ctx.shadowBlur=0;
    ctx.beginPath(); ctx.arc(e.radius*0.48+3,-7,3,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(e.radius*0.48+3, 7,3,0,Math.PI*2); ctx.fill();
    ctx.restore(); ctx.save(); ctx.translate(e.x,e.y);
    const bw=38, bh=5;
    ctx.fillStyle='#111'; ctx.fillRect(-bw/2,-e.radius-12,bw,bh);
    ctx.fillStyle='#44aaff'; ctx.fillRect(-bw/2,-e.radius-12,bw*(e.health/e.maxHealth),bh);

  } else if (e.type === 'boss') {
    const pulse = 1 + Math.sin(e.wobble) * 0.05;
    ctx.fillStyle = col; ctx.shadowColor = e.color; ctx.shadowBlur = 28;
    ctx.beginPath(); ctx.arc(0,0,e.radius*pulse,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    ctx.strokeStyle = flash ? '#fff' : '#ff2244'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(0,0,e.radius*pulse+8,0,Math.PI*2); ctx.stroke();
    ctx.strokeStyle = flash ? '#fff' : '#cc0033'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(0,0,e.radius*pulse-10,0,Math.PI*2); ctx.stroke();
    ctx.rotate(e.angle);
    ctx.fillStyle = eyeCol; ctx.shadowColor = e.eye; ctx.shadowBlur=22;
    ctx.beginPath(); ctx.arc(e.radius*0.42,-12,10,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(e.radius*0.42, 12,10,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#000'; ctx.shadowBlur=0;
    ctx.beginPath(); ctx.arc(e.radius*0.42+4,-12,5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(e.radius*0.42+4, 12,5,0,Math.PI*2); ctx.fill();
    ctx.restore(); ctx.save(); ctx.translate(e.x,e.y);
    const bw=72, bh=8;
    ctx.fillStyle='#111'; ctx.fillRect(-bw/2,-e.radius-16,bw,bh);
    ctx.fillStyle='#ff2244'; ctx.fillRect(-bw/2,-e.radius-16,bw*(e.health/e.maxHealth),bh);
    ctx.strokeStyle='#ff4466'; ctx.lineWidth=1;
    ctx.strokeRect(-bw/2,-e.radius-16,bw,bh);
    ctx.fillStyle='#fff'; ctx.font='bold 10px Courier New'; ctx.textAlign='center';
    ctx.fillText('BOSS',0,-e.radius-25); ctx.textAlign='left';
  }
  ctx.restore();
}

function drawEnemies() { for (const e of enemies) drawSingleEnemy(e); }

function checkBulletEnemyCollisions() {
  const toRemoveBullets = new Set();
  const toRemoveEnemies = new Set();
  for (let bi=0; bi < bullets.length; bi++) {
    const b = bullets[bi];
    if (!b.fromPlayer) continue;
    for (let ei=0; ei < enemies.length; ei++) {
      const e = enemies[ei];
      if (toRemoveEnemies.has(ei)) continue;
      if (Math.hypot(b.x-e.x, b.y-e.y) < e.radius) {
        toRemoveBullets.add(bi);
        e.health--;
        e.hitFlash = 1;
        if (e.health <= 0) {
          toRemoveEnemies.add(ei);
          player.score += e.score;
          playSound(e.type === 'boss' ? 'bossHit' : 'enemyDeath');
          spawnParticles(e.x, e.y, e.color, 16, 7);
          spawnParticles(e.x, e.y, '#ffccaa', 8, 3);
          trySpawnPickup(e.x, e.y);
          enemiesKilledThisWave++;
        } else {
          playSound(e.type === 'boss' ? 'bossHit' : 'hit');
        }
        break;
      }
    }
  }
  bullets  = bullets.filter((_,i)  => !toRemoveBullets.has(i));
  enemies  = enemies.filter((_,i)  => !toRemoveEnemies.has(i));
}

// ============================================================
// LEVEL / WAVE SYSTEM
// ============================================================
let currentLevel = 1;
let currentWave  = 1;
const WAVES_PER_LEVEL = 3;
const MAX_LEVELS = 5;

let enemiesKilledThisWave  = 0;
let enemiesNeededThisWave  = 0;
let enemiesSpawnedThisWave = 0;
let spawnTimer    = 0;
let spawnInterval = 1.5;
let waveActive    = false;
let bossSpawned   = false;
let interludeTimer = 0;

function waveCount() { return 8 + (currentLevel-1)*4 + (currentWave-1)*3; }
function spawnPool() {
  const t = ['grunt'];
  if (currentLevel >= 2) { t.push('grunt','scout'); }
  if (currentLevel >= 3) { t.push('scout','tank'); }
  if (currentLevel >= 4) { t.push('scout','scout','tank'); }
  return t;
}
function isBossWave() { return currentLevel === MAX_LEVELS && currentWave === WAVES_PER_LEVEL; }

function startWave() {
  waveActive = true;
  enemiesKilledThisWave  = 0;
  enemiesSpawnedThisWave = 0;
  bossSpawned = false;
  enemiesNeededThisWave  = isBossWave() ? 1 : waveCount();
  spawnTimer    = 0;
  spawnInterval = Math.max(0.45, 1.5 - (currentLevel-1)*0.18 - (currentWave-1)*0.09);
}

function updateWave(dt) {
  if (!waveActive) return;
  if (isBossWave()) {
    if (!bossSpawned) { spawnEnemy('boss', W/2, -70); bossSpawned = true; }
  } else {
    if (enemiesSpawnedThisWave < enemiesNeededThisWave) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        const pool = spawnPool();
        spawnAtEdge(pool[Math.floor(Math.random()*pool.length)]);
        enemiesSpawnedThisWave++;
        spawnTimer = spawnInterval;
      }
    }
  }
  if (enemiesKilledThisWave >= enemiesNeededThisWave && enemies.length === 0) {
    waveActive = false;
    if (currentWave < WAVES_PER_LEVEL) {
      currentWave++;
      gameState = 'WAVE_CLEAR';
      interludeTimer = 2.2;
    } else {
      if (currentLevel < MAX_LEVELS) {
        player.health = Math.min(player.maxHealth, player.health + 1);
        playSound('levelUp');
        gameState = 'LEVEL_CLEAR';
        interludeTimer = 0;
      } else {
        gameState = 'WIN';
        playSound('levelUp');
      }
    }
  }
}

// ============================================================
// BACKGROUND
// ============================================================
function drawBG() {
  ctx.fillStyle = '#080810'; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle = 'rgba(35,55,75,0.38)'; ctx.lineWidth=1;
  for (let x=0;x<=W;x+=40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y=0;y<=H;y+=40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  const g = ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.25,W/2,H/2,Math.max(W,H)*0.9);
  g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,0.65)');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
}

// ============================================================
// JOYSTICK OVERLAY
// ============================================================
function drawStickUI(s, color) {
  if (!s.active) return;
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = color; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(s.baseX, s.baseY, STICK_R, 0, Math.PI*2); ctx.stroke();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 12;
  const tx = s.baseX + Math.max(-1, Math.min(1, s.dx)) * STICK_R;
  const ty = s.baseY + Math.max(-1, Math.min(1, s.dy)) * STICK_R;
  ctx.beginPath(); ctx.arc(tx, ty, STICK_R*0.42, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
  ctx.globalAlpha = 1;
}
function drawJoysticks() {
  drawStickUI(moveStick, '#4488ff');
  drawStickUI(aimStick,  '#ff5566');
}

// ============================================================
// HUD
// ============================================================
function drawHeart(x, y, size, filled) {
  ctx.save(); ctx.translate(x,y);
  ctx.beginPath();
  ctx.moveTo(0, size*0.4);
  ctx.bezierCurveTo(-size,-size*0.2,-size,size*0.8,0,size*1.2);
  ctx.bezierCurveTo(size,size*0.8,size,-size*0.2,0,size*0.4);
  ctx.fill(); ctx.restore();
}
function drawHUD() {
  ctx.fillStyle='rgba(0,0,0,0.72)'; ctx.fillRect(0,0,W,42);
  for (let i=0;i<player.maxHealth;i++) {
    const filled = i < player.health;
    ctx.fillStyle = filled ? '#ff4455' : '#3a1015';
    ctx.shadowColor = filled ? '#ff4455' : 'transparent';
    ctx.shadowBlur  = filled ? 9 : 0;
    drawHeart(22+i*28, 14, 9, filled);
  }
  ctx.shadowBlur=0;
  ctx.fillStyle='#ffdd44'; ctx.font='bold 16px Courier New'; ctx.textAlign='center';
  ctx.fillText('SCORE: ' + player.score, W/2, 27);
  ctx.fillStyle='#88ddff'; ctx.textAlign='right';
  ctx.fillText('LVL ' + currentLevel + '  W' + currentWave + '/' + WAVES_PER_LEVEL, W-10, 27);
  ctx.textAlign='left';
  if (player.rapidTimer > 0) {
    ctx.fillStyle='#ffdd00'; ctx.shadowColor='#ffdd00'; ctx.shadowBlur=10;
    ctx.font='bold 12px Courier New';
    ctx.fillText('RAPID FIRE ' + player.rapidTimer.toFixed(1) + 's', 10, 60);
    ctx.shadowBlur=0;
  }
}

// ============================================================
// GAME STATE SCREENS
// ============================================================
function titlePx(base) { return Math.round(Math.min(base, W * 0.16)); }

function drawMenu() {
  drawBG();
  ctx.fillStyle='#ff3344'; ctx.shadowColor='#ff3344'; ctx.shadowBlur=40;
  ctx.font='bold ' + titlePx(78) + 'px Courier New'; ctx.textAlign='center';
  ctx.fillText('DEADZONE', W/2, H/2-120);
  ctx.shadowBlur=0;
  ctx.fillStyle='#7799ff'; ctx.font='16px Courier New';
  ctx.fillText('T O P - D O W N   S H O O T E R', W/2, H/2-82);
  ctx.fillStyle='#aaaaaa'; ctx.font='14px Courier New';
  ctx.fillText('LEFT SIDE  —  Move', W/2, H/2-30);
  ctx.fillText('RIGHT SIDE  —  Aim & Auto-Fire', W/2, H/2-4);
  ctx.fillText('Collect  Health  and  Rapid Fire  drops', W/2, H/2+30);
  ctx.fillText('5 Levels - 3 Waves each - Boss on Lv 5', W/2, H/2+56);
  if (Math.floor(Date.now()/500)%2===0) {
    ctx.fillStyle='#ffdd44'; ctx.shadowColor='#ffdd44'; ctx.shadowBlur=14;
    ctx.font='bold 22px Courier New';
    ctx.fillText('TAP TO START', W/2, H/2+120);
    ctx.shadowBlur=0;
  }
  ctx.textAlign='left';
}

function drawWaveClear() {
  ctx.fillStyle='rgba(20,255,80,0.18)';
  ctx.fillRect(W/2-170, H/2-52, 340, 88);
  ctx.fillStyle='#44ff88'; ctx.shadowColor='#44ff88'; ctx.shadowBlur=18;
  ctx.font='bold 36px Courier New'; ctx.textAlign='center';
  ctx.fillText('WAVE CLEAR!', W/2, H/2-4);
  ctx.shadowBlur=0;
  ctx.fillStyle='#aaaaaa'; ctx.font='15px Courier New';
  ctx.fillText('Next wave incoming...', W/2, H/2+30);
  ctx.textAlign='left';
}

function drawLevelClear() {
  ctx.fillStyle='rgba(0,15,5,0.88)'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#44ff88'; ctx.shadowColor='#44ff88'; ctx.shadowBlur=30;
  ctx.font='bold ' + titlePx(52) + 'px Courier New'; ctx.textAlign='center';
  ctx.fillText('LEVEL ' + currentLevel + ' CLEAR!', W/2, H/2-60);
  ctx.shadowBlur=0;
  ctx.fillStyle='#ffdd44'; ctx.font='22px Courier New';
  ctx.fillText('Score: ' + player.score, W/2, H/2+5);
  ctx.fillStyle='#ff6688'; ctx.font='16px Courier New';
  ctx.fillText('+1 Health Restored', W/2, H/2+38);
  if (Math.floor(Date.now()/550)%2===0) {
    ctx.fillStyle='#ffffff'; ctx.font='bold 18px Courier New';
    ctx.fillText('TAP TO CONTINUE', W/2, H/2+96);
  }
  ctx.textAlign='left';
}

function drawGameOver() {
  ctx.fillStyle='rgba(18,0,0,0.9)'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#ff2233'; ctx.shadowColor='#ff2233'; ctx.shadowBlur=32;
  ctx.font='bold ' + titlePx(64) + 'px Courier New'; ctx.textAlign='center';
  ctx.fillText('GAME OVER', W/2, H/2-66);
  ctx.shadowBlur=0;
  ctx.fillStyle='#ffdd44'; ctx.font='26px Courier New';
  ctx.fillText('Score: ' + player.score, W/2, H/2-6);
  ctx.fillStyle='#888'; ctx.font='17px Courier New';
  ctx.fillText('Level ' + currentLevel + '  -  Wave ' + currentWave, W/2, H/2+34);
  if (Math.floor(Date.now()/550)%2===0) {
    ctx.fillStyle='#ffffff'; ctx.font='bold 18px Courier New';
    ctx.fillText('TAP TO PLAY AGAIN', W/2, H/2+94);
  }
  ctx.textAlign='left';
}

function drawWin() {
  ctx.fillStyle='rgba(0,8,18,0.92)'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#ffdd00'; ctx.shadowColor='#ffdd00'; ctx.shadowBlur=40;
  ctx.font='bold ' + titlePx(64) + 'px Courier New'; ctx.textAlign='center';
  ctx.fillText('VICTORY!', W/2, H/2-82);
  ctx.shadowBlur=0;
  ctx.fillStyle='#44ff88'; ctx.font='22px Courier New';
  ctx.fillText('All 5 Levels Cleared!', W/2, H/2-30);
  ctx.fillStyle='#ffdd44'; ctx.font='26px Courier New';
  ctx.fillText('Final Score: ' + player.score, W/2, H/2+18);
  if (Math.floor(Date.now()/550)%2===0) {
    ctx.fillStyle='#ffffff'; ctx.font='bold 18px Courier New';
    ctx.fillText('TAP TO PLAY AGAIN', W/2, H/2+90);
  }
  ctx.textAlign='left';
}

// ============================================================
// RESET
// ============================================================
function resetGame() {
  Object.assign(player, {
    x:W/2, y:H/2, health:3, invincible:0, fireCooldown:0,
    rapidTimer:0, score:0, animFrame:0, moving:false,
  });
  enemies=[]; bullets=[]; particles=[]; pickups=[];
  currentLevel=1; currentWave=1;
  shakeAmt=0;
  releaseStick(moveStick); releaseStick(aimStick);
  startWave();
  gameState='PLAYING';
}

// ============================================================
// MAIN LOOP
// ============================================================
let gameState = 'MENU';
let lastTime = 0;

function loop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  updateShake();
  ctx.save();
  ctx.translate(shakeX, shakeY);

  if (gameState === 'MENU') {
    drawMenu();
  } else if (gameState === 'PLAYING') {
    updatePlayer(dt);
    updateBullets(dt);
    updateEnemies(dt);
    checkBulletEnemyCollisions();
    updatePickups(dt);
    updateWave(dt);
    updateParticles(dt);
    drawBG(); drawPickups(); drawParticles(); drawBullets(); drawEnemies(); drawPlayer(); drawHUD(); drawJoysticks();
  } else if (gameState === 'WAVE_CLEAR') {
    interludeTimer -= dt;
    updateParticles(dt);
    drawBG(); drawPickups(); drawParticles(); drawBullets(); drawEnemies(); drawPlayer(); drawHUD(); drawJoysticks();
    drawWaveClear();
    if (interludeTimer <= 0) { startWave(); gameState = 'PLAYING'; }
  } else if (gameState === 'LEVEL_CLEAR') {
    updateParticles(dt);
    drawBG(); drawParticles(); drawLevelClear();
  } else if (gameState === 'GAME_OVER') {
    updateParticles(dt);
    drawBG(); drawParticles(); drawGameOver();
  } else if (gameState === 'WIN') {
    updateParticles(dt);
    drawBG(); drawParticles(); drawWin();
  }

  ctx.restore();
  requestAnimationFrame(loop);
}

requestAnimationFrame(t => { lastTime = t; requestAnimationFrame(loop); });
</script>
</body>
</html>`;
