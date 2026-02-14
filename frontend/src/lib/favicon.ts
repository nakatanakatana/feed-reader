export enum FaviconColor {
  Neutral = 'neutral',
  Blue = 'blue',
  Yellow = 'yellow',
  Red = 'red',
}

export function getFaviconColor(unreadCount: number): FaviconColor {
  if (unreadCount <= 0) {
    return FaviconColor.Neutral;
  }
  if (unreadCount <= 10) {
    return FaviconColor.Blue;
  }
  if (unreadCount <= 50) {
    return FaviconColor.Yellow;
  }
  return FaviconColor.Red;
}
