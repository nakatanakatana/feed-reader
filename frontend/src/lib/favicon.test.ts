import { describe, it, expect } from 'vitest';
import { getFaviconColor, FaviconColor } from './favicon';

describe('getFaviconColor', () => {
  it('returns Neutral for 0 unread items', () => {
    expect(getFaviconColor(0)).toBe(FaviconColor.Neutral);
  });

  it('returns Blue for 1-10 unread items', () => {
    expect(getFaviconColor(1)).toBe(FaviconColor.Blue);
    expect(getFaviconColor(5)).toBe(FaviconColor.Blue);
    expect(getFaviconColor(10)).toBe(FaviconColor.Blue);
  });

  it('returns Yellow for 11-50 unread items', () => {
    expect(getFaviconColor(11)).toBe(FaviconColor.Yellow);
    expect(getFaviconColor(30)).toBe(FaviconColor.Yellow);
    expect(getFaviconColor(50)).toBe(FaviconColor.Yellow);
  });

  it('returns Red for 51+ unread items', () => {
    expect(getFaviconColor(51)).toBe(FaviconColor.Red);
    expect(getFaviconColor(100)).toBe(FaviconColor.Red);
  });
});
