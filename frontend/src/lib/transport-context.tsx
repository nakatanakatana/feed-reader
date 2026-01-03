import type { Transport } from "@connectrpc/connect";
import { createContext, type JSX, useContext } from "solid-js";
import { transport as defaultTransport } from "./query";

const TransportContext = createContext<Transport>(defaultTransport);

export function TransportProvider(props: {
	transport: Transport;
	children: JSX.Element;
}) {
	return (
		<TransportContext.Provider value={props.transport}>
			{props.children}
		</TransportContext.Provider>
	);
}

export function useTransport() {
	const context = useContext(TransportContext);
	if (!context) {
		throw new Error("useTransport must be used within a TransportProvider");
	}
	return context;
}
