// Improved 3D Horror Maze with Random Maze, Haze, Mouse Look, and Starry Sky
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const MAP_W = 21, MAP_H = 15;

let maze = generateMaze(MAP_W, MAP_H);
// Player state
let player = {
  x: 1.5,
  y: 1.5,
  angle: 0,
  fov: Math.PI / 3,
  moveSpeed: 0.12,
  rotSpeed: 0.04
};

let keys = {};
document.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

// Mouse look
let dragging = false, lastX = 0;
canvas.addEventListener('mousedown', e => {
  dragging = true;
  lastX = e.clientX;
  canvas.style.cursor = "grabbing";
});
window.addEventListener('mouseup', () => {
  dragging = false;
  canvas.style.cursor = "grab";
});
window.addEventListener('mousemove', e => {
  if (dragging) {
    player.angle += (e.clientX - lastX) * 0.003;
    lastX = e.clientX;
  }
});

// Simple wall & floor texture
const wallTexture = document.createElement('canvas');
wallTexture.width = wallTexture.height = 64;
const wtx = wallTexture.getContext('2d');
wtx.fillStyle = "#333"; wtx.fillRect(0, 0, 64, 64);
for (let y = 0; y < 64; y += 8) {
  wtx.strokeStyle = "#4d4d4d";
  wtx.beginPath(); wtx.moveTo(0, y); wtx.lineTo(64, y); wtx.stroke();
}
wtx.strokeStyle = "#444";
wtx.beginPath(); wtx.arc(32, 32, 20, 0, 2 * Math.PI); wtx.stroke();

const floorTexture = document.createElement('canvas');
floorTexture.width = floorTexture.height = 64;
const ftx = floorTexture.getContext('2d');
ftx.fillStyle = "#232323"; ftx.fillRect(0, 0, 64, 64);
ftx.fillStyle = "#282828";
for (let i = 0; i < 90; i++) {
  ftx.fillRect(Math.random() * 64, Math.random() * 64, 4, 1);
}

// Generate a starfield sky
const skyTexture = document.createElement('canvas');
skyTexture.width = W; skyTexture.height = H / 3;
const skyCtx = skyTexture.getContext('2d');
skyCtx.fillStyle = "#010014";
skyCtx.fillRect(0, 0, W, H / 3);
for (let i = 0; i < 220; i++) {
  const sx = Math.random() * W, sy = Math.random() * skyTexture.height;
  const starColor = `rgba(${200 + Math.random() * 55},${200 + Math.random() * 55},255,${0.5 + Math.random() * 0.5})`;
  skyCtx.fillStyle = starColor;
  skyCtx.beginPath();
  skyCtx.arc(sx, sy, Math.random() * 1.3 + 0.3, 0, 2 * Math.PI);
  skyCtx.fill();
}

function generateMaze(w, h) {
  // Recursive backtracker for perfect maze
  let maze = Array.from({ length: h }, () => Array(w).fill(1));
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
  function carve(cx, cy) {
    maze[cy][cx] = 0;
    let dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    shuffle(dirs);
    for (let [dx, dy] of dirs) {
      let nx = cx + dx * 2, ny = cy + dy * 2;
      if (ny >= 1 && ny < h - 1 && nx >= 1 && nx < w - 1 && maze[ny][nx] === 1) {
        maze[cy + dy][cx + dx] = 0;
        carve(nx, ny);
      }
    }
  }
  carve(1, 1);
  maze[1][1] = 0;
  maze[h - 2][w - 2] = 0; // exit
  return maze;
}

function movePlayer() {
  let dx = Math.cos(player.angle);
  let dy = Math.sin(player.angle);
  // Forward/Backward
  if (keys['w'] || keys['arrowup']) {
    let nx = player.x + dx * player.moveSpeed;
    let ny = player.y + dy * player.moveSpeed;
    if (maze[Math.floor(ny)][Math.floor(nx)] === 0) { player.x = nx; player.y = ny; }
  }
  if (keys['s'] || keys['arrowdown']) {
    let nx = player.x - dx * player.moveSpeed;
    let ny = player.y - dy * player.moveSpeed;
    if (maze[Math.floor(ny)][Math.floor(nx)] === 0) { player.x = nx; player.y = ny; }
  }
  // Strafe left/right
  let pdx = Math.cos(player.angle + Math.PI / 2);
  let pdy = Math.sin(player.angle + Math.PI / 2);
  if (keys['a'] || keys['arrowleft']) {
    let nx = player.x - pdx * player.moveSpeed * 0.7;
    let ny = player.y - pdy * player.moveSpeed * 0.7;
    if (maze[Math.floor(ny)][Math.floor(nx)] === 0) { player.x = nx; player.y = ny; }
  }
  if (keys['d'] || keys['arrowright']) {
    let nx = player.x + pdx * player.moveSpeed * 0.7;
    let ny = player.y + pdy * player.moveSpeed * 0.7;
    if (maze[Math.floor(ny)][Math.floor(nx)] === 0) { player.x = nx; player.y = ny; }
  }
}

