import { goto } from "$app/navigation";
import { createPatch, applyPatch, type ParsedDiff, parsePatch } from "diff";
import { codewalkercli } from "./codewalkercli.svelte";
import { settings } from "./settings.svelte";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "./toast.svelte";

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
type XMLData = {
	xml: string;
	file_path: string;
	file_name: string;
};

export const SUPPORTED_META: Record<string, boolean> = {
	xml: true,
	ymap: true,
	ytyp: true,
	ydr: true,
};

interface SaveOptions {
	mode: "replace_file1" | "replace_file2" | "new_location" | "replace_both";
	delete_file1?: boolean;
	delete_file2?: boolean;
}

class DiffTool {
	xml: XMLData[] = $state([
		{ file_path: "", xml: "", file_name: "" },
		{ file_path: "", xml: "", file_name: "" },
	]);
	grouped_diff: DiffGroup[] = $state([]);
	result = $state("");
	output_path = $state(settings.save_path);
	save_options: SaveOptions = $state({
		mode: "new_location",
		delete_file1: false,
		delete_file2: false,
	});

	loading: boolean = $state(false);

	async load_from_path(file_path: string, index: number) {
		try {
			const ext = file_path.split(".").pop() || "";
			if (!SUPPORTED_META[ext]) {
				throw new Error(`Unsupported file type: ${ext}`);
			}

			let xml = "";
			if (ext === "xml") {
				xml = await readTextFile(file_path);
			} else {
				const temp_path = `${settings.save_path}\\temp${index}.xml`;
				const result = await codewalkercli.export_xml(file_path, temp_path);
				if (!result) {
					throw new Error(`Failed to export XML: ${file_path}`);
				}
				xml = await invoke("read_file", {
					path: temp_path,
				});
			}
			const file_name = file_path.split("\\").pop() || "";
			this.xml[index] = {
				file_path: file_path,
				xml: xml,
				file_name: file_name,
			};
		} catch (error) {
            toast.add({
                type: "error",
                text: `Error loading XML file: ${error}`,
            });
			console.error("Error loading XML file:", error);
		}
	}

	async open_page_with_files(
		path1: string,
		path2: string,
		xml_output_path?: string,
	) {
		this.loading = true;
		try {
			if (xml_output_path) {
				this.output_path = xml_output_path;
			}
			goto("/diff_editor");

			const ext1 = path1.split(".").pop() || "";
			const ext2 = path2.split(".").pop() || "";

			if (!(SUPPORTED_META[ext1] && SUPPORTED_META[ext2])) {
				return;
			}

			const result = await codewalkercli.export_xml(
				path1,
				`${settings.save_path}\\temp1.xml`,
			);
			if (!result) {
				throw new Error(`Failed to export XML 1: ${path1}`);
			}
			const result2 = await codewalkercli.export_xml(
				path2,
				`${settings.save_path}\\temp2.xml`,
			);
			if (!result2) {
				throw new Error(`Failed to export XML 2: ${path2}`);
			}

			const xml1: string = await invoke("read_file", {
				path: `${settings.save_path}\\temp1.xml`,
			});

			const xml2: string = await invoke("read_file", {
				path: `${settings.save_path}\\temp2.xml`,
			});

			this.xml = [
				{
					file_path: path1,
					xml: xml1,
					file_name: path1.split("\\").pop() || "",
				},
				{
					file_path: path2,
					xml: xml2,
					file_name: path2.split("\\").pop() || "",
				},
			];

			this.compare(0, 1);
            
            this.loading = false;
            
		} catch (error) {
            this.loading = false;
			toast.add({
				type: "error",
				text: `Error opening diff editor: ${error}`,
			});
			console.error("Error opening diff editor:", error);
		}
	}

	compare(index1: number, index2: number) {
		try {
			const patch = createPatch(
				"file.xml",
				this.xml[index1].xml || "",
				this.xml[index2].xml || "",
				"original",
				"modified",
			);

			const [parsedDiff] = parsePatch(patch);
			this.grouped_diff = this.processHunks(parsedDiff);
		} catch (error) {
			console.error("Error comparing XML files:", error);
		}
	}

