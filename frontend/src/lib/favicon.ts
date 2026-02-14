export enum FaviconColor {
  Neutral = 'neutral',
  Blue = 'blue',
  Orange = 'orange',
  Red = 'red',
}

export const FAVICON_COLORS: Record<FaviconColor, string> = {
  [FaviconColor.Neutral]: '#6b7280', // Gray-500
  [FaviconColor.Blue]: '#3b82f6',    // Blue-500
  [FaviconColor.Orange]: '#f97316',  // Orange-500
  [FaviconColor.Red]: '#ef4444',     // Red-500
};

export function getFaviconColor(unreadCount: number): FaviconColor {
  if (unreadCount <= 0) {
    return FaviconColor.Neutral;
  }
  if (unreadCount < 200) {
    return FaviconColor.Blue;
  }
  if (unreadCount < 1000) {
    return FaviconColor.Orange;
  }
  return FaviconColor.Red;
}

export function generateFaviconUri(color: FaviconColor): string {
  const hex = FAVICON_COLORS[color];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <rect width="24" height="24" rx="6" fill="${hex}" />
  <path d="M8 6h8.5v2.5H11v3h5v2.5H11V18H8V6Z" fill="white" />
  <circle cx="17" cy="17" r="2" fill="white" />
</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
