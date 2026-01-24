export const normalizeUrl = (url: string): string => {
  let trimmed = url.trim();
  if (!trimmed) return "";
  
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = "https://" + trimmed;
  }
  
  try {
    const parsed = new URL(trimmed);
    // Remove trailing slash if it's just the root
    if (parsed.pathname === "/" && !trimmed.endsWith("/")) {
      // Keep as is if user didn't provide slash? 
      // Actually URL objects usually add a slash.
    }
    return parsed.toString();
  } catch {
    return trimmed;
  }
};
