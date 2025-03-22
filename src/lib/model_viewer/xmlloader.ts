import { invoke } from "@tauri-apps/api/core";
import { XMLParser } from "fast-xml-parser";
import { toast } from "../../toast.svelte";
import { codewalkercli } from "../../codewalkercli.svelte";
import { Ymap } from "./ymap";
import { Vector3, Vector4 } from "three";

interface XMLOptions {
    ignoreAttributes?: boolean;
    attributeNamePrefix?: string;
    parseAttributeValue?: boolean;
    trimValues?: boolean;
}

export interface XMLData {
    xml: any;
    position: Vector3;
    rotation: Vector4;
}

export class XMLLoader{
    private parser: XMLParser;
    
    constructor(options?: XMLOptions){
        this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            parseAttributeValue: true,
            trimValues: true,
            ...options
        });
    }
    
    public async load_xml(file_path: string): Promise<XMLData[]>{
        try {
            const ext = file_path.split('.').pop();
            let data:XMLData[] = [];
            switch (ext) {
                case "xml":
                    // xmls.push(await invoke("read_file", {path: file_path}));
                    {
                        const xml: string = await invoke("read_file", {path: file_path});
                        data.push(
                            {
                                xml: this.parse(xml),
                                position: new Vector3(0, 0, 0),
                                rotation: new Vector4(0, 0, 0, 0)
                            }
                        );
                    }
                    break;
            
                case "ymap":
                    {
                        const ymap = await Ymap.from_url(file_path);
                        const models: XMLData[] = await ymap.get_entities_as_xml();
                        for (const model of models) {
                            data.push({
                                xml: this.parse(model.xml),
                                position: model.position,
                                rotation: model.rotation
                            })
                        }
                    }
                    break;
                default:
                    break;
            }
            return data;
        } catch (error) {
            toast.add({
                text: `Failed to load XML file: ${error}`,
                type: "error",
            })
            throw new Error(`Failed to load XML file: ${error}`);
        }
    }
    
    public parse(xml_content: string): any{
        try{
            return this.parser.parse(xml_content);
        }catch(error){
            toast.add({
                text: `Failed to parse XML content: ${error}`,
                type: "error",
            })
            throw new Error(`Failed to parse XML content: ${error}`);
        }
    }
    
    
}
