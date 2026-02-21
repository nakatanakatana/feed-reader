import { useLiveQuery } from "@tanstack/solid-db";
import { createRootRoute, Link, Outlet } from "@tanstack/solid-router";
import { css } from "../../styled-system/css";
import { DynamicFavicon } from "../components/DynamicFavicon";
import { PwaBadge } from "../components/PwaBadge";
import { itemsUnreadQuery } from "../lib/item-db";

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => {
    return (
      <div>
        <p>This is the notFoundComponent configured on root route</p>
        <Link to="/">Start Over</Link>
      </div>
    );
  },
});

function RootComponent() {
  const unreadItems = useLiveQuery((q) => q.from({ item: itemsUnreadQuery() }));

  const headerStyle = css({
    paddingX: "4",
    paddingY: "2",
    display: "flex",
    alignItems: "center",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "gray.100",
    gap: { base: "2", md: "6" },
    fontSize: "md",
    backgroundColor: "white",
    position: "sticky",
    top: 0,
    zIndex: 10,
  });

  const linkStyleConfig = {
    position: "relative" as const,
    paddingX: { base: "2", md: "3" },
    paddingY: "1.5",
    borderRadius: "md",
    color: "gray.500",
    transition: "all 0.2s",
    fontWeight: "medium",
    fontSize: "sm",
    _hover: {
      backgroundColor: "gray.50",
      color: "gray.900",
    },
  };

  const linkStyle = css(linkStyleConfig);

  const activeLinkStyle = css({
    fontWeight: "semibold",
    color: "blue.700 !important",
    backgroundColor: "blue.50 !important",
    borderBottomWidth: "2px",
    borderBottomStyle: "solid",
    borderBottomColor: "blue.600",
    borderBottomRadius: "0",
  });

  return (
    <>
      <DynamicFavicon unreadCount={unreadItems().length} />
      <PwaBadge unreadCount={unreadItems().length} />
      <header class={headerStyle}>
        <nav
          class={css({
            display: "flex",
            alignItems: "center",
            gap: { base: "2", md: "6" },
            overflowX: "auto",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": {
              display: "none",
            },
            width: "full",
          })}
        >
          <Link
            to="/"
            class={linkStyle}
            activeProps={{
              class: activeLinkStyle,
            }}
            activeOptions={{ exact: true }}
          >
            Home
          </Link>
          <Link
            to="/feeds"
            class={linkStyle}
            activeProps={{
              class: activeLinkStyle,
            }}
          >
            Feeds
          </Link>
          <Link
            to="/tags"
            class={linkStyle}
            activeProps={{
              class: activeLinkStyle,
            }}
          >
            Tags
          </Link>
          <Link
            to="/parsing-rules"
            class={linkStyle}
            activeProps={{
              class: activeLinkStyle,
            }}
          >
            Parsing Rules
          </Link>
          <Link
            to="/blocking"
            class={linkStyle}
            activeProps={{
              class: activeLinkStyle,
            }}
          >
            Blocking
          </Link>
        </nav>
      </header>
      <Outlet />
      {/* Start rendering router matches */}
    </>
  );
}
