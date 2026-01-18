import { Show } from "solid-js";
import { css } from "../../styled-system/css";
import { stack } from "../../styled-system/patterns";
import { useItem } from "../lib/items";

interface ItemDetailProps {
	itemId: string;
	onClose: () => void;
}

export function ItemDetail(props: ItemDetailProps) {
	const query = useItem(() => props.itemId);

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: Backdrop
		// biome-ignore lint/a11y/noStaticElementInteractions: Backdrop
		<div
			class={css({
				position: "fixed",
				inset: "0",
				backgroundColor: "rgba(0,0,0,0.5)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: "4",
				zIndex: "100",
			})}
			onClick={props.onClose}
		>
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: stop propagation */}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: stop propagation */}
			<div
				role="document"
				class={stack({
					width: "full",
					maxWidth: "3xl",
					maxHeight: "90vh",
					backgroundColor: "white",
					borderRadius: "lg",
					overflow: "hidden", // Prevent outer scrolling
					gap: "0", // Remove gap handled by padding/layout
				})}
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
			>
				{/* Fixed Header */}
				<div
					class={stack({
						gap: "2",
						padding: "6",
						paddingBottom: "4",
						borderBottom: "1px solid",
						borderColor: "gray.100",
						backgroundColor: "white",
						zIndex: "10",
					})}
				>
					<button
						type="button"
						onClick={props.onClose}
						class={css({
							alignSelf: "flex-end",
							padding: "2",
							cursor: "pointer",
							color: "gray.500",
							_hover: { color: "black" },
						})}
					>
						Close
					</button>

					<Show when={query.isLoading}>
						<div class={css({ padding: "4", textAlign: "center" })}>
							Loading...
						</div>
					</Show>

					<Show when={query.isError}>
						<div class={css({ padding: "4", color: "red.500" })}>
							Error: {query.error?.message}
						</div>
					</Show>

					<Show when={query.data}>
						{(item) => (
							<>
								<h2 class={css({ fontSize: "2xl", fontWeight: "bold" })}>
									<a
										href={item().url}
										target="_blank"
										rel="noreferrer"
										class={css({
											_hover: {
												color: "blue.600",
												textDecoration: "underline",
											},
										})}
									>
										{item().title}
									</a>
								</h2>
								<div class={css({ fontSize: "sm", color: "gray.500" })}>
									<a
										href={item().url}
										target="_blank"
										rel="noreferrer"
										class={css({
											color: "blue.600",
											_hover: { textDecoration: "underline" },
										})}
									>
										Original Article
									</a>
									<Show when={item().author}>
										{(author) => <span> • {author()}</span>}
									</Show>
									<Show when={item().publishedAt}>
										{(date) => (
											<span> • {new Date(date()).toLocaleString()}</span>
										)}
									</Show>
								</div>
							</>
						)}
					</Show>
				</div>

				{/* Scrollable Content */}
				<div
					class={stack({
						padding: "6",
						paddingTop: "4",
						overflowY: "auto",
						gap: "6",
					})}
				>
					<Show when={query.data}>
						{(item) => (
							<>
								<Show when={item().imageUrl}>
									<img
										src={item().imageUrl}
										alt=""
										class={css({
											width: "full",
											maxHeight: "xs",
											objectFit: "cover",
											borderRadius: "md",
										})}
									/>
								</Show>

								<div
									class={css({
										fontSize: "md",
										lineHeight: "relaxed",
										"& a": { color: "blue.600", textDecoration: "underline" },
										"& img": { maxWidth: "full", height: "auto" },
										"& iframe": { maxWidth: "full", height: "auto" },
									})}
									// biome-ignore lint/security/noDangerouslySetInnerHtml: Trusted content
									innerHTML={item().content || item().description}
								/>
							</>
						)}
					</Show>
				</div>
			</div>
		</div>
	);
}