function raycast() {
  // Draw sky (starfield)
  let skyX = Math.floor((player.angle % (2 * Math.PI)) / (2 * Math.PI) * W);
  ctx.drawImage(skyTexture, (skyX + W) % W, 0, W - (skyX + W) % W, H / 3, 0, 0, W - (skyX + W) % W, H / 3);
  ctx.drawImage(skyTexture, 0, 0, (skyX + W) % W, H / 3, W - (skyX + W) % W, 0, (skyX + W) % W, H / 3);

  for (let col = 0; col < W; col++) {
    let rayAngle = player.angle - player.fov / 2 + player.fov * col / W;
    let dist = 0, hit = false, hx = 0, hy = 0, side = 0;
    let dx = Math.cos(rayAngle), dy = Math.sin(rayAngle);
    while (!hit && dist < 24) {
      dist += 0.01;
      let tx = player.x + dx * dist;
      let ty = player.y + dy * dist;
      if (maze[Math.floor(ty)][Math.floor(tx)] === 1) {
        hit = true;
        hx = tx; hy = ty;
        side = Math.abs(Math.floor(tx) - tx) < Math.abs(Math.floor(ty) - ty) ? 0 : 1;
      }
    }
    if (hit) {
      let wallH = Math.min(H, H / (dist * Math.cos(rayAngle - player.angle)));
      let shade = Math.max(0, 0.5 + 0.3 * Math.exp(-dist / 6)); // haze/fog
      // Wall texture x
      let tx = side ? hx % 1 : hy % 1;
      tx = Math.floor(tx * 64);
      for (let y = 0; y < wallH; y++) {
        let ty = Math.floor((y / wallH) * 64);
        let color = wtx.getImageData(tx, ty, 1, 1).data;
        // Blend with fog (blue-ish for horror haze)
        let fog = [20, 22, 32];
        let fogAmount = dist / 15;
        let r = color[0] * shade * (1 - fogAmount) + fog[0] * fogAmount;
        let g = color[1] * shade * (1 - fogAmount) + fog[1] * fogAmount;
        let b = color[2] * shade * (1 - fogAmount) + fog[2] * fogAmount;
        ctx.fillStyle = `rgb(${r|0},${g|0},${b|0})`;
        ctx.fillRect(col, H / 2 - wallH / 2 + y, 1, 1);
      }
      // Floor
      for (let y = H / 2 + wallH / 2; y < H; y++) {
        let floorDist = H / (2 * (y - H / 2));
        let fx = player.x + dx * floorDist;
        let fy = player.y + dy * floorDist;
        if (maze[Math.floor(fy)][Math.floor(fx)] === 0) {
          let tx = Math.floor((fx % 1) * 64);
          let ty = Math.floor((fy % 1) * 64);
          let color = ftx.getImageData(tx, ty, 1, 1).data;
          let floorShade = Math.max(0, 0.7 - floorDist / 22);
          // Blend with fog
          let fog = [20, 22, 32];
          let fogAmount = floorDist / 20;
          let r = color[0] * floorShade * (1 - fogAmount) + fog[0] * fogAmount;
          let g = color[1] * floorShade * (1 - fogAmount) + fog[1] * fogAmount;
          let b = color[2] * floorShade * (1 - fogAmount) + fog[2] * fogAmount;
          ctx.fillStyle = `rgb(${r|0},${g|0},${b|0})`;
          ctx.fillRect(col, y, 1, 1);
        }
      }
    }
  }
}

function loop() {
  movePlayer();
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, W, H);
  raycast();
  requestAnimationFrame(loop);
}
loop();
