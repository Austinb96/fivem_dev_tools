import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { toast } from '../../toast.svelte';
import { ModelLoader, type ModelData } from './yftloader';
import { getCurrentWindow, LogicalPosition } from '@tauri-apps/api/window';

export class Scene {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private orbit_controls: OrbitControls;
    private transform_controls: TransformControls;
    private model_loader: ModelLoader;
    private sceneRoot: THREE.Group;
    
    private models: THREE.Object3D[] = [];
    
    private moveSpeed = 0.01;
    private keys = {
        w: false,
        a: false,
        s: false,
        d: false,
        r: false,
        f: false,
        shift: false
    };
    private mouse_pos = new THREE.Vector2();
    private raycaster = new THREE.Raycaster();
    private selected_object: THREE.Object3D | null = null;
    
    constructor(container: HTMLElement) {
        
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        console.log("Creating scene");
        this.scene = new THREE.Scene();
        
        const sceneRoot = new THREE.Group();
        this.scene.add(sceneRoot);
        sceneRoot.rotation.x = -Math.PI / 2;
        
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            10000
        );
        this.camera.position.set(100, 100, 100);
        this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(this.renderer.domElement);
        
        this.orbit_controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbit_controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
        };
        this.orbit_controls.screenSpacePanning = true;  // Better panning
        this.orbit_controls.maxDistance = 5000;  // Max zoom out
        this.orbit_controls.minDistance = 0.1;   // Max zoom in
        this.orbit_controls.keyPanSpeed = 10;    // Faster keyboard pan
        this.orbit_controls.zoomSpeed = 1.5;     // Faster zoom
        this.orbit_controls.panSpeed = 1.5;      // Faster pan
        
        this.renderer.domElement.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click
                document.body.style.cursor = 'none';
            }
        });        
        this.renderer.domElement.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                document.body.style.cursor = 'auto';
                const window = getCurrentWindow();
                window.setCursorPosition(new LogicalPosition(this.mouse_pos.x, this.mouse_pos.y));
            }
        });
        
        this.renderer.domElement.addEventListener('mousemove', (e) => {
            if (document.body.style.cursor !== 'none') {
                this.mouse_pos.x = e.clientX;
                this.mouse_pos.y = e.clientY;
            }
        });
        
        this.renderer.domElement.addEventListener("mousedown", (e) => {
            if (document.body.style.cursor === 'none') return;
            if (e.button !== 2) return
            e.preventDefault();

            const rect = this.renderer.domElement.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

            const intersects = this.raycaster.intersectObjects(this.models, true);

            if (intersects.length > 0) {
                let rootObject = intersects[0].object;
                while (rootObject.parent && !this.models.includes(rootObject)) {
                    rootObject = rootObject.parent;
                }

                if (this.models.includes(rootObject)) {
                    this.select_object(rootObject);
                }
            } else {
                this.select_object(null);
            }
        });
        
        this.transform_controls = new TransformControls(this.camera, this.renderer.domElement);
        this.transform_controls.addEventListener('change', () => this.renderer.render(this.scene, this.camera));
        this.transform_controls.addEventListener('dragging-changed', (event) => {
            this.orbit_controls.enabled = !event.value;
        });
        
        const gizmo = this.transform_controls.getHelper();
        this.scene.add( gizmo );
        
        this.scene.background = new THREE.Color(0x1e1e2e);
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
        sceneRoot.add(ambientLight);
        
        this.sceneRoot = sceneRoot;
        
        this.animate();
        this.model_loader = new ModelLoader();
        console.log("Scene created");
    }
    
    public async load_model(file_path: string) {
        try {
            this.clear_models();
            const models: ModelData[] = await this.model_loader.load_model(file_path);
            for (const data of models) {
                // Add to scene root instead of scene directly
                this.sceneRoot.add(data.model);
                this.models.push(data.model);
                
                data.model.position.set(data.position.x, data.position.y, data.position.z);
                
                data.model.quaternion.set(
                    data.rotation.x,
                    data.rotation.y,
                    data.rotation.z,
                    data.rotation.w
                );
            }
            
            if (models.length > 0) {
                this.center_and_focus_obj(models[0].model);
            }
            
            return true;
        } catch(e) {
            toast.add({
                text: e.message,
                duration: 5000,
                type: 'error'
            })
            console.error(e);
        }
    }
    
    public clear_models(){
        for (const model of this.models) {
            this.scene.remove(model);
        }
        this.transform_controls.detach();
        this.models = [];
    }
    
    private handleKeyUp(event: KeyboardEvent) {
        switch (event.code) {
            case 'KeyW': this.keys.w = false; break;
            case 'KeyA': this.keys.a = false; break;
            case 'KeyS': this.keys.s = false; break;
            case 'KeyD': this.keys.d = false; break;
            case 'KeyR': this.keys.r = false; break;
            case 'KeyF': this.keys.f = false; break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.shift = false;
                break;
        }
    }
    
    private handleKeyDown(event: KeyboardEvent) {
        if (event.repeat) return;
        
        switch (event.code) {
            case 'KeyW': this.keys.w = true; break;
            case 'KeyA': this.keys.a = true; break;
            case 'KeyS': this.keys.s = true; break;
            case 'KeyD': this.keys.d = true; break;
            case 'KeyR': this.keys.r = true; break;
            case 'KeyF': this.keys.f = true; break;
            case 'ShiftLeft': 
            case 'ShiftRight':
                this.keys.shift = true;
                break;
        }
    }

    private updateMovement() {
        
        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();
        const up = new THREE.Vector3(0, 1, 0);
        
        this.camera.getWorldDirection(forward);
        right.crossVectors(forward, up).normalize();
        
        forward.y = 0;
        forward.normalize();

        const currentSpeed = this.keys.shift ? this.moveSpeed * 2 : this.moveSpeed;

        const movement = new THREE.Vector3();
        
        if (this.keys.w) movement.add(forward.multiplyScalar(currentSpeed));
        if (this.keys.s) movement.sub(forward.multiplyScalar(currentSpeed));
        if (this.keys.a) movement.sub(right.multiplyScalar(currentSpeed));
        if (this.keys.d) movement.add(right.multiplyScalar(currentSpeed));
        // Add vertical movement
        if (this.keys.f) movement.sub(up.multiplyScalar(currentSpeed));
        if (this.keys.r) movement.add(up.multiplyScalar(currentSpeed));

        if (movement.length() > 0) {
            this.camera.position.add(movement);
            this.orbit_controls.target.add(movement);
            this.orbit_controls.update();
        }
    }
    
    public set_movement_speed(speed: number) {
        console.log("Setting movement speed to", speed);
        this.moveSpeed = Math.max(0.01, Math.min(10, speed));
    }
    
    private animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.updateMovement();  // Add this line
        this.orbit_controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    public resize(width: number, height: number) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    private center_and_focus_obj(object: THREE.Object3D) {
        // Rotate the object to correct orientation
        // Calculate the bounding box of the object
        const boundingBox = new THREE.Box3().setFromObject(object);
        const center = boundingBox.getCenter(new THREE.Vector3());
        const size = boundingBox.getSize(new THREE.Vector3());
        
        // Get the largest dimension to determine camera distance
        const maxDim = Math.max(size.x, size.y, size.z);
        const cameraDistance = maxDim * 1.5; // Adjust this multiplier to change zoom level
        
        // Position camera
        this.camera.position.set(
            center.x + cameraDistance * 0.5, // X position
            center.y + cameraDistance * 0.3, // Y position
            center.z + cameraDistance * -0.1  // Z position
        );
        
        // Make camera look at center of object
        this.camera.lookAt(center);
        
        // Update camera and controls
        this.orbit_controls.target.copy(center);
        this.camera.updateProjectionMatrix();
        this.orbit_controls.update();
    }

    private select_object(object: THREE.Object3D | null) {
        // Deselect previous object
        if (this.selected_object) {
            // Optional: Add deselection visual feedback here
        }

        this.selected_object = object;

        if (object) {
            this.transform_controls.attach(object);
        } else {
            this.transform_controls.detach();
        }
    }

    // Add a method to change transform mode (translate, rotate, scale)
    public set_transform_mode(mode: 'translate' | 'rotate' | 'scale') {
        this.transform_controls.setMode(mode);
    }
}
