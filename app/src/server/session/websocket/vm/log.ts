// ログを蓄積するバッファと定期的なDB更新関数
export default class LogBuffer {
	private buffer: string[] = [];
	private interval: NodeJS.Timeout | null = null;

	constructor(
		private dbUpdater: (code: string, logs: string[]) => Promise<void>,
		private code: string,
	) {}

	start() {
		if (this.interval) return;
		this.interval = setInterval(() => this.flush(), 1000);
	}

	stop() {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
		}
	}

	add(log: string) {
		this.buffer.push(log);
	}

	private async flush() {
		if (this.buffer.length === 0) return;
		const logsToSave = [...this.buffer];
		this.buffer = [];
		try {
			await this.dbUpdater(this.code, logsToSave);
		} catch (e) {
			console.error("Error updating DB with logs:", e);
		}
	}
}
