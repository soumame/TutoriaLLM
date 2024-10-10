import * as Progress from "@radix-ui/react-progress";
import { DoorOpen, HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import ExecSwitch from "../ui/ExecSwitch.js";
import { ExitButton } from "../ui/exitButton.js";
import { useAtomValue } from "jotai";
import { currentSessionState } from "../../state.js";
import { useTour } from "@reactour/tour";
import { saveSessionDataToIndexedDB } from "../../indexedDB.js";
import type { SessionValue } from "../../../type.js";

export default function Navbar(props: {
	code: string;
	isConnected: boolean;
	isTutorial: boolean;
	tutorialProgress: number | null | undefined;
}) {
	const { t } = useTranslation();
	const sessionValue = useAtomValue(currentSessionState);
	function handleExit() {
		location.href = "/";
	}
	//可能な場合はローカルストレージにデータを保存
	const sessionValueToSave = {
		...sessionValue,
		clients: [],
		screenshot: "",
		clicks: [],
	} as SessionValue;
	if (sessionValue) {
		saveSessionDataToIndexedDB(
			`session-${sessionValue.uuid}`,
			sessionValueToSave,
		);
	}
	const { setIsOpen } = useTour(); // ツアーの開始/終了を管理するフック

	return (
		<div className="navbar flex-col sm:flex-row justify-center shrink w-full p-2 md:p-4 bg-gray-200 border-b-2 border-gray-300 text-gray-800 z-50 flex gap-2">
			<div className="flex flex-row justify-between items-center gap-4">
				{props.isConnected ? (
					<ExitButton text={t("navbar.saveAndLeave")} onClick={handleExit} />
				) : null}

				<div className="flex justify-center items-center gap-2">
					<span className="text-xs joinCode">
						<p>{t("navbar.joinCode")}</p>
						<p className="font-semibold text-base md:text-xl tracking-widest">
							{props.code}
						</p>
					</span>
				</div>
			</div>
			<hr className="border border-gray-300 h-full" />
			<div
				className={`flex flex-row gap-2 justify-between items-center${props.isConnected ? " w-full" : ""}`}
			>
				<span className="text-xs flex w-fit h-fit">
					{props.isTutorial && typeof props.tutorialProgress === "number" ? (
						<div className="p-2">
							<Progress.Root
								max={100}
								value={props.tutorialProgress}
								className="rounded-full bg-gray-300 w-32 h-3 overflow-hidden"
							>
								<Progress.Indicator
									className="bg-green-400 rounded-full w-full h-full transition-transform duration-[660ms] ease-[cubic-bezier(0.65, 0, 0.35, 1)]"
									style={{
										transform: `translateX(-${100 - props.tutorialProgress}%)`,
									}}
								/>
							</Progress.Root>
							<p className="text-base">{props.tutorialProgress}%</p>
						</div>
					) : (
						<p className="p-2 rounded-lg bg-red-300 w-full line-clamp-2">
							{props.isConnected
								? t("navbar.noTutorial")
								: t("navbar.reconnecting")}
						</p>
					)}
				</span>
				{props.isConnected ? (
					<span className="flex gap-1.5 justify-center items-center">
						<button
							type="button"
							onClick={() => setIsOpen(true)} // ツアーを開始する
							className="bg-gray-300 group text-gray-500 flex justify-center items-center text-sm max-w-sm rounded-2xl p-1.5 md:p-2 hover:text-gray-200 gap-2 transition-all startTour"
						>
							<HelpCircle className="group-hover:text" />
						</button>
						<span className="border border-gray-300 h-4 md:h-8" />
						<ExecSwitch />
					</span>
				) : null}
			</div>
		</div>
	);
}
