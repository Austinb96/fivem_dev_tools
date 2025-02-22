import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { getVersion } from "@tauri-apps/api/app";

class Updater {
    update = $state();
    current_version = $state();
    downloaded = $state(0);
	contentLength = $state(0);
	progress = $state(0);
	isDownloading = $state(false);
	skip = $state(false);
    
    constructor() {
        this.check_update();
        console.log("Current version: ", this.current_version);
    }
    
    
    async check_update() {
        this.update = await check();
        this.current_version = await getVersion();
        if (this.update) {
            console.log("Update available");
            this.download();
        } else {
            console.log("No update available");
        }
        
    }
    
    async install(){
        if (!this.update) {
            return;
        }
        
        this.update.install()
            .then(async () => {
                await relaunch();
            });
    }
    
    async download(){
        if (!this.update) {
            return;
        }
        console.log("Downloading update");
        await this.update.download((event) => {
			switch (event.event) {
				case "Started":
					this.contentLength = event.data.contentLength;
					console.log(`Started downloading ${event.data.contentLength} bytes`);
					break;
				case "Progress":
					this.downloaded += event.data.chunkLength;
					this.progress = (this.downloaded / this.contentLength) * 100;
					break;
				case "Finished":
					console.log("Download finished");
					this.isDownloading = false;
					this.progress = 100;
					break;
			}
		});
    }
}


export const updater = new Updater();
