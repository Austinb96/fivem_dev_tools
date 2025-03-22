import * as THREE from 'three';
import { XMLLoader, type XMLData } from './xmlloader';
import { Drawable, type VertexType, type DrawableModel, type Geometry } from './drawable';

export interface ModelData {
    model: THREE.Group;
    position: THREE.Vector3;
    rotation: THREE.Vector4;
}

export class ModelLoader {
    private xmlLoader: XMLLoader;
    private drawable: Drawable;
    
    constructor(){
        this.xmlLoader = new XMLLoader();
        this.drawable = new Drawable();
    }
    
    public async load_model(url: string): Promise<ModelData[]> {
        try {
            const xml_data: XMLData[] = await this.xmlLoader.load_xml(url);
            const groups: ModelData[] = [];
            for(const data of xml_data){
                const model_group = new THREE.Group();
                
                const drawable_data = data.xml.Fragment?.Drawable || data.xml.Drawable;
                
                if(drawable_data){
                    this.drawable.name = drawable_data.Name || "";
                    this.drawable.boundingSphere = {
                        center: new THREE.Vector3(
                            drawable_data.BoundingSphereCenter.X,
                            drawable_data.BoundingSphereCenter.Y,
                            drawable_data.BoundingSphereCenter.Z
                        ),
                        radius: drawable_data.BoundingSphereRadius
                    };
                    
                    if (drawable_data.DrawableModelsHigh) {
                        const models = this.parse_models(drawable_data.DrawableModelsHigh);
                        this.drawable.drawableModelsHigh = models;
                        
                        const meshes = this.create_meshes(this.drawable.allGeometries);
                        for (const mesh of meshes) {
                            model_group.add(mesh);
                        }
                    }
                    
                    groups.push({
                        model: model_group,
                        position: data.position,
                        rotation: data.rotation
                    });
                }else{
                    console.warn("No Drawable data found in XML for xml:", data.xml);
                }
            }
            
            return groups;
        } catch (e) {
            console.error(e);
            return [];
        }
    }
    
    private parse_models(models_data: any): DrawableModel[] {
        const models: DrawableModel[] = [];
        
        const items = Array.isArray(models_data.Item) ? models_data.Item : [models_data.Item];
        
        for (const item of items) {
            const model: DrawableModel = {
                renderMask: item.RenderMask || 0,
                flags: item.Flags || 0,
                hasSkin: Boolean(item.HasSkin),
                boneIndex: item.BoneIndex || 0,
                matrixCount: item.Unknown1 || 0,
                geometries: this.parse_geometries(item.Geometries?.Item || [])
            };
            models.push(model);
        }
        
        return models;
    }
    
    private parse_geometries(geom_data: any[]): Geometry[] {
        const geometries: Geometry[] = [];
        const items = Array.isArray(geom_data) ? geom_data : [geom_data];
        
        for (const item of items) {
            if (item.VertexBuffer?.Data && item.IndexBuffer?.Data) {
                const indices = this.drawable.parse_index_data(item.IndexBuffer.Data);
                const vertexData = this.drawable.parse_vertex_data(item.VertexBuffer);
                
                // Create arrays for buffer attributes
                const vertices = new Float32Array(vertexData.length * 3);
                const normals = new Float32Array(vertexData.length * 3);
                const uvs = new Float32Array(vertexData.length * 2);
                const colors = new Uint32Array(vertexData.length);
                
                // Fill buffer arrays from parsed vertex data
                vertexData.forEach((vertex, index) => {
                    // Position
                    vertices[index * 3] = vertex.position.x;
                    vertices[index * 3 + 1] = vertex.position.y;
                    vertices[index * 3 + 2] = vertex.position.z;
                    
                    // Normal
                    normals[index * 3] = vertex.normal.x;
                    normals[index * 3 + 1] = vertex.normal.y;
                    normals[index * 3 + 2] = vertex.normal.z;
                    
                    // UV
                    uvs[index * 2] = vertex.texCoord0.x;
                    uvs[index * 2 + 1] = vertex.texCoord0.y;
                    
                    // Color
                    colors[index] = vertex.colour0;
                });

                const geometry: Geometry = {
                    shaderIndex: item.ShaderIndex || 0,
                    boundingBoxMin: new THREE.Vector3(
                        item.BoundingBoxMin?.X || 0,
                        item.BoundingBoxMin?.Y || 0,
                        item.BoundingBoxMin?.Z || 0
                    ),
                    boundingBoxMax: new THREE.Vector3(
                        item.BoundingBoxMax?.X || 0,
                        item.BoundingBoxMax?.Y || 0,
                        item.BoundingBoxMax?.Z || 0
                    ),
                    boneIds: item.BoneIDs?.split(',').map(Number) || [],
                    vertices: vertices,
                    normals: normals,
                    uvs: [uvs],
                    colors: [colors],
                    tangents: new Float32Array(0), // Initialize empty for now
                    indices: indices
                };
                geometries.push(geometry);
            }
        }
        
        return geometries;
    }
    
    private create_meshes(geometries: Geometry[]): THREE.Mesh[] {
        const meshes: THREE.Mesh[] = [];
        
        for (const geom of geometries) {
            const bufferGeometry = new THREE.BufferGeometry();
            
            // Set vertex attributes directly without transformation
            bufferGeometry.setAttribute('position', new THREE.Float32BufferAttribute(geom.vertices, 3));
            bufferGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(geom.normals, 3));
            
            if (geom.uvs[0]) {
                bufferGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(geom.uvs[0], 2));
            }
            
            if (geom.colors[0]) {
                const colors = new Float32Array(geom.colors[0].length);
                for (let i = 0; i < geom.colors[0].length; i++) {
                    colors[i] = geom.colors[0][i] / 255;
                }
                bufferGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
            }
            
            if (geom.tangents) {
                bufferGeometry.setAttribute('tangent', new THREE.Float32BufferAttribute(geom.tangents, 4));
            }
            
            // Set indices
            bufferGeometry.setIndex(Array.from(geom.indices));
            
            const material = new THREE.MeshStandardMaterial({ 
                color: 0x808080,
                vertexColors: true,
                wireframe: false,
                side: THREE.DoubleSide
            });
            
            const mesh = new THREE.Mesh(bufferGeometry, material);
            meshes.push(mesh);
        }
        
        return meshes;
    }
}
