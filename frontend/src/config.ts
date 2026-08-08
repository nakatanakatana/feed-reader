export interface Config {
  useMocks: boolean;
  readOnly: boolean;
}

export function getConfig(): Config {
  return {
    useMocks: import.meta.env.VITE_USE_MOCKS === "true",
    readOnly: import.meta.env.VITE_READONLY === "true",
  };
}

export const config = getConfig();
