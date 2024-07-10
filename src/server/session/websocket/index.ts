import express from "express";
import e from "express";
import expressWs from "express-ws";
import i18next from "i18next";
import FsBackend, { type FsBackendOptions } from "i18next-fs-backend";
import type { Dialogue, SessionValue, WSMessage } from "../../../type.js";
import { updateDialogue } from "../../../utils/dialogueUpdater.js";
import { sessionDB } from "../../db/session.js";
import { invokeLLM } from "../llm/index.js";
import {
	ExecCodeTest,
	SendIsWorkspaceRunning,
	StopCodeTest,
} from "./vm/index.js";

const websocketserver = express.Router();
expressWs(websocketserver as any);

const clients = new Map<string, any>(); // WebSocketクライアントを管理するマップ

// i18n configuration
i18next.use(FsBackend).init<FsBackendOptions>(
	{
		backend: {
			loadPath: "src/i18n/{{lng}}.json",
		},
		fallbackLng: "en",
		preload: ["ja", "en", "zh", "ms"], // Add the languages you want to preload
	},
	(err, t) => {
		if (err) return console.error(err);
		console.log("i18next initialized");
	},
);

websocketserver.ws("/connect/:code", async (ws, req) => {
	const code = req.params.code;
	const uuid = req.query.uuid as string;
	console.log("new connection request from: ", code);

	try {
		// コードが存在しない場合は接続を拒否
		const value = await sessionDB.get(code);
		if (!value) {
			ws.send("Invalid code");
			ws.close();
			return;
		}
		const data: SessionValue = JSON.parse(value);

		// uuidが一致しない場合は接続を拒否
		if (data.uuid !== uuid) {
			ws.send("Invalid uuid");
			ws.close();
			return;
		}

		// WebSocketクライアントのIDを生成
		const clientId = `${uuid}-${Math.random().toString(36).substr(2, 9)}`;
		clients.set(clientId, ws);

		// クライアントIDをセッションに追加
		if (!data.clients.includes(clientId)) {
			data.clients.push(clientId);
			await sessionDB.put(code, JSON.stringify(data));
		}

		// Change language based on DB settings
		i18next.changeLanguage(data.language);

		ws.send(JSON.stringify(SendIsWorkspaceRunning(data.isVMRunning)));

		ws.on("message", async (message) => {
			const messageJson: SessionValue | WSMessage = JSON.parse(
				message.toString(),
			);
			console.log("message received in ws session");

			try {
				const currentData = await sessionDB.get(code);
				const currentDataJson: SessionValue = JSON.parse(currentData);
				let isRunning = currentDataJson.isVMRunning;

				const updateDatabase = async (newData: SessionValue) => {
					await sessionDB.put(code, JSON.stringify(newData));
					// 全クライアントに更新を通知
					for (const id of newData.clients) {
						if (clients.has(id)) {
							clients.get(id).send(JSON.stringify(newData));
						}
					}
				};

				if ((messageJson as SessionValue).workspace) {
					const messageJson: SessionValue = JSON.parse(message.toString());
					if (currentDataJson.uuid !== messageJson.uuid) {
						ws.send("Invalid uuid");
						ws.close();
					}
					const { sessioncode, uuid, workspace, tutorial, llmContext } =
						messageJson;
					//dialogueが更新されている場合は、LLMによって応答が生成される
					//ユーザーが更新した場合のみ、LLMを呼び出す（それ以外を呼び出すと無限ループになる）
					async function updateDialogueLLM(data: SessionValue): Promise<{
						dialogue: Dialogue[];
						isreplying: boolean;
						progress: number;
					}> {
						const lastMessage = data.dialogue[data.dialogue.length - 1];
						if (
							data.dialogue !== currentDataJson.dialogue &&
							data.dialogue.length > 0 &&
							lastMessage.isuser
						) {
							const message = await invokeLLM(messageJson);

							if (message.blockId && message.blockName) {
								// 両方のブロックIDとブロック名が存在する場合の処理
								console.log(message);
								const response = message.response;
								const newDialogueWithResponse = updateDialogue(
									response,
									messageJson,
									"ai",
								);
								const blockId = message.blockId;
								const newDialogueWithBlockId = updateDialogue(
									blockId,
									newDialogueWithResponse,
									"blockId",
								);
								const blockName = message.blockName;
								const newDialogueWithBlockName = updateDialogue(
									blockName,
									newDialogueWithBlockId,
									"blockName",
								);
								return {
									dialogue: newDialogueWithBlockName.dialogue,
									isreplying: false,
									progress: message.progress,
								};
							}
							if (message.blockId) {
								// ブロックIDが存在する場合の処理
								console.log(message);
								const response = message.response;
								const newDialogueWithResponse = updateDialogue(
									response,
									messageJson,
									"ai",
								);
								const blockId = message.blockId;
								const newDialogueWithBlockId = updateDialogue(
									blockId,
									newDialogueWithResponse,
									"blockId",
								);
								return {
									dialogue: newDialogueWithBlockId.dialogue,
									isreplying: false,

									progress: message.progress,
								};
							}
							if (message.blockName) {
								// ブロック名が存在する場合の処理
								console.log(message);
								const response = message.response;
								const newDialogueWithResponse = updateDialogue(
									response,
									messageJson,
									"ai",
								);
								const blockName = message.blockName;
								const newDialogueWithBlockName = updateDialogue(
									blockName,
									newDialogueWithResponse,
									"blockName",
								);
								return {
									dialogue: newDialogueWithBlockName.dialogue,
									isreplying: false,

									progress: message.progress,
								};
							}

							if (message) {
								// 他のメッセージが存在する場合の処理
								const newDialogue = updateDialogue(
									message.response,
									messageJson,
									"ai",
								);
								return {
									dialogue: newDialogue.dialogue,
									isreplying: false,

									progress: message.progress,
								};
							}
						}
						return {
							dialogue: data.dialogue,
							isreplying: false,

							progress: data.tutorial.progress,
						};
					}

					const updatedData = await updateDialogueLLM(messageJson);
					const dataToPut: SessionValue = {
						sessioncode: sessioncode,
						uuid: uuid,
						workspace: workspace,
						dialogue: updatedData.dialogue,
						isReplying: updatedData.isreplying,
						createdAt: currentDataJson.createdAt,
						updatedAt: new Date(),
						isVMRunning: currentDataJson.isVMRunning,
						clients: currentDataJson.clients,
						language: currentDataJson.language,
						llmContext: llmContext,
						tutorial: {
							...tutorial,
							progress: updatedData.progress,
						},
					};

					await updateDatabase(dataToPut);
					console.log("workspace updated");
				}

				if ((messageJson as WSMessage).request === "open") {
					if ((messageJson as WSMessage).value === (undefined || null || "")) {
						isRunning = false;
						currentDataJson.isVMRunning = isRunning;
						await updateDatabase(currentDataJson);
						updateDatabase(
							updateDialogue(
								i18next.t("error.empty_code"),
								currentDataJson,
								"log",
							),
						);
						sendToAllClients(
							currentDataJson,
							SendIsWorkspaceRunning(isRunning),
						);
						return;
					}
					console.log("test code received. Executing...");
					const result = await ExecCodeTest(
						code,
						currentDataJson.uuid,
						(messageJson as WSMessage).value as string,
						`/vm/${code}`,
						updateDatabase,
					);
					if (result === "Valid uuid") {
						console.log("Script is running...");
						isRunning = true;
						currentDataJson.isVMRunning = isRunning;
						await updateDatabase(currentDataJson);
						sendToAllClients(
							currentDataJson,
							SendIsWorkspaceRunning(isRunning),
						);
					} else {
						console.log(result);
						isRunning = false;
						currentDataJson.isVMRunning = isRunning;
						await updateDatabase(currentDataJson);
						sendToAllClients(
							currentDataJson,
							SendIsWorkspaceRunning(isRunning),
						);
					}
				}

				if ((messageJson as WSMessage).request === "stop") {
					const result = await StopCodeTest(code, uuid);
					console.log(result);
					isRunning = false;
					currentDataJson.isVMRunning = isRunning;
					sendToAllClients(currentDataJson, SendIsWorkspaceRunning(isRunning));
				}
			} catch (error) {
				console.error("Error handling message:", error);
				ws.send("Server error");
			}
		});

		ws.on("close", async () => {
			console.log("disconnected client");
			try {
				const currentData = await sessionDB.get(code);
				const currentDataJson: SessionValue = JSON.parse(currentData);
				currentDataJson.clients = currentDataJson.clients.filter(
					(id) => id !== clientId,
				);
				await sessionDB.put(code, JSON.stringify(currentDataJson));
				clients.delete(clientId); // マップから削除
			} catch (error) {
				console.error("Error closing connection:", error);
			}
		});
	} catch (error) {
		console.log("Error connecting:", error);
		ws.send("Server error");
		ws.close();
	}
});

// 接続コードを元にUUIDを応答する
websocketserver.get("/get/:code", async (req, res) => {
	const code = req.params.code;

	try {
		const value = await sessionDB.get(code).catch(() => null);
		if (!value) {
			res.status(404).send("Session not found");
			return;
		}

		const data: SessionValue = JSON.parse(value);
		if (!data.uuid) {
			res.status(500).send("Session uuid is invalid or not found");
			return;
		}

		res.json({ uuid: data.uuid });
	} catch (error) {
		console.error("Error getting session:", error);
		res.status(500).send("Server error");
	}
});

websocketserver.get("/hello", async (req, res) => {
	res.send("hello");
});

function sendToAllClients(session: SessionValue, message?: WSMessage) {
	for (const id of session.clients) {
		if (clients.has(id)) {
			clients.get(id).send(JSON.stringify(message ? message : session));
		}
	}
}

export default websocketserver;
