let wss;
const onMessageEvents = [];
const onConnectEvents = [];
const onDisconnectEvents = [];

log(`Connect your Minecraft at: api/vm/${code}`);

const events = [
	"AdditionalContentLoaded",
	"AgentCommand",
	"AgentCreated",
	"ApiInit",
	"AppPaused",
	"AppResumed",
	"AppSuspended",
	"AwardAchievement",
	"BlockBroken",
	"BlockPlaced",
	"BoardTextUpdated",
	"BossKilled",
	"CameraUsed",
	"CauldronUsed",
	"_ChunkChanged_1.0.2",
	"_ChunkLoaded_1.0.2",
	"_ChunkUnloaded_1.0.2",
	"ConfigurationChanged",
	"ConnectionFailed",
	"CraftingSessionCompleted",
	"EndOfDay",
	"EntitySpawned",
	"FileTransmissionCancelled",
	"FileTransmissionCompleted",
	"FileTransmissionStarted",
	"FirstTimeClientOpen",
	"FocusGained",
	"FocusLost",
	"GameSessionComplete",
	"GameSessionStart",
	"HardwareInfo",
	"HasNewContent",
	"ItemAcquired",
	"ItemCrafted",
	"ItemDestroyed",
	"ItemDropped",
	"ItemEnchanted",
	"ItemSmelted",
	"ItemUsed",
	"JoinCanceled",
	"JukeboxUsed",
	"LicenseCensus",
	"MascotCreated",
	"MenuShown",
	"MobInteracted",
	"MobKilled",
	"MultiplayerConnectionStateChanged",
	"MultiplayerRoundEnd",
	"MultiplayerRoundStart",
	"NpcPropertiesUpdated",
	"OptionsUpdated",
	"performanceMetrics",
	"PackImportStage",
	"PlayerBounced",
	"PlayerDied",
	"PlayerJoin",
	"PlayerLeave",
	"PlayerMessage",
	"PlayerTeleported",
	"PlayerTransform",
	"PlayerTravelled",
	"PortalBuilt",
	"PortalUsed",
	"PortfolioExported",
	"PotionBrewed",
	"PurchaseAttempt",
	"PurchaseResolved",
	"RegionalPopup",
	"RespondedToAcceptContent",
	"ScreenChanged",
	"ScreenHeartbeat",
	"SignInToEdu",
	"SignInToXboxLive",
	"SignOutOfXboxLive",
	"SpecialMobBuilt",
	"StartClient",
	"StartWorld",
	"TextToSpeechToggled",
	"UgcDownloadCompleted",
	"UgcDownloadStarted",
	"UploadSkin",
	"VehicleExited",
	"WorldExported",
	"WorldFilesListed",
	"WorldGenerated",
	"WorldLoaded",
	"WorldUnloaded",
];

// vmExpressはコンテキストとして利用可能
vmExpress.ws(`/${code}`, async (ws, req) => {
	wss = ws;

	console.log("Connection established with Minecraft.");

	for (const eventName of events) {
		ws.send(JSON.stringify(subscribeMsg(eventName)));
	}

	for (const event of onConnectEvents) {
		event();
	}
	ws.send(JSON.stringify(commandMsg("/say Connected!")));

	ws.on("message", async (message) => {
		for (const event of onMessageEvents) {
			event(message);
		}
	});

	ws.on("close", () => {
		for (const event of onDisconnectEvents) {
			event();
		}
	});

	ws.on("error", (err) => {
		console.log(err);
		ws.close();
	});
});
