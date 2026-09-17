import baseConfig from "../vite.config.js";

const browserProject = baseConfig.test.projects.find(
  (project) => project.test.name === "browser",
);

if (!browserProject) {
  throw new Error("Browser Vitest project is not configured");
}

browserProject.test.api = {
  port: Number(process.env.VITEST_BROWSER_API_PORT ?? 63315),
  strictPort: true,
};

export default baseConfig;
