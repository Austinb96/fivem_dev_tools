import { XMLParser } from 'fast-xml-parser';
import { codewalkercli } from "../../codewalkercli.svelte";
import { settings } from "../../settings.svelte";
import type { XMLData } from "./xmlloader";
import { Vector3, Vector4 } from "three";

export interface EntityDef {
    archetypeName: string;
    flags: number;
    guid: number;
    position: Vector3;
    rotation: Vector4;
    scaleXY: number;
    scaleZ: number;
    parentIndex: number;
    lodDist: number;
    childLodDist: number;
    lodLevel: string;
    numChildren: number;
    priorityLevel: string;
    ambientOcclusionMultiplier: number;
    artificialAmbientOcclusion: number;
    tintValue: number;
}

export interface YmapData {
    name: string;
    parent: string;
    flags: number;
    contentFlags: number;
    streamingExtentsMin: Vector3;
    streamingExtentsMax: Vector3;
    entitiesExtentsMin: Vector3;
    entitiesExtentsMax: Vector3;
    entities: EntityDef[];
    physicsDictionaries: string[];
}

export class Ymap {
    private data: YmapData;

    constructor(data: YmapData) {
        this.data = data;
    }

    static async from_xml(xml: string): Promise<Ymap> {
        const parser = new XMLParser({
            ignoreAttributes: false,
            parseAttributeValue: true,
            numberParseOptions: {
                hex: true,
                leadingZeros: false
            }
        });

        const parsed = parser.parse(xml);
        const mapData = parsed.CMapData;

        const ymapData: YmapData = {
            name: mapData.name || '',
            parent: mapData.parent || '',
            flags: Number(mapData.flags) || 0,
            contentFlags: Number(mapData.contentFlags) || 0,
            streamingExtentsMin: Ymap.parse_vector3(mapData.streamingExtentsMin),
            streamingExtentsMax: Ymap.parse_vector3(mapData.streamingExtentsMax),
            entitiesExtentsMin: Ymap.parse_vector3(mapData.entitiesExtentsMin),
            entitiesExtentsMax: Ymap.parse_vector3(mapData.entitiesExtentsMax),
            entities: Ymap.parse_entities(mapData.entities?.Item || []),
            physicsDictionaries: mapData.physicsDictionaries?.Item || []
        };

        return new Ymap(ymapData);
    }

    static async from_url(url: string): Promise<Ymap> {
        const xml = await codewalkercli.export_xml(url);
        return Ymap.from_xml(xml);
    }

    private static parse_vector3(vec: any): Vector3 {
        return new Vector3(
            Number(vec?.["@_x"]) || 0,
            Number(vec?.["@_y"]) || 0,
            Number(vec?.["@_z"]) || 0
        );
    }
    
    private static parse_vector4(vec: any): Vector4 {
        return new Vector4(
            Number(vec?.["@_x"]) || 0,
            Number(vec?.["@_y"]) || 0,
            Number(vec?.["@_z"]) || 0,
            Number(vec?.["@_w"]) || 0
        );
    }

    private static parse_entities(items: any[]): EntityDef[] {
        if (!Array.isArray(items)) {
            items = [items];
        }
        
        return items.map(item => ({
            archetypeName: item.archetypeName || '',
            flags: Number(item.flags) || 0,
            guid: Number(item.guid) || 0,
            position: Ymap.parse_vector3(item.position),
            rotation: Ymap.parse_vector4(item.rotation),
            scaleXY: Number(item.scaleXY) || 1,
            scaleZ: Number(item.scaleZ) || 1,
            parentIndex: Number(item.parentIndex) || 0,
            lodDist: Number(item.lodDist) || 0,
            childLodDist: Number(item.childLodDist) || 0,
            lodLevel: item.lodLevel || '',
            numChildren: Number(item.numChildren) || 0,
            priorityLevel: item.priorityLevel || '',
            ambientOcclusionMultiplier: Number(item.ambientOcclusionMultiplier) || 0,
            artificialAmbientOcclusion: Number(item.artificialAmbientOcclusion) || 0,
            tintValue: Number(item.tintValue) || 0
        }));
    }
    
    async get_entities_as_xml(): Promise<XMLData[]> {
        const results: XMLData[] = [];
        const unique_models = new Set<string>();
        for (const entity of this.data.entities) {
            const model = entity.archetypeName;
            if (!unique_models.has(model)) {
                unique_models.add(model);
            }
        }
        
        const xml_data = await codewalkercli.export_model_xml(Array.from(unique_models));
        
        for(const entity of this.data.entities) {
            const model = entity.archetypeName;
            const xml = xml_data[model];
            if (xml) {
                results.push({
                    xml: xml,
                    position: entity.position,
                    rotation: entity.rotation
                });
            }else{
                console.warn("No XML data found for model:", model);
            }
        }
        
        return results;
    }

    get_entities(): EntityDef[] {
        return this.data.entities;
    }

    get_parent(): string {
        return this.data.parent;
    }
}
