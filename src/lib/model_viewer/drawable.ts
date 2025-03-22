import * as THREE from 'three';

export interface BoundingSphere {
    center: THREE.Vector3;
    radius: number;
}

export interface DrawableModel {
    renderMask: number;
    flags: number;
    hasSkin: boolean;
    boneIndex: number;
    matrixCount: number;
    geometries: Geometry[];
}

export interface Geometry {
    shaderIndex: number;
    boundingBoxMin: THREE.Vector3;
    boundingBoxMax: THREE.Vector3;
    boneIds: number[];
    vertices: Float32Array;
    normals: Float32Array;
    uvs: Float32Array[];
    colors: Uint32Array[];
    tangents: Float32Array;
    indices: Uint32Array;
}

export interface VertexType {
    position: THREE.Vector3;
    blendWeight: number;
    blendIndices: number;
    normal: THREE.Vector3;
    colour0: number;
    colour1?: number;
    texCoord0: THREE.Vector2;
    texCoord1?: THREE.Vector2;
    texCoord2?: THREE.Vector2;
    texCoord3?: THREE.Vector2;
    texCoord4?: THREE.Vector2;
    texCoord5?: THREE.Vector2;
    texCoord6?: THREE.Vector2;
    texCoord7?: THREE.Vector2;
    tangent?: THREE.Vector4;
}
const VERTEX_TYPE = {
    Position: 3,
    BlendWeights: 4,
    BlendIndices: 4,
    Normal: 3,
    Colour0: 4,
    Colour1: 4,
    TexCoord0: 2,
    TexCoord1: 2,
    TexCoord2: 2,
    TexCoord3: 2,
    TexCoord4: 2,
    TexCoord5: 2,
    TexCoord6: 2,
    TexCoord7: 2,
    Tangent: 4,
}

export class Drawable {
    name = "";
    boundingSphere: BoundingSphere = {
        center: new THREE.Vector3(),
        radius: 0
    };
    boundingBoxMin: THREE.Vector3 = new THREE.Vector3();
    boundingBoxMax: THREE.Vector3 = new THREE.Vector3();
    
    lodDistHigh = 9998;
    lodDistMed = 9998;
    lodDistLow = 9998;
    lodDistVlow = 9998;
    
    flagsHigh = 0;
    flagsMed = 0; 
    flagsLow = 0;
    flagsVlow = 0;

    drawableModelsHigh: DrawableModel[] = [];
    drawableModelsMed: DrawableModel[] = [];
    drawableModelsLow: DrawableModel[] = [];
    drawableModelsVlow: DrawableModel[] = [];

    get allModels(): DrawableModel[] {
        return [
            ...this.drawableModelsHigh,
            ...this.drawableModelsMed,
            ...this.drawableModelsLow,
            ...this.drawableModelsVlow
        ];
    }

    get allGeometries(): Geometry[] {
        return this.allModels.flatMap(model => model.geometries);
    }

    get isEmpty(): boolean {
        return this.allModels.length === 0;
    }
    
    public parse_vertex_data(vertex_buffer): VertexType[] {
        if (!vertex_buffer) {
            return [];
        }
        const values = vertex_buffer.Data.trim().split(/\s+/).map(Number);
        
        const vertex_data: VertexType[] = [];
        
        let stride = 0;
        for (const key in vertex_buffer.Layout) {
            if (VERTEX_TYPE[key] !== undefined) {
                stride += VERTEX_TYPE[key];
            }
        }
        
        for (let i = 0; i < values.length; i += stride) {
            const vertex: VertexType = {
                position: new THREE.Vector3(values[i], values[i + 1], values[i + 2]),
                blendWeight: values[i + 3],
                blendIndices: values[i + 4],
                normal: new THREE.Vector3(values[i + 5], values[i + 6], values[i + 7]),
                colour0: values[i + 8],
                texCoord0: new THREE.Vector2(values[i + 9], values[i + 10]),
            };
            vertex_data.push(vertex);
        }
        
        return vertex_data;
    }

    public parse_index_data(data_str: string): Uint32Array {
        if (!data_str) {
            return new Uint32Array();
        }

        const values = data_str.trim().split(/\s+/).map(Number);
        return new Uint32Array(values);
    }
}
