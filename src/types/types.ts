export type VectorInfo = {
    vector: [number, number, number];
    file: string;
    line_number: number;
};

export type FolderTree = {
    files: { [fileName: string]: VectorInfo[] };
    subfolders: { [folderName: string]: FolderTree };
};
