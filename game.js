// --- Initial Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Maze Generation Parameters ---
const MAZE_SIZE = 21; // Must be an odd number
const CELL_SIZE = 10; // Wider path spacing
const WALL_HEIGHT = 100; // Much taller walls

// --- Game Variables ---
let wallMaterial;
const walls = []; // Store wall meshes for collision detection
const wallHitboxes = []; // Store wall hitboxes for collision detection
const DEBUG_HITBOXES = false; // Set to true to see hitboxes

// --- Load Brick Texture and Setup Scene ---
const textureLoader = new THREE.TextureLoader();
textureLoader.load('brick.jpg',
    // onLoad callback
    function (texture) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(0.5, 0.5);
        wallMaterial = new THREE.MeshBasicMaterial({ map: texture });
        createGame();
    },
    // onError callback
    function () {
        console.error('An error happened while loading the texture. Using default material.');
        wallMaterial = new THREE.MeshBasicMaterial({ color: 0x555555 });
        createGame();
    }
);

function createGame() {
    // --- Maze Generation Algorithm (Randomized DFS) ---
    function generateMaze(size) {
        const maze = new Array(size).fill(0).map(() => new Array(size).fill(1));
        const stack = [];
        const startX = 1;
        const startY = 1;

        function carvePath(x, y) {
            maze[y][x] = 0;
            const directions = [[0, -2], [0, 2], [-2, 0], [2, 0]].sort(() => Math.random() - 0.5);

            for (const [dx, dy] of directions) {
                const nextX = x + dx;
                const nextY = y + dy;

                if (nextX > 0 && nextX < size - 1 && nextY > 0 && nextY < size - 1 && maze[nextY][nextX] === 1) {
                    maze[y + dy / 2][x + dx / 2] = 0;
                    carvePath(nextX, nextY);
                }
            }
        }
        carvePath(startX, startY);
        return maze;
    }

    // --- Build Maze Geometry and Hitboxes ---
    function createMazeMesh(maze) {
        const group = new THREE.Group();
        const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
        const totalSize = MAZE_SIZE * CELL_SIZE;

        // Create the floor
        const floorGeometry = new THREE.PlaneGeometry(totalSize, totalSize);
        const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.position.y = -WALL_HEIGHT / 2;
        group.add(floorMesh);

        // Create the goal
        const goalSize = CELL_SIZE * 0.8;
        const goalGeometry = new THREE.BoxGeometry(goalSize, goalSize / 2, goalSize);
        const goalMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const goalMesh = new THREE.Mesh(goalGeometry, goalMaterial);
        goalMesh.position.set(0, -WALL_HEIGHT / 4, 0);
        group.add(goalMesh);

        // Create walls and hitboxes
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
                    walls.push(wallMesh); // Store wall mesh

                    // Create and store wall hitbox
                    const wallHitbox = new THREE.Box3().setFromObject(wallMesh);
                    wallHitboxes.push(wallHitbox);

                    if (DEBUG_HITBOXES) {
                        const helper = new THREE.Box3Helper(wallHitbox, 0xffff00);
                        scene.add(helper);
                    }
                }
            }
        }
        return group;
    }

    const generatedMaze = generateMaze(MAZE_SIZE);
    const mazeMesh = createMazeMesh(generatedMaze);
    scene.add(mazeMesh);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0x111111);
    scene.add(ambientLight);
    const flashlight = new THREE.SpotLight(0xffffff, 1, 100, Math.PI / 6, 0.5);
    flashlight.position.set(0, 0, 0);
    flashlight.target.position.set(0, 0, -1);
    camera.add(flashlight);
    scene.add(camera);

    // --- PointerLockControls Setup ---
    const controls = new THREE.PointerLockControls(camera, renderer.domElement);
    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');
    instructions.addEventListener('click', () => controls.lock(), false);
    controls.addEventListener('lock', () => { instructions.style.display = 'none'; blocker.style.display = 'none'; });
    controls.addEventListener('unlock', () => { blocker.style.display = 'block'; instructions.style.display = ''; });

    // --- Player Movement and Collision Logic ---
    let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, canJump = false;
    const velocity = new THREE.Vector3(), direction = new THREE.Vector3();
    const playerSpeed = 100.0, jumpHeight = 30;
    const playerHitbox = new THREE.Box3();
    const playerHeight = 2;

    const onKeyDown = function (event) {
        switch (event.code) {
            case 'ArrowUp': case 'KeyW': moveForward = true; break;
            case 'ArrowLeft': case 'KeyA': moveLeft = true; break;
            case 'ArrowDown': case 'KeyS': moveBackward = true; break;
            case 'ArrowRight': case 'KeyD': moveRight = true; break;
            case 'Space': if (canJump) { velocity.y += jumpHeight; canJump = false; } break;
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

    // --- Animation Loop ---
    let prevTime = performance.now();
    const animate = function () {
        requestAnimationFrame(animate);
        const time = performance.now();
        const delta = (time - prevTime) / 1000;

        if (controls.isLocked) {
            velocity.x -= velocity.x * 10.0 * delta;
            velocity.z -= velocity.z * 10.0 * delta;
            velocity.y -= 9.8 * 10.0 * delta;

            direction.z = Number(moveForward) - Number(moveBackward);
            direction.x = Number(moveRight) - Number(moveLeft);
            direction.normalize();

            if (moveForward || moveBackward) velocity.z -= direction.z * playerSpeed * delta;
            if (moveLeft || moveRight) velocity.x -= direction.x * playerSpeed * delta;

            const oldPosition = camera.position.clone();
            controls.moveRight(-velocity.x * delta);
            controls.moveForward(-velocity.z * delta);
            controls.getObject().position.y += (velocity.y * delta);

            // Update player hitbox
            playerHitbox.setFromCenterAndSize(camera.position, new THREE.Vector3(1, playerHeight, 1));

            // Collision Detection
            for (const wallHitbox of wallHitboxes) {
                if (playerHitbox.intersectsBox(wallHitbox)) {
                    camera.position.copy(oldPosition);
                    break;
                }
            }
            
            // Ground check
            if (controls.getObject().position.y < WALL_HEIGHT / 2 + 1) {
                velocity.y = 0;
                controls.getObject().position.y = WALL_HEIGHT / 2 + 1;
                canJump = true;
            }
        }
        renderer.render(scene, camera);
        prevTime = time;
    };

    // --- Game Start ---
    let startX, startZ;
    do {
        startX = Math.floor(Math.random() * (MAZE_SIZE - 2)) + 1;
        startZ = Math.floor(Math.random() * (MAZE_SIZE - 2)) + 1;
    } while (generatedMaze[startZ][startX] === 1);
    camera.position.set(
        (startX - MAZE_SIZE / 2) * CELL_SIZE + CELL_SIZE / 2,
        WALL_HEIGHT / 2 + 1,
        (startZ - MAZE_SIZE / 2) * CELL_SIZE + CELL_SIZE / 2
    );
    
    animate();
}

// --- Handle Window Resizing ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
