import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DynamicFavicon } from "./DynamicFavicon";
import { FaviconColor, generateFaviconUri } from "../lib/favicon";

describe("DynamicFavicon", () => {
  let dispose: () => void;

  beforeEach(() => {
    // Ensure we have a favicon link in the head
    let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = '/favicon.svg';
  });

  afterEach(() => {
    if (dispose) dispose();
    // Reset favicon
    const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (link) {
      link.href = '/favicon.svg';
    }
  });

  it("updates favicon to neutral when unreadCount is 0", async () => {
    dispose = render(() => <DynamicFavicon unreadCount={0} />, document.body);

    const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    expect(link.href).toBe(generateFaviconUri(FaviconColor.Neutral));
  });

  it("updates favicon to blue when unreadCount is 5", async () => {
    dispose = render(() => <DynamicFavicon unreadCount={5} />, document.body);

    const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    expect(link.href).toBe(generateFaviconUri(FaviconColor.Blue));
  });

  it("updates favicon to yellow when unreadCount is 25", async () => {
    dispose = render(() => <DynamicFavicon unreadCount={25} />, document.body);

    const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    expect(link.href).toBe(generateFaviconUri(FaviconColor.Yellow));
  });

  it("updates favicon to red when unreadCount is 100", async () => {
    dispose = render(() => <DynamicFavicon unreadCount={100} />, document.body);

    const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    expect(link.href).toBe(generateFaviconUri(FaviconColor.Red));
  });

  it("restores default favicon on unmount", async () => {
    dispose = render(() => <DynamicFavicon unreadCount={5} />, document.body);

    const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    expect(link.href).toBe(generateFaviconUri(FaviconColor.Blue));

    dispose();
    expect(link.getAttribute('href')).toBe('/favicon.svg');
  });
});
