// --- Initial Setup (unchanged) ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Maze Generation Parameters ---
const MAZE_SIZE = 21; // Must be an odd number
const CELL_SIZE = 5;
const WALL_HEIGHT = 5;
const WALL_THICKNESS = 1;

// --- Maze Generation Algorithm (Randomized DFS) ---
function generateMaze(size) {
    const maze = new Array(size).fill(0).map(() => new Array(size).fill(1));
    const stack = [];
    const startX = 1;
    const startY = 1;

    function carvePath(x, y) {
        maze[y][x] = 0;
        const directions = [[0, 2], [0, -2], [2, 0], [-2, 0]].sort(() => Math.random() - 0.5);

        for (const [dx, dy] of directions) {
            const nextX = x + dx;
            const nextY = y + dy;

            if (nextX >= 0 && nextX < size && nextY >= 0 && nextY < size && maze[nextY][nextX] === 1) {
                maze[y + dy / 2][x + dx / 2] = 0;
                carvePath(nextX, nextY);
            }
        }
    }
    carvePath(startX, startY);
    return maze;
}

// --- Build Maze Geometry ---
function createMazeMesh(maze) {
    const group = new THREE.Group();
    const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x555555 });
    const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });

    const totalSize = MAZE_SIZE * CELL_SIZE;

    // Create the floor
    const floorGeometry = new THREE.PlaneGeometry(totalSize + CELL_SIZE, totalSize + CELL_SIZE);
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -WALL_HEIGHT / 2;
    group.add(floorMesh);

    // Create the goal in the center
    const goalSize = CELL_SIZE * 0.8;
    const goalGeometry = new THREE.BoxGeometry(goalSize, goalSize / 2, goalSize);
    const goalMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const goalMesh = new THREE.Mesh(goalGeometry, goalMaterial);
    goalMesh.position.set(0, -WALL_HEIGHT / 4, 0);
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
            }
        }
    }

    return group;
}

const generatedMaze = generateMaze(MAZE_SIZE);
const mazeMesh = createMazeMesh(generatedMaze);
scene.add(mazeMesh);

// --- PointerLockControls Setup (unchanged) ---
const controls = new THREE.PointerLockControls(camera, renderer.domElement);
const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');

instructions.addEventListener('click', function () {
    controls.lock();
}, false);

controls.addEventListener('lock', function () {
    instructions.style.display = 'none';
    blocker.style.display = 'none';
});

controls.addEventListener('unlock', function () {
    blocker.style.display = 'block';
    instructions.style.display = '';
});

// --- Player Movement Logic ---
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

// Adjust player speed and jump height here
const playerSpeed = 100.0;
const jumpHeight = 30;

// Keyboard event listeners
const onKeyDown = function (event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = true;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = true;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = true;
            break;
        case 'ArrowRight':
        case 'KeyD':
            moveRight = true;
            break;
        case 'Space':
            if (canJump === true) velocity.y += jumpHeight;
            canJump = false;
            break;
    }
};

const onKeyUp = function (event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = false;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = false;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = false;
            break;
        case 'ArrowRight':
        case 'KeyD':
            moveRight = false;
            break;
    }
};

document.addEventListener('keydown', onKeyDown, false);
document.addEventListener('keyup', onKeyUp, false);

// --- Animation Loop ---
let prevTime = performance.now();
const animate = function () {
    requestAnimationFrame(animate);

    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    if (controls.isLocked === true) {
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= 9.8 * 10.0 * delta; // standard gravity

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) velocity.z -= direction.z * playerSpeed * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * playerSpeed * delta;

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);
        controls.getObject().position.y += (velocity.y * delta);

        if (controls.getObject().position.y < WALL_HEIGHT / 2 + 1) {
            velocity.y = 0;
            controls.getObject().position.y = WALL_HEIGHT / 2 + 1;
            canJump = true;
        }
    }

    renderer.render(scene, camera);
    prevTime = time;
};

// Position the camera outside the maze at the start
camera.position.set(0, WALL_HEIGHT / 2 + 1, MAZE_SIZE * CELL_SIZE / 2 + CELL_SIZE);
animate();

// --- Handle Window Resizing (unchanged) ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

