import { execSync } from "node:child_process"
import path from "node:path"

/**
 * Reseeds the database before the suite runs, so every spec starts from
 * the same known crews/jobs regardless of what a previous manual session
 * left behind. Assumes Postgres is already up (`docker compose up -d
 * postgres`) — this doesn't manage infrastructure, only data.
 */
export default function globalSetup() {
  const apiDir = path.resolve(__dirname, "../../api")
  execSync("uv run python seed.py", { cwd: apiDir, stdio: "inherit" })
}