	private processHunks(parsedDiff: ParsedDiff): DiffGroup[] {
		const groups: DiffGroup[] = [];

		for (const hunk of parsedDiff.hunks) {
			const group: DiffGroup = {
				startLine: hunk.oldStart,
				lines: [],
				isExpanded: true,
			};

			let oldLineNumber = hunk.oldStart;
			let newLineNumber = hunk.newStart;

			for (const line of hunk.lines) {
				const firstChar = line[0];
				const content = line.slice(1);
				let type: "added" | "removed" | "context";
				let lineNumber: number;

				switch (firstChar) {
					case "+":
						type = "added";
						lineNumber = oldLineNumber;
						break;
					case "-":
						type = "removed";
						lineNumber = oldLineNumber++;
						break;
					default:
						type = "context";
						lineNumber = oldLineNumber++;
						newLineNumber++;
						break;
				}

				group.lines.push({
					type,
					content,
					selected: type === "removed", // Default select removed lines to keep original content
					lineNumber,
					newLineNumber: type === "added" ? newLineNumber++ : undefined,
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
			this.grouped_diff[index].isExpanded =
				!this.grouped_diff[index].isExpanded;
		}
	}
    
    toggle_expanded_all(expanded: boolean) {
        for (const group of this.grouped_diff) {
            group.isExpanded = expanded;
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
				if (line.type === "added") {
					line.selected = selected;
				}
			}
		}
	}

	toggle_all_removed(selected: boolean) {
		for (const group of this.grouped_diff) {
			for (const line of group.lines) {
				if (line.type === "removed") {
					line.selected = selected;
				}
			}
		}
	}

	toggle_chunk_added(groupIndex: number, selected: boolean) {
		if (groupIndex >= 0 && groupIndex < this.grouped_diff.length) {
			for (const line of this.grouped_diff[groupIndex].lines) {
				if (line.type === "added") {
					line.selected = selected;
				}
			}
		}
	}

	toggle_chunk_removed(groupIndex: number, selected: boolean) {
		if (groupIndex >= 0 && groupIndex < this.grouped_diff.length) {
			for (const line of this.grouped_diff[groupIndex].lines) {
				if (line.type === "removed") {
					line.selected = selected;
				}
			}
		}
	}

	generate_result() {
		try {
			const lines = this.xml[0].xml.split("\n");
			const result = [...lines];
			let offset = 0;

			const sortedGroups = [...this.grouped_diff].sort(
				(a, b) => a.startLine - b.startLine,
			);

			for (const group of sortedGroups) {
				const changes: {
					line: number;
					type: "remove" | "add";
					content: string;
					selected: boolean;
				}[] = [];

				for (const line of group.lines) {
					if (line.type === "removed" || line.type === "added") {
						const adjustedLineNum = line.lineNumber - 1;
						changes.push({
							line: adjustedLineNum,
							type: line.type === "removed" ? "remove" : "add",
							content: line.content,
							selected: line.selected,
						});
					}
				}

				changes.sort((a, b) => a.line - b.line);

				for (const change of changes) {
					const adjustedPosition = change.line + offset;

					if (change.type === "remove" && !change.selected) {
						result.splice(adjustedPosition, 1);
						offset--;
					} else if (change.type === "add" && change.selected) {
						result.splice(adjustedPosition, 0, change.content);
						offset++;
					}
				}
			}

			this.result = result.join("\n");
		} catch (error) {
			console.error("Error generating result:", error);
			this.result = "";
		}
	}

	async save_result(options?: SaveOptions) {
		const saveOpts = options || this.save_options;
		let target_path = "";
		switch (saveOpts.mode) {
			case "replace_file1":
				target_path = this.xml[0].file_path;
				break;
			case "replace_file2":
				target_path = this.xml[1].file_path;
				break;
			case "new_location":
				if (!this.output_path) {
					return;
				}
				target_path = `${this.output_path}\\merged.${this.xml[0].file_name.split(".").pop()}`;
				break;
			case "replace_both":
				// Replace both files with the same content
				await this.save_result({ ...saveOpts, mode: "replace_file1" });
				await this.save_result({ ...saveOpts, mode: "replace_file2" });
				return;
		}

		const output_ext = target_path.split(".").pop() || "";
		if (!SUPPORTED_META[output_ext]) {
			return;
		}

		try {
			if (output_ext === "xml") {
				await invoke("write_file", {
					path: target_path,
					content: this.result,
				});
			} else {
				const new_xml_path = `${settings.save_path}/temp_output.xml`;
				await invoke("write_file", {
					path: new_xml_path,
					content: this.result,
				});
				const result = await codewalkercli.import_xml(
					new_xml_path,
					target_path,
				);
				if (!result) {
					throw new Error("Failed to import XML");
				}
			}

			if (saveOpts.delete_file1 && this.xml[0].file_path !== target_path) {
				await invoke("delete_file", { path: this.xml[0].file_path });
			}
			if (saveOpts.delete_file2 && this.xml[1].file_path !== target_path) {
				await invoke("delete_file", { path: this.xml[1].file_path });
			}

			toast.add({
				type: "success",
				text: "Saved successfully",
			});
		} catch (error) {
			console.error("Error saving file:", error);
		}
	}

	async download_result() {
		const blob = new Blob([this.result], { type: "text/xml" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "merged.xml";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
}

export const diffTool = new DiffTool();
