import { createPatch, applyPatch, type ParsedDiff, parsePatch } from "diff";

interface DiffLine {
    type: "added" | "removed" | "context";
    content: string;
    selected: boolean;
    lineNumber: number;
    // Add new property to track the line number in the modified file
    newLineNumber?: number;
}

interface DiffGroup {
    startLine: number;
    lines: DiffLine[];
    isExpanded: boolean;
}

interface ProcessedHunk {
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    changes: DiffLine[];
}

class XMLTool {
    xml: string[] = $state(["", ""]);
    grouped_diff: DiffGroup[] = $state([]);
    result = $state('');

    async load_xml_from_file(file: File, index: number) {
        try {
            const content = await file.text();
            this.set_xml(content, index);
        } catch (error) {
            console.error('Error loading XML file:', error);
        }
    }

    set_xml(xml: string, index: number) {
        if (index === 0 || index === 1) {
            this.xml[index] = xml;
        }
    }

    compare() {
        try {
            const patch = createPatch(
                'file.xml',
                this.xml[0] || '',
                this.xml[1] || '',
                'original',
                'modified'
            );
            
            const [parsedDiff] = parsePatch(patch);
            this.grouped_diff = this.processHunks(parsedDiff);
        } catch (error) {
            console.error('Error comparing XML files:', error);
        }
    }

    private processHunks(parsedDiff: ParsedDiff): DiffGroup[] {
        const groups: DiffGroup[] = [];
        
        for (const hunk of parsedDiff.hunks) {
            const group: DiffGroup = {
                startLine: hunk.oldStart,
                lines: [],
                isExpanded: true
            };

            let oldLineNumber = hunk.oldStart;
            let newLineNumber = hunk.newStart;

            for (const line of hunk.lines) {
                const firstChar = line[0];
                const content = line.slice(1);
                let type: "added" | "removed" | "context";
                let lineNumber: number;

                switch (firstChar) {
                    case '+':
                        type = 'added';
                        lineNumber = oldLineNumber;
                        break;
                    case '-':
                        type = 'removed';
                        lineNumber = oldLineNumber++;
                        break;
                    default:
                        type = 'context';
                        lineNumber = oldLineNumber++;
                        newLineNumber++;
                        break;
                }

                group.lines.push({
                    type,
                    content,
                    selected: type === 'removed', // Default select removed lines to keep original content
                    lineNumber,
                    newLineNumber: type === 'added' ? newLineNumber++ : undefined
                });
            }

            if (group.lines.length > 0) {
                groups.push(group);
            }
        }
        
        return groups;
    }

    toggle_group(index: number) {
        if (index >= 0 && index < this.grouped_diff.length) {
            this.grouped_diff[index].isExpanded = !this.grouped_diff[index].isExpanded;
        }
    }

    toggle_selected_line(line: DiffLine) {
        if (line.type === "added" || line.type === "removed") {
            line.selected = !line.selected;
        }
    }
    
    toggle_all_added(selected: boolean) {
        for (const group of this.grouped_diff) {
            for (const line of group.lines) {
                if (line.type === 'added') {
                    line.selected = selected;
                }
            }
        }
    }

    toggle_all_removed(selected: boolean) {
        for (const group of this.grouped_diff) {
            for (const line of group.lines) {
                if (line.type === 'removed') {
                    line.selected = selected;
                }
            }
        }
    }
    
    toggle_chunk_added(groupIndex: number, selected: boolean) {
        if (groupIndex >= 0 && groupIndex < this.grouped_diff.length) {
            for (const line of this.grouped_diff[groupIndex].lines) {
                if (line.type === 'added') {
                    line.selected = selected;
                }
            }
        }
    }

    toggle_chunk_removed(groupIndex: number, selected: boolean) {
        if (groupIndex >= 0 && groupIndex < this.grouped_diff.length) {
            for (const line of this.grouped_diff[groupIndex].lines) {
                if (line.type === 'removed') {
                    line.selected = selected;
                }
            }
        }
    }

    generate_result() {
        try {
            const lines = this.xml[0].split('\n');
            const result = [...lines];
            let offset = 0;
    
            const sortedGroups = [...this.grouped_diff].sort((a, b) => a.startLine - b.startLine);
    
            for (const group of sortedGroups) {
                const changes: {line: number, type: 'remove' | 'add', content: string, selected :boolean}[] = [];
    
                for (const line of group.lines) {
                    if (line.type === 'removed' || line.type === 'added') {
                        const adjustedLineNum = line.lineNumber - 1;
                        changes.push({
                            line: adjustedLineNum,
                            type: line.type === 'removed' ? 'remove' : 'add',
                            content: line.content,
                            selected: line.selected
                        });
                    }
                }
    
                // changes.sort((a, b) => {
                //     if (a.type === 'remove' && b.type === 'add') return -1;
                //     if (a.type === 'add' && b.type === 'remove') return 1;
                //     return a.line - b.line;
                // });
                changes.sort((a, b) => a.line - b.line);
    
                // Apply changes
                for (const change of changes) {
                    const adjustedPosition = change.line + offset;
                    
                    if(change.type === 'remove' || change.type === 'add') {
                        console.log(
                            'Change:', change.type,
                            'Line:', change.line,
                            'Adjusted:', adjustedPosition,
                            "offset:", offset,
                            'Content:', change.content,
                            'Selected:', change.selected
                        )
                    }
    
                    if (change.type === 'remove' && !change.selected) {
                        result.splice(adjustedPosition, 1);
                        offset--;
                    } else if (change.type === 'add' && change.selected) {
                        result.splice(adjustedPosition, 0, change.content);
                        offset++;
                    }
                }
            }
    
            this.result = result.join('\n');
        } catch (error) {
            console.error('Error generating result:', error);
            this.result = '';
        }
    }
}

export const xmlTool = new XMLTool();
