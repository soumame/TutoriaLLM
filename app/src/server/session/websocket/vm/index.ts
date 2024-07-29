import * as http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ivm from "isolated-vm";
import type { SessionValue, WSMessage } from "../../../../type.js";
import { sessionDB } from "../../../db/session.js";
// `__dirname` を取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// VMのインスタンスを管理するためのインターフェース
interface VMInstance {
	isolate: ivm.Isolate;
	context: ivm.Context;
	script: ivm.Script | null;
	running: boolean;
}

// VMのインスタンスを管理するオブジェクト
const vmInstances: { [key: string]: VMInstance } = {};

//コンテキストでサーバーを作成するのに使用
import express, { type Router } from "express";
import expressWs from "express-ws";
import { ExtensionLoader } from "../extentionLoader.js";
import LogBuffer from "./log.js";
import addContexts from "./contexts.js";
import addDefaultContexts from "./contexts.js";

export const vmExpress = express.Router();
expressWs(vmExpress as any);

export async function ExecCodeTest(
	code: string,
	uuid: string,
	userScript: string,
	serverRootPath: string,
	clients: Map<string, any>,
	DBupdator: (
		code: string,
		newData: SessionValue,
		clients: Map<string, any>,
	) => Promise<void>,
): Promise<string> {
	// verify session with uuid
	const session = await sessionDB.get(code);
	if (!session) {
		return "Invalid session";
	}
	const sessionValue: SessionValue = JSON.parse(session);
	if (sessionValue.uuid !== uuid) {
		return "Invalid uuid";
	}

	// ログバッファのインスタンスを作成
	const logBuffer = new LogBuffer(async (code, logs: string[]) => {
		const session = await sessionDB.get(code);
		if (!session) {
			return;
		}
		const sessionValue: SessionValue = JSON.parse(session);
		for (const log of logs) {
			sessionValue.dialogue.push({
				id: sessionValue.dialogue.length + 1,
				contentType: "log",
				isuser: false,
				content: log,
			});
		}
		await DBupdator(code, sessionValue, clients);
	}, code);

	// コンテキストの設定
	const isolate = new ivm.Isolate({ memoryLimit: 128 });
	const context = await isolate.createContext();
	const jail = context.global;

	await addDefaultContexts(
		jail,
		code,
		uuid,
		serverRootPath,
		logBuffer,
		vmExpress,
	);

	// // 拡張機能をコンテキストに追加
	// const extensionsDir = path.resolve(__dirname, "../../../../extensions");
	// const extensionLoader = new ExtensionLoader(extensionsDir, isolate, context);
	// await extensionLoader.loadExtensions();

	// //拡張機能スクリプトをロードする。script.tsファイルのデフォルトエクスポートが拡張機能として使用される
	// const extScript = await extensionLoader.loadScript(jail);
	// console.log("Script to execute: ", extScript, userScript);
	let script: ivm.Script | null = null;
	try {
		script = isolate.compileScriptSync(`
			
			${userScript}
		`);
		await script.run(context);
	} catch (e: unknown) {
		console.log("error on VM execution");
		//エラーをログに追加
		logBuffer.add(`"VM error: "${(e as string).toString()}`);
		console.log(e);
		await StopCodeTest(code, uuid);
	}

	// VMインスタンスの保存
	vmInstances[uuid] = { isolate, context, script, running: true };

	// ログバッファの処理を開始
	logBuffer.start();

	return "Valid uuid";
}

export async function StopCodeTest(
	code: string,
	uuid: string,
): Promise<{ message: string; error: string }> {
	const instance = vmInstances[uuid];
	if (instance?.running) {
		instance.running = false;
		instance.isolate.dispose();
		const session = await sessionDB.get(code);
		if (!session) {
			return {
				message: "Invalid session",
				error: "Invalid session",
			};
		}
		if (JSON.parse(session).uuid !== uuid) {
			return {
				message: "Invalid uuid",
				error: "Invalid uuid",
			};
		}
		console.log("updating session result");
		delete vmInstances[uuid]; // VMインスタンスを削除

		//ユーザーのコードが含まれたvmExpressのパスを削除
		console.log((vmExpress as Router).stack);

		const stack = (vmExpress as Router).stack;
		for (let i = stack.length - 1; i >= 0; i--) {
			const layer = stack[i];
			if (layer.route?.path?.toString().includes(code)) {
				stack.splice(i, 1);
			}
		}
		return {
			message: "Script execution stopped successfully.",
			error: "",
		};
	}
	return {
		message: "Script is not running.",
		error: "Script is not running.",
	};
}

export function SendIsWorkspaceRunning(isrunning: boolean): WSMessage {
	return {
		request: "updateState_isrunning",
		value: isrunning,
	};
}
