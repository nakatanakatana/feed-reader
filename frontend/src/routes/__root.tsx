import { createRootRoute, Link, Outlet } from "@tanstack/solid-router";
import { TanStackRouterDevtools } from "@tanstack/solid-router-devtools";
import { css } from "../../styled-system/css";

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
  const headerStyle = css({
    padding: "2px",
    display: "flex",
    alignItems: "center",
    borderBottomWidth: "1px",
    gap: "10px",
    fontSize: "lg",
  });

  const selectedRouteStyle = css({
    fontWeight: "bold",
  });

  return (
    <>
      <div class={headerStyle}>
        <Link
          to="/"
          activeProps={{
            class: selectedRouteStyle,
          }}
          activeOptions={{ exact: true }}
        >
          Home
        </Link>{" "}
        <Link
          to="/feeds"
          activeProps={{
            class: selectedRouteStyle,
          }}
        >
          Feeds
        </Link>{" "}
        <Link
          to="/tags"
          activeProps={{
            class: selectedRouteStyle,
          }}
        >
          Tags
        </Link>{" "}
      </div>
      <hr />
      <Outlet />
      {/* Start rendering router matches */}
      <TanStackRouterDevtools position="bottom-right" />
    </>
  );
}
