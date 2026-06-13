let redirecting = false;

export const resetUnauthorizedRedirectGuard = (): void => {
  redirecting = false;
};

export const redirectOnUnauthorized = (): void => {
  if (typeof window === "undefined" || redirecting) return;
  redirecting = true;

  if (window.location.pathname === "/") {
    window.location.reload();
  } else {
    window.location.assign("/");
  }
};
