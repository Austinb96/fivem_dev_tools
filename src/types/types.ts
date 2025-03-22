export type VectorInfo = {
	vector: [number, number, number];
	file: string;
	line_number: number;
};

export type FolderTree = {
	files: { [fileName: string]: VectorInfo[] };
	subfolders: { [folderName: string]: FolderTree };
};

export enum ItemType {
	PopulationGroup = "CPopulationGroup",
	PopModelAndVariations = "CPopModelAndVariations",
	PedCompRestriction = "CPedCompRestriction",
	PedPropRestriction = "CPedPropRestriction",
}

export interface Restriction {
	Component: string;
	DrawableIndex: number;
	TextureIndex: number;
	Restriction: string;
}

export interface ModelVariation {
	type?: string;
	CompRestrictions?: Restriction[];
	PropRestrictions?: Restriction[];
	LoadOut?: any; // Adjust as needed
}
export interface PopModel {
	Name: string;
	Variations?: ModelVariation;
}

export interface PopGroup {
	Name: string;
	models: {
		itemType: ItemType.PopModelAndVariations;
		Items: PopModel[];
	};
	flags: string;
}

export interface CPopGroupList {
	pedGroups: {
		itemType: ItemType.PopulationGroup;
		Items: PopGroup[];
	};
}


export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export interface Vector4 {
    x: number;
    y: number;
    z: number;
    w: number;
}
