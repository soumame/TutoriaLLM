import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type ivm from "isolated-vm";

export class ExtensionLoader {
	private extensionsDir: string;
	private isolate: ivm.Isolate;
	private context: ivm.Context;

	constructor(
		extensionsDir: string,
		isolate: ivm.Isolate,
		context: ivm.Context,
	) {
		this.extensionsDir = extensionsDir;
		this.isolate = isolate;
		this.context = context;
	}

	public async loadExtensions(): Promise<void> {
		const extensionFolders = fs.readdirSync(this.extensionsDir);

		for (const extensionFolder of extensionFolders) {
			const ctxDir = path.join(this.extensionsDir, extensionFolder, "context");
			if (fs.existsSync(ctxDir) && fs.lstatSync(ctxDir).isDirectory()) {
				const files = fs.readdirSync(ctxDir);
				for (const file of files) {
					const filePath = path.join(ctxDir, file);
					const fileURL = pathToFileURL(filePath).href;
					const mod = await import(fileURL);
					if (typeof mod.default === "function") {
						console.log("loading extension", file);
						const script = `global.${path.basename(file, path.extname(file))} = ${mod.default.toString()};`;
						await this.context.eval(script, { filename: file });
					}
				}
			}
		}
	}

	public async loadScript(globals: { [key: string]: any }): Promise<string> {
		function findScriptFiles(dir: string): string[] {
			let results: string[] = [];
			const list = fs.readdirSync(dir);

			for (const file of list) {
				const filePath = path.join(dir, file);
				const stat = fs.lstatSync(filePath);
				if (stat?.isDirectory()) {
					results = results.concat(findScriptFiles(filePath));
				} else if (file === "script.ts" || file === "script.js") {
					results.push(filePath);
				}
			}
			return results;
		}

		const scriptFiles = findScriptFiles(this.extensionsDir);
		let ExtscriptContent = "";

		// グローバル変数の定義を追加
		for (const [key, value] of Object.entries(globals)) {
			ExtscriptContent += `const ${key} = ${JSON.stringify(value)};\n`;
		}

		for (const scriptFile of scriptFiles) {
			const scriptContent = fs.readFileSync(scriptFile, "utf-8");
			console.log("loading extension script", scriptFile);
			ExtscriptContent += scriptContent;
		}

		try {
			await this.context.eval(ExtscriptContent, { filename: "loaded-scripts" });
		} catch (error) {
			console.error("Error evaluating extension scripts:", error);
			throw error;
		}

		return ExtscriptContent;
	}
}
