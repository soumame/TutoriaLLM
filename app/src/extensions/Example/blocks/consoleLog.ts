import { Order, javascriptGenerator } from "blockly/javascript";

export const block = {
	type: "ext_example_console_log",
	message0: "%{BKY_EXAMPLE_CONSOLE_LOG} %1",
	args0: [
		{
			type: "field_input",
			name: "TEXT",
			text: "hello world!",
		},
	],
	previousStatement: null,
	nextStatement: null,
	colour: 230,
	tooltip: "",
	helpUrl: "",
};

export function code() {
	javascriptGenerator.forBlock.ext_example_console_log = (block, generator) => {
		// Collect argument strings.
		const text_text = block.getFieldValue("TEXT");

		const code = `log("${text_text}");\n`;

		// Return code.
		return code;
	};
}

export const locale = {
	ja: {
		EXAMPLE_CONSOLE_LOG: "コンソールにテキストを送信",
	},
	en: {
		EXAMPLE_CONSOLE_LOG: "send console.log text",
	},
};
