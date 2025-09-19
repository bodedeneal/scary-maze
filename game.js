// --- Initial Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Game Settings ---
const MAZE_SIZE = 21; // Must be an odd number
const PLAYER_WIDTH = 2.5;
const PLAYER_HEIGHT = 2; // Player's effective height
const CELL_SIZE = PLAYER_WIDTH * 2;
const WALL_HEIGHT = PLAYER_HEIGHT * 2;

// --- Lights (Flashlight) ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);

const spotLight = new THREE.SpotLight(0xffffff, 1.5, 50, Math.PI / 8, 0.5, 2);
spotLight.position.set(0, 0, 0);
spotLight.target.position.set(0, 0, -1);
camera.add(spotLight);
camera.add(spotLight.target);
scene.add(camera);

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
    const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x555555 });
    const floorMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const totalSize = MAZE_SIZE * CELL_SIZE;

    // Create the floor
    const floorGeometry = new THREE.PlaneGeometry(totalSize, totalSize);
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -(WALL_HEIGHT / 2);
    group.add(floorMesh);

    // Create the goal in the center
    const goalSize = CELL_SIZE * 0.8;
    const goalGeometry = new THREE.BoxGeometry(goalSize, 0.1, goalSize);
    const goalMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const goalMesh = new THREE.Mesh(goalGeometry, goalMaterial);
    goalMesh.position.set(0, -(WALL_HEIGHT / 2) + 0.1, 0);
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
let controls = new THREE.PointerLockControls(camera, renderer.domElement);
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const playerSpeed = 100.0;
const jumpHeight = 30;

// Lock pointer on first user interaction
document.body.addEventListener('click', function () {
    controls.lock();
}, false);

// Event listeners for movement
const onKeyDown = function (event) {
    if (controls.isLocked) {
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
    if (controls.isLocked) {
        switch (event.code) {
            case 'ArrowUp': case 'KeyW': moveForward = false; break;
            case 'ArrowLeft': case 'KeyA': moveLeft = false; break;
            case 'ArrowDown': case 'KeyS': moveBackward = false; break;
            case 'ArrowRight': case 'KeyD': moveRight = false; break;
        }
    }
};

document.addEventListener('keydown', onKeyDown, false);
document.addEventListener('keyup', onKeyUp, false);

// --- Collision Detection (Simplified Raycasting) ---
const raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 10);

function checkCollisions() {
    if (!controls) return;
    const playerPosition = controls.getObject().position;
    const playerDirection = controls.getDirection(new THREE.Vector3());
    const playerUp = camera.up;

    // Check forward/backward collisions
    const forwardRaycaster = new THREE.Raycaster(playerPosition, playerDirection, 0, CELL_SIZE / 2);
    if (forwardRaycaster.intersectObjects(walls).length > 0) {
        velocity.z = 0;
    }
    const backwardRaycaster = new THREE.Raycaster(playerPosition, playerDirection.clone().negate(), 0, CELL_SIZE / 2);
    if (backwardRaycaster.intersectObjects(walls).length > 0) {
        velocity.z = 0;
    }

    // Check left/right collisions
    const rightRaycaster = new THREE.Raycaster(playerPosition, playerDirection.clone().cross(playerUp), 0, CELL_SIZE / 2);
    if (rightRaycaster.intersectObjects(walls).length > 0) {
        velocity.x = 0;
    }
    const leftRaycaster = new THREE.Raycaster(playerPosition, playerDirection.clone().cross(playerUp).negate(), 0, CELL_SIZE / 2);
    if (leftRaycaster.intersectObjects(walls).length > 0) {
        velocity.x = 0;
    }
}


// --- Animation Loop ---
let prevTime = performance.now();
const animate = function () {
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    if (controls && controls.isLocked) {
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

        // Perform collision detection
        checkCollisions();

        // Apply final velocity to position
        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);
        controls.getObject().position.y += (velocity.y * delta);

        // Reset player to ground if falling
        if (controls.getObject().position.y < WALL_HEIGHT / 2 + PLAYER_HEIGHT) {
            velocity.y = 0;
            controls.getObject().position.y = WALL_HEIGHT / 2 + PLAYER_HEIGHT;
            canJump = true;
        }
    }

    renderer.render(scene, camera);
    prevTime = time;
};

// Initial position and start animation
camera.position.set(0, WALL_HEIGHT / 2 + PLAYER_HEIGHT, MAZE_SIZE * CELL_SIZE / 2 + CELL_SIZE);
animate();

// --- Handle Window Resizing ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
