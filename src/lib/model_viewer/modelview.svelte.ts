import { Scene } from "./scene.svelte";
import type * as THREE from 'three';

class ModelViewer {
    scene: Scene | null = $state(null);
    current_file = "";
    model_name = "";
    camera_move_speed = $state(0.01);
    max_camera_speed = $state(2.0);
    
    constructor() {
        this.current_file = "";
    }
    
    initialize(container: HTMLElement) {
        console.log("Initializing model viewer");
        this.scene = new Scene(container);
        
        window.addEventListener("resize", () => {
            if (this.scene) {
                this.scene.resize(window.innerWidth, window.innerHeight);
            }
        });
    }
    
    async load_model(file: string) {
        if (!this.scene) {
            throw new Error("Scene not initialized");
        }
        
        try {
            const result = await this.scene.load_model(file);
            if (result) {
                this.current_file = file;
            }
            return result;
        } catch (error) {
            console.error("Error loading model:", error);
            throw error;
        }
    }
    
    clear_models() {
        if (this.scene) {
            this.scene.clear_models();
            this.current_file = "";
        }
    }
}

export const modelviewer = new ModelViewer();
