export async function parseRequest(request: Request): Promise<any> {
  if (request.method === "GET") {
    const url = new URL(request.url);
    const message = url.searchParams.get("message");
    if (message) {
      try {
        const jsonString = atob(message.replace(/-/g, "+").replace(/_/g, "/"));
        return JSON.parse(jsonString);
      } catch {
        try {
          return JSON.parse(decodeURIComponent(message));
        } catch {
          return {};
        }
      }
    }
    return {};
  }
  return await request.json();
}
