export interface Config {
  useMocks: boolean;
}

export function getConfig(): Config {
  return {
    useMocks: import.meta.env.VITE_USE_MOCKS === "true",
  };
}

export const config = getConfig();
