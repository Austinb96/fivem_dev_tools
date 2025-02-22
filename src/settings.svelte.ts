import { load } from "@tauri-apps/plugin-store";

class Settings {
    store: any;
    private storeFile = "settings.json";

    base_path = $state("");

    constructor() {
        this.init();
    }

    async init() {
        try {
            this.store = await load(this.storeFile, { autoSave: true });
            
            this.base_path = await this.store.get("base_path") || this.base_path;
        } catch (error) {
            console.error("Failed to initialize settings store:", error);
        }
    }
        
    async save(){
        try {
            await this.store.set("base_path", this.base_path);
        } catch (error) {
            console.error("Failed to save settings:", error);
        }
    }
}

export const settings = new Settings();
