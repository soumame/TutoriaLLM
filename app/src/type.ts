export type WSMessage = {
	request: string;
	value?: string | number | boolean | object | null;
};

export type ContentType =
	| "user"
	| "ai"
	| "log"
	| "image"
	| "request"
	| "blockId"
	| "blockName";

export type Dialogue = {
	id: number;
	contentType: ContentType;
	isuser: boolean;
	content: string;
};

//フロントエンドでのチュートリアルの進行度を管理するための型
export type TutorialStats = {
	//チュートリアルの有無
	isTutorial: boolean;
	//チュートリアルのid
	tutorialId: number | null;
	//チュートリアルの進行度
	progress: number;
};

//数値的な統計情報を保存するための型。基本的に全て0からカウントできるnumber型の値を保存する
export type Stats = {
	totalConnectingTime: number;
	currentNumOfBlocks: number;
	totalInvokedLLM: number;
	totalUserMessages: number;
	totalCodeExecutions: number;
};
export type SessionValue = {
	sessioncode: string;
	uuid: string;
	createdAt: Date;
	updatedAt: Date;
	dialogue: Dialogue[];
	isReplying: boolean;
	//シリアル化したBlockly.Workspaceを保存する
	workspace: { [key: string]: any };
	isVMRunning: boolean;
	clients: string[];
	language: string;
	//AIへ与えるコンテキスト
	llmContext: string;
	//チュートリアルの有無や設定を保存する
	tutorial: TutorialStats;
	//数値的な統計情報を保存する
	stats: Stats;
};

//ハイライトするブロック
import type Blockly from "blockly";
export type HighlightedBlock = {
	blockId: string;
	workspace: Blockly.WorkspaceSvg | null;
} | null;

export type WSMinecraftMessage = {
	Header: null;
	Body: null;
};

export type AppConfig = {
	General_Settings: {
		VM_memory_limit_mb: number;
	};
	AI_Settings: {
		Chat_AI_Model: string;
		Chat_AI_Temperature: number;
	};
	Client_Settings: {
		AutoReply: boolean;
		Reply_Time_ms: number;
	};
};
