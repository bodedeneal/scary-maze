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
const WALL_THICKNESS = 1;

// --- Load Brick Texture and Setup Scene ---
const textureLoader = new THREE.TextureLoader();
let brickTexture;
let wallMaterial;
let walls = []; // Store wall meshes for collision detection

textureLoader.load('brick.jpg',
    // onLoad callback
    function (texture) {
        brickTexture = texture;
        brickTexture.wrapS = THREE.RepeatWrapping;
        brickTexture.wrapT = THREE.RepeatWrapping;
        brickTexture.repeat.set(0.5, 0.5); // Make texture larger
        wallMaterial = new THREE.MeshBasicMaterial({ map: brickTexture });
        createGame();
    },
    // onProgress callback
    undefined,
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
            const directions = [[0, -2], [-2, 0], [0, 2], [2, 0]].sort(() => Math.random() - 0.5);

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

    // --- Build Maze Geometry ---
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
                    walls.push(wallMesh);
                }
            }
        }
        return group;
    }

    const generatedMaze = generateMaze(MAZE_SIZE);
    const mazeMesh = createMazeMesh(generatedMaze);
    scene.add(mazeMesh);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0x111111); // Low ambient light
    scene.add(ambientLight);

    const flashlight = new THREE.SpotLight(0xffffff, 1, 100, Math.PI / 6, 0.5);
    flashlight.position.set(0, 0, 0); // Initially at the origin
    flashlight.target.position.set(0, 0, -1); // Point straight ahead
    camera.add(flashlight); // Attach to camera for a movable flashlight
    scene.add(camera);

    // --- PointerLockControls Setup ---
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

    // --- Player Movement Logic with Collision ---
    let moveForward = false;
    let moveBackward = false;
    let moveLeft = false;
    let moveRight = false;
    let canJump = false;

    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const playerSpeed = 100.0;
    const jumpHeight = 30;
    const playerBoundingBox = new THREE.Box3();
    const playerHeight = 2; // For collision purposes

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
            velocity.y -= 9.8 * 10.0 * delta; // Gravity

            direction.z = Number(moveForward) - Number(moveBackward);
            direction.x = Number(moveRight) - Number(moveLeft);
            direction.normalize();

            if (moveForward || moveBackward) velocity.z -= direction.z * playerSpeed * delta;
            if (moveLeft || moveRight) velocity.x -= direction.x * playerSpeed * delta;

            const oldPosition = camera.position.clone();
            controls.moveRight(-velocity.x * delta);
            controls.moveForward(-velocity.z * delta);
            controls.getObject().position.y += (velocity.y * delta);

            // Collision Detection
            playerBoundingBox.setFromCenterAndSize(camera.position, new THREE.Vector3(1, playerHeight, 1));
            for (let i = 0; i < walls.length; i++) {
                const wallBoundingBox = new THREE.Box3().setFromObject(walls[i]);
                if (playerBoundingBox.intersectsBox(wallBoundingBox)) {
                    camera.position.copy(oldPosition); // Revert to old position on collision
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

    // --- Game Logic ---
    // Start player at a random valid cell within the maze
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
