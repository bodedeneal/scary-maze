// --- Initial Setup (from previous example) ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create a basic "map" object (a floor)
const geometry = new THREE.PlaneGeometry(50, 50);
const material = new THREE.MeshBasicMaterial({ color: 0x888888, side: THREE.DoubleSide });
const floor = new THREE.Mesh(geometry, material);
floor.rotation.x = Math.PI / 2;
scene.add(floor);

// Position the camera
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

// --- First Person Controls ---
let controls = null;
let isSitting = false;
let sitTargetPosition = null;

// The standard Three.js FirstPersonControls for navigation
function initControls() {
    controls = new THREE.FirstPersonControls(camera, renderer.domElement);
    controls.lookSpeed = 0.05;
    controls.movementSpeed = 5;
    controls.lookVertical = true;
}

// --- Couch Model Loading and Interaction ---
function loadCouch() {
    const loader = new THREE.GLTFLoader();
    loader.load('path/to/your/couch.glb', function(gltf) {
        const couch = gltf.scene;
        couch.scale.set(0.1, 0.1, 0.1); // Adjust scale as needed
        couch.position.set(5, 0, 0); // Position the couch
        scene.add(couch);

        // Define a "sit target" point in world space, just above the couch seat
        sitTargetPosition = new THREE.Vector3(couch.position.x, couch.position.y + 1, couch.position.z);
    });
}

// Check for interaction
function checkInteraction() {
    // Simple check: if the player is close enough to the couch and presses 'E'
    const distanceToCouch = camera.position.distanceTo(sitTargetPosition);
    if (distanceToCouch < 2 && !isSitting) {
        // You would display a prompt here, e.g., "Press 'E' to sit."
        console.log("You can sit here. Press 'E' to sit.");
    }
}

// Handle key presses
window.addEventListener('keydown', (event) => {
    if (event.key === 'e' && sitTargetPosition && !isSitting) {
        const distanceToCouch = camera.position.distanceTo(sitTargetPosition);
        if (distanceToCouch < 2) {
            isSitting = true;
            controls.activeLook = false; // Disable looking around
            controls.movementSpeed = 0; // Disable movement
            
            // Move camera to the sitting position
            camera.position.set(sitTargetPosition.x, sitTargetPosition.y + 0.5, sitTargetPosition.z);
            
            console.log("Sitting down!");
        }
    } else if (event.key === 'e' && isSitting) {
        isSitting = false;
        controls.activeLook = true; // Re-enable controls
        controls.movementSpeed = 5;
        
        console.log("Getting up!");
    }
});

// --- Animation loop ---
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    if (controls) {
        controls.update(delta);
    }

    // Only check for interaction if not sitting
    if (!isSitting) {
        checkInteraction();
    }
    
    renderer.render(scene, camera);
}

// Run the game
initControls();
loadCouch();
animate();

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

