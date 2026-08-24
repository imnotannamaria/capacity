import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    // Per-file default. `core/` stays plain Node (no DOM, ADR-008); UI
    // component tests opt into jsdom with a `// @vitest-environment jsdom`
    // pragma at the top of the file instead of switching this globally.
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
  },
})
