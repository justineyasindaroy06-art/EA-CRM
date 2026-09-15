import { execSync } from "child_process";
import path from "path";
import fs from "fs";

const TEST_DB_PATH = path.resolve(__dirname, "test.db");
const DATABASE_URL = `file:${TEST_DB_PATH}`;

export async function setup() {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);

  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: path.resolve(__dirname, ".."),
    // CHECKPOINT_DISABLE skips Prisma's telemetry ping to checkpoint.prisma.io,
    // which otherwise adds latency (or can hang) in network-restricted
    // environments and serves no purpose for a local test run.
    env: { ...process.env, DATABASE_URL, CHECKPOINT_DISABLE: "1" },
    stdio: "inherit",
  });
}

export async function teardown() {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
}
