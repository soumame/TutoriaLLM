import { DoorOpen } from "lucide-react";
export function ExitButton(props: { text: string; onClick: () => void }) {
	return (
		<button
			type="button"
			className="flex p-4 gap-0.5 h-fit justify-center items-center bg-red-500 font-semibold hover:bg-red-300 transition-colors duration-150 border border-red-500 rounded-2xl text-white hover:text-gray-700 text-nowrap"
			onClick={() => {
				props.onClick();
			}}
		>
			<DoorOpen />
			<span className="hidden sm:block">{props.text}</span>
		</button>
	);
}
