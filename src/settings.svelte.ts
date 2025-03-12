import { load } from "@tauri-apps/plugin-store";

//TODO this can prob be done a lot cleaner and easier
class Settings {
    store: any;
    private storeFile = "settings.json";

    base_path = $state("");
    game_path = $state(""); 
    save_path = $state("");

    constructor() {
        this.init();
    }

    async init() {
        try {
            this.store = await load(this.storeFile, { autoSave: true });
            
            this.base_path = await this.store.get("base_path") || this.base_path;
            this.game_path = await this.store.get("game_path") || this.game_path;
            this.save_path = await this.store.get("save_path") || this.save_path;
            
        } catch (error) {
            console.error("Failed to initialize settings store:", error);
        }
    }
        
    async save(){
        try {
            await this.store.set("base_path", this.base_path);
            await this.store.set("game_path", this.game_path);
            await this.store.set("save_path", this.save_path);
        } catch (error) {
            console.error("Failed to save settings:", error);
        }
    }
}

export const settings = new Settings();
