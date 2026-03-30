#!/usr/bin/env node
/**
 * `next dev` doğrudan çalıştırıldığında ensure atlanmasın diye:
 * önce yerel Postgres/Docker, sonra Next (Edge’e instrumentation sokmadan).
 */
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

execSync("node scripts/ensure-db-local.cjs", { stdio: "inherit", cwd: root, env: process.env });
execSync("node scripts/run-next-dev.mjs", { stdio: "inherit", cwd: root, env: process.env });
