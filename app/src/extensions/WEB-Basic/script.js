let html;

log(`your website is online: api/vm/web/${code}`);

// vmExpressはコンテキストとして利用可能
vmExpress.get(`/web/${code}`, async (req, res) => {
	const latestHtml = html;
	res.send(latestHtml);
});
