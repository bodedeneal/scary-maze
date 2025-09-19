// --- Initial Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create a floor
const geometry = new THREE.PlaneGeometry(50, 50);
const material = new THREE.MeshBasicMaterial({ color: 0x888888, side: THREE.DoubleSide });
const floor = new THREE.Mesh(geometry, material);
floor.rotation.x = Math.PI / 2;
scene.add(floor);

// --- Wall Creation ---
const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x555555 });
const wallHeight = 5;

// Create the left part of the wall
const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(10, wallHeight, 1), wallMaterial);
wallLeft.position.set(-5, wallHeight / 2, -10);
scene.add(wallLeft);

// Create the right part of the wall
const wallRight = new THREE.Mesh(new THREE.BoxGeometry(10, wallHeight, 1), wallMaterial);
wallRight.position.set(5, wallHeight / 2, -10);
scene.add(wallRight);

// Create the central movable part of the wall
const wallCenter = new THREE.Mesh(new THREE.BoxGeometry(5, wallHeight, 1), wallMaterial);
wallCenter.position.set(0, wallHeight / 2, -10);
scene.add(wallCenter);
let wallOpen = false;

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

// --- Player Movement Logic ---
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

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
            if (canJump === true) velocity.y += 10;
            canJump = false;
            break;
        case 'KeyE':
            // Check if player is near the wall before opening
            const distance = camera.position.distanceTo(wallCenter.position);
            if (distance < 5) {
                wallOpen = !wallOpen; // Toggle the wall state
                if (wallOpen) {
                    // Animate the wall to open
                    new TWEEN.Tween(wallCenter.position)
                        .to({ y: wallHeight + 5 }, 1000)
                        .easing(TWEEN.Easing.Quadratic.Out)
                        .start();
                } else {
                    // Animate the wall to close
                    new TWEEN.Tween(wallCenter.position)
                        .to({ y: wallHeight / 2 }, 1000)
                        .easing(TWEEN.Easing.Quadratic.Out)
                        .start();
                }
            }
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

        if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);
        controls.getObject().position.y += (velocity.y * delta);

        if (controls.getObject().position.y < 1) {
            velocity.y = 0;
            controls.getObject().position.y = 1;
            canJump = true;
        }
    }

    TWEEN.update(); // Update the tween animation
    renderer.render(scene, camera);
    prevTime = time;
};

animate();

// --- Handle Window Resizing ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
