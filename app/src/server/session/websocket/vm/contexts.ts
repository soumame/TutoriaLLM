import IsolatedVM from "isolated-vm";
import type LogBuffer from "./log.js";
import type ExpressWs from "express-ws";
import type { Response } from "express-serve-static-core";
import type { IncomingHttpHeaders } from "node:http";

const messageHandlers = new Map();

function handleMessageFromVM(uuid: string, message: any) {
	const handler = messageHandlers.get(uuid);
	if (handler) {
		handler(message);
	}
}

export default async function addDefaultContexts(
	jail: IsolatedVM.Reference,
	code: string,
	uuid: string,
	serverRootPath: string,
	logBuffer: LogBuffer,
	vmExpress: ExpressWs.Router,
) {
	await jail.set("global", jail.derefInto());
	await jail.set("code", new IsolatedVM.ExternalCopy(code).copyInto());
	await jail.set("uuid", new IsolatedVM.ExternalCopy(uuid).copyInto());
	await jail.set(
		"serverRootPath",
		new IsolatedVM.ExternalCopy(serverRootPath).copyInto(),
	);

	// Set logging functions
	await jail.set("log", (...args: string[]) => {
		const log = args.map((arg) => arg.toString());
		logBuffer.add(log.join(" "));
	});
	await jail.set("error", (...args: string[]) => {
		const log = args.map((arg) => arg.toString());
		logBuffer.add(log.join(" "));
	});

	// Set sleep function
	await jail.set("sleep", async (ms: number | undefined) => {
		return new Promise((resolve) => setTimeout(resolve, ms));
	});

	// Set messaging functions
	await jail.set("sendMessageToMain", (message: any) => {
		handleMessageFromVM(uuid, message);
	});
	await jail.set("onmessage", (handler: any) => {
		messageHandlers.set(uuid, handler);
	});

	// Set HTTP server function
}
