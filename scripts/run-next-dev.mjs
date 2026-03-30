#!/usr/bin/env node
/**
 * Yerel geliştirme: hep aynı port (varsayılan 3000).
 * Farklı port: ECYCHAT_DEV_PORT=4000 npm run dev
 */
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const port = process.env.ECYCHAT_DEV_PORT ?? "3000";
const baseUrl = `http://localhost:${port}`;

const env = { ...process.env, PORT: port };
if (!env.AUTH_URL) env.AUTH_URL = baseUrl;
if (!env.NEXTAUTH_URL) env.NEXTAUTH_URL = baseUrl;
if (!env.NEXT_PUBLIC_APP_URL) env.NEXT_PUBLIC_APP_URL = baseUrl;

execSync(`npx next dev --webpack -p ${port} -H 127.0.0.1`, {
  stdio: "inherit",
  cwd: root,
  shell: true,
  env,
});
