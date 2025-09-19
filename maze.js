// Simple 2D Raycasting Maze Engine with Haze/Fog Effect

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

// Maze: 0 = empty, 1 = wall
const maze = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,1,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,1,1,1,0,1],
  [1,0,1,0,0,1,0,0,0,0,1,0,1],
  [1,0,1,0,1,1,1,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,1],
  [1,1,1,1,1,1,0,1,1,1,1,1,1],
  [1,0,0,0,0,1,0,0,0,0,1,0,1],
  [1,0,1,1,0,1,1,1,1,0,1,0,1],
  [1,0,1,0,0,0,0,0,1,0,1,0,1],
  [1,0,1,0,1,1,1,0,1,0,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// Player state
let player = {
  x: 2.5, // starting position
  y: 2.5,
  angle: 0, // look direction in radians
  fov: Math.PI/3 // field of view
};

document.addEventListener('keydown', e => {
  const speed = 0.1;
  const rotSpeed = 0.05;
  if (e.key === 'ArrowUp' || e.key === 'w') {
    let nx = player.x + Math.cos(player.angle)*speed;
    let ny = player.y + Math.sin(player.angle)*speed;
    if (maze[Math.floor(ny)][Math.floor(nx)] === 0) { player.x = nx; player.y = ny; }
  }
  if (e.key === 'ArrowDown' || e.key === 's') {
    let nx = player.x - Math.cos(player.angle)*speed;
    let ny = player.y - Math.sin(player.angle)*speed;
    if (maze[Math.floor(ny)][Math.floor(nx)] === 0) { player.x = nx; player.y = ny; }
  }
  if (e.key === 'ArrowLeft' || e.key === 'a') player.angle -= rotSpeed;
  if (e.key === 'ArrowRight' || e.key === 'd') player.angle += rotSpeed;
});

const wallTexture = document.createElement('canvas');
wallTexture.width = wallTexture.height = 64;
const wtx = wallTexture.getContext('2d');
// Simple spooky texture
wtx.fillStyle="#333"; wtx.fillRect(0,0,64,64);
for(let y=0;y<64;y+=8) {
  wtx.strokeStyle="#4d4d4d";
  wtx.beginPath(); wtx.moveTo(0,y); wtx.lineTo(64,y); wtx.stroke();
}
wtx.strokeStyle="#444";
wtx.beginPath(); wtx.arc(32,32,20,0,2*Math.PI); wtx.stroke();

const floorTexture = document.createElement('canvas');
floorTexture.width = floorTexture.height = 64;
const ftx = floorTexture.getContext('2d');
ftx.fillStyle = "#222"; ftx.fillRect(0,0,64,64);
ftx.fillStyle = "#232323"; for(let i=0;i<128;i++) {
  ftx.fillRect(Math.random()*64,Math.random()*64,2,2);
}

function raycast() {
  for(let col=0;col<W;col++) {
    // Angle for this column
    let rayAngle = player.angle - player.fov/2 + player.fov*col/W;
    // Cast ray
    let dist = 0, hit = false, hx=0, hy=0, side=0;
    let dx = Math.cos(rayAngle), dy = Math.sin(rayAngle);
    while (!hit && dist < 16) {
      dist += 0.01;
      let tx = player.x + dx*dist;
      let ty = player.y + dy*dist;
      if (maze[Math.floor(ty)][Math.floor(tx)] === 1) {
        hit = true;
        hx = tx; hy = ty;
        // For texture mapping
        side = Math.abs(Math.floor(tx)-tx) < Math.abs(Math.floor(ty)-ty) ? 0 : 1;
      }
    }
    if (hit) {
      // Wall height
      let wallH = Math.min(H, H/(dist*Math.cos(rayAngle-player.angle))); // remove fisheye
      let shade = Math.max(0, 1 - dist/8); // haze/fog
      // Wall texture x
      let tx = side ? hx%1 : hy%1;
      tx = Math.floor(tx*64);
      for(let y=0; y<wallH; y++) {
        let ty = Math.floor((y/wallH)*64);
        let color = wtx.getImageData(tx,ty,1,1).data;
        ctx.fillStyle = `rgba(${color[0]*shade},${color[1]*shade},${color[2]*shade},1)`;
        ctx.fillRect(col, H/2-wallH/2+y, 1, 1);
      }
      // Floor
      for(let y=H/2+wallH/2; y<H; y++) {
        // Simple floor mapping
        let floorDist = H/(2*(y-H/2));
        let fx = player.x + dx*floorDist;
        let fy = player.y + dy*floorDist;
        if (maze[Math.floor(fy)][Math.floor(fx)]===0) {
          let tx = Math.floor((fx%1)*64);
          let ty = Math.floor((fy%1)*64);
          let color = ftx.getImageData(tx,ty,1,1).data;
          let floorShade = Math.max(0, 1-floorDist/12);
          ctx.fillStyle = `rgba(${color[0]*floorShade},${color[1]*floorShade},${color[2]*floorShade},1)`;
          ctx.fillRect(col, y, 1, 1);
        }
      }
    }
  }
}

function loop() {
  ctx.fillStyle="#111";
  ctx.fillRect(0,0,W,H);
  raycast();
  requestAnimationFrame(loop);
}
loop();
