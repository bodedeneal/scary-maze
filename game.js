// --- Initial Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Maze Generation Parameters ---
const MAZE_SIZE = 21; // Must be an odd number
const CELL_SIZE = 5;
const WALL_HEIGHT = 5;

// --- Maze Generation Algorithm (Randomized DFS) ---
function generateMaze(size) {
    const maze = new Array(size).fill(0).map(() => new Array(size).fill(1));
    function carvePath(x, y) {
        maze[y][x] = 0;
        const directions = [[0, -2],, [-2, 0],].sort(() => Math.random() - 0.5);
        for (const [dx, dy] of directions) {
            const nextX = x + dx;
            const nextY = y + dy;
            if (nextX > 0 && nextX < size && nextY > 0 && nextY < size && maze[nextY][nextX] === 1) {
                maze[y + dy / 2][x + dx / 2] = 0;
                carvePath(nextX, nextY);
            }
        }
    }
    carvePath(1, 1);
    return maze;
}

// --- Build Maze Geometry ---
const walls = [];
function createMazeMesh(maze) {
    const group = new THREE.Group();
    const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x555555 });
    const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
    const totalSize = MAZE_SIZE * CELL_SIZE;

    // Create the floor
    const floorGeometry = new THREE.PlaneGeometry(totalSize, totalSize);
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -WALL_HEIGHT / 2;
    group.add(floorMesh);

    // Create the goal in the center
    const goalSize = CELL_SIZE * 0.8;
    const goalGeometry = new THREE.BoxGeometry(goalSize, 0.1, goalSize);
    const goalMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const goalMesh = new THREE.Mesh(goalGeometry, goalMaterial);
    goalMesh.position.set(0, -WALL_HEIGHT / 2 + 0.1, 0);
    group.add(goalMesh);

    // Create walls based on the maze data
    for (let y = 0; y < MAZE_SIZE; y++) {
        for (let x = 0; x < MAZE_SIZE; x++) {
            if (maze[y][x] === 1) {
                const wallGeometry = new THREE.BoxGeometry(CELL_SIZE, WALL_HEIGHT, CELL_SIZE);
                const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
                wallMesh.position.set(
                    (x - MAZE_SIZE / 2) * CELL_SIZE + CELL_SIZE / 2,
                    0,
                    (y - MAZE_SIZE / 2) * CELL_SIZE + CELL_SIZE / 2
                );
                group.add(wallMesh);
                walls.push(wallMesh);
            }
        }
    }
    return { group, walls };
}

const generatedMaze = generateMaze(MAZE_SIZE);
const { group: mazeMesh } = createMazeMesh(generatedMaze);
scene.add(mazeMesh);

// --- Player Controls and Movement ---
let controls;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const playerSpeed = 100.0;
const jumpHeight = 30;

const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');

// Add event listener directly to the instructions element
instructions.addEventListener('click', function () {
    controls = new THREE.PointerLockControls(camera, renderer.domElement);
    controls.lock();
}, false);

// Event listeners for pointer lock status changes
let controlsEnabled = false;
instructions.addEventListener('click', function () {
    controls.lock();
}, false);

controls.addEventListener('lock', function () {
    controlsEnabled = true;
    instructions.style.display = 'none';
    blocker.style.display = 'none';
});
controls.addEventListener('unlock', function () {
    controlsEnabled = false;
    blocker.style.display = 'block';
    instructions.style.display = '';
});

// Keyboard event listeners for movement
const onKeyDown = function (event) {
    if (controlsEnabled) {
        switch (event.code) {
            case 'ArrowUp': case 'KeyW': moveForward = true; break;
            case 'ArrowLeft': case 'KeyA': moveLeft = true; break;
            case 'ArrowDown': case 'KeyS': moveBackward = true; break;
            case 'ArrowRight': case 'KeyD': moveRight = true; break;
            case 'Space': if (canJump) velocity.y += jumpHeight; canJump = false; break;
        }
    }
};

const onKeyUp = function (event) {
    switch (event.code) {
        case 'ArrowUp': case 'KeyW': moveForward = false; break;
        case 'ArrowLeft': case 'KeyA': moveLeft = false; break;
        case 'ArrowDown': case 'KeyS': moveBackward = false; break;
        case 'ArrowRight': case 'KeyD': moveRight = false; break;
    }
};

document.addEventListener('keydown', onKeyDown, false);
document.addEventListener('keyup', onKeyUp, false);

// --- Collision Detection (simplified) ---
const raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 10);
const playerRadius = 0.5;

function checkCollisions(delta) {
    const playerPosition = controls.getObject().position;
    const playerDirection = controls.getDirection(new THREE.Vector3());

    const raycasterForward = new THREE.Raycaster(playerPosition, playerDirection, 0, playerRadius + 0.1);
    const intersectsForward = raycasterForward.intersectObjects(walls);

    if (intersectsForward.length > 0) {
        // Stop movement if colliding
        velocity.z = 0;
    }

    const raycasterBack = new THREE.Raycaster(playerPosition, playerDirection.clone().negate(), 0, playerRadius + 0.1);
    const intersectsBack = raycasterBack.intersectObjects(walls);

    if (intersectsBack.length > 0) {
        velocity.z = 0;
    }

    const raycasterRight = new THREE.Raycaster(playerPosition, new THREE.Vector3(playerDirection.z, 0, -playerDirection.x), 0, playerRadius + 0.1);
    const intersectsRight = raycasterRight.intersectObjects(walls);
    
    if (intersectsRight.length > 0) {
        velocity.x = 0;
    }

    const raycasterLeft = new THREE.Raycaster(playerPosition, new THREE.Vector3(-playerDirection.z, 0, playerDirection.x), 0, playerRadius + 0.1);
    const intersectsLeft = raycasterLeft.intersectObjects(walls);

    if (intersectsLeft.length > 0) {
        velocity.x = 0;
    }
}


// --- Animation Loop ---
let prevTime = performance.now();
const animate = function () {
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    if (controls && controlsEnabled) {
        // Apply friction
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= 9.8 * 10.0 * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        // Apply movement
        if (moveForward || moveBackward) velocity.z -= direction.z * playerSpeed * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * playerSpeed * delta;

        // Perform basic collision detection
        checkCollisions(delta);

        // Apply final velocity to position
        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);
        controls.getObject().position.y += (velocity.y * delta);

        // Reset player to ground if falling too far
        if (controls.getObject().position.y < WALL_HEIGHT / 2 + 1) {
            velocity.y = 0;
            controls.getObject().position.y = WALL_HEIGHT / 2 + 1;
            canJump = true;
        }
    }

    renderer.render(scene, camera);
    prevTime = time;
};

// Initial position and start animation
camera.position.set(0, WALL_HEIGHT / 2 + 1, MAZE_SIZE * CELL_SIZE / 2 + CELL_SIZE);
animate();

// --- Handle Window Resizing ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


