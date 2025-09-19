// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create a basic "map" object (a floor)
const geometry = new THREE.PlaneGeometry(50, 50);
const material = new THREE.MeshBasicMaterial({ color: 0x888888, side: THREE.DoubleSide });
const floor = new THREE.Mesh(geometry, material);
floor.rotation.x = Math.PI / 2; // Rotate the plane to be horizontal
scene.add(floor);

// Position the camera
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
