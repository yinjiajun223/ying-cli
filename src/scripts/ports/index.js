import assert from "assert/strict";
import { execFile } from "child_process";
import { promisify } from "util";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import inquirer from "inquirer";

const execFileAsync = promisify(execFile);

const SYSTEM_NAMES = new Set([
  "system",
  "svchost.exe",
  "services.exe",
  "lsass.exe",
  "wininit.exe",
  "winlogon.exe",
  "spoolsv.exe",
  "systemd",
  "launchd",
  "kernel_task",
  "postgres",
  "postgres.exe",
  "mysqld",
  "mysqld.exe",
  "redis-server",
  "redis-server.exe",
  "mongod",
  "mongod.exe",
  "chrome",
  "chrome.exe",
  "msedge.exe",
  "firefox",
  "firefox.exe",
]);

const DEV_NAMES = new Set([
  "node",
  "node.exe",
  "python",
  "python.exe",
  "python3",
  "java",
  "java.exe",
  "go",
  "go.exe",
  "dotnet",
  "dotnet.exe",
  "php",
  "php.exe",
  "ruby",
  "ruby.exe",
  "bun",
  "bun.exe",
  "deno",
  "deno.exe",
]);

const DEV_COMMANDS = ["npm run", "pnpm", "yarn", "node_modules", "vite", "next", "nuxt", "webpack", "nodemon", "tsx", "ts-node", "spring-boot", "uvicorn", "flask", "django"];

async function ports(options = {}) {
  const entries = await getPortEntries();

  if (options.kill) {
    await killByPort(Number(options.kill), entries, options);
    return;
  }

  if (options.list) {
    printEntries(entries);
    return;
  }

  await chooseAndKill(entries);
}

async function getPortEntries() {
  const entries = os.platform() === "win32" ? await getWindowsEntries() : await getUnixEntries();

  return entries
    .filter((entry) => entry.port >= 1024)
    .filter(isDevEntry)
    .sort((a, b) => a.port - b.port || a.pid - b.pid);
}

function isDevEntry(entry) {
  const name = entry.name.toLowerCase();
  const command = entry.command.toLowerCase();

  if (SYSTEM_NAMES.has(name)) return false;
  return DEV_NAMES.has(name) || DEV_COMMANDS.some((item) => command.includes(item));
}

async function getWindowsEntries() {
  const { stdout } = await execFileAsync("netstat", ["-ano", "-p", "tcp"], {
    windowsHide: true,
  });
  const listeners = parseWindowsNetstat(stdout);
  const details = await getWindowsProcessDetails([...new Set(listeners.map((entry) => entry.pid))]);

  return listeners.map((entry) => ({
    ...entry,
    name: details.get(entry.pid)?.name || "unknown",
    command: details.get(entry.pid)?.command || "",
  }));
}

function parseWindowsNetstat(text) {
  const seen = new Set();
  const entries = [];

  for (const line of text.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts[0] !== "TCP" || parts[3] !== "LISTENING") continue;

    const port = getPort(parts[1]);
    const pid = Number(parts[4]);
    if (!port || !pid) continue;

    const key = `${port}:${pid}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({ port, pid, address: parts[1] });
  }

  return entries;
}

function getPort(address) {
  return Number(address.match(/:(\d+)$/)?.[1]);
}

async function getWindowsProcessDetails(pids) {
  if (pids.length === 0) return new Map();

  const command = `
$pids = @(${pids.join(",")})
Get-CimInstance Win32_Process | Where-Object { $pids -contains $_.ProcessId } | Select-Object ProcessId,Name,CommandLine | ConvertTo-Json -Compress
`;
  const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-Command", command], { windowsHide: true, maxBuffer: 1024 * 1024 * 5 });

  if (!stdout.trim()) return new Map();

  const rows = JSON.parse(stdout);
  return new Map(
    (Array.isArray(rows) ? rows : [rows]).map((row) => [
      Number(row.ProcessId),
      {
        name: row.Name || "unknown",
        command: row.CommandLine || "",
      },
    ]),
  );
}

async function getUnixEntries() {
  const { stdout } = await execFileAsync("lsof", ["-nP", "-iTCP", "-sTCP:LISTEN"]);

  return stdout
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length >= 9)
    .map((parts) => ({
      name: parts[0],
      pid: Number(parts[1]),
      port: getPort(parts.at(-2) || parts.at(-1)),
      address: parts.at(-2) || parts.at(-1),
      command: parts[0],
    }))
    .filter((entry) => entry.port && entry.pid);
}

function printEntries(entries) {
  if (entries.length === 0) {
    console.log(chalk.yellow("没有发现可关闭的开发端口"));
    return;
  }

  console.log(chalk.cyan.bold("\n本地开发端口："));
  entries.forEach((entry) => {
    console.log(formatEntry(entry));
  });
}

async function chooseAndKill(entries) {
  if (entries.length === 0) {
    console.log(chalk.yellow("没有发现可关闭的开发端口"));
    return;
  }

  const { selected } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selected",
      message: "选择要关闭的端口：",
      choices: entries.map((entry) => ({
        name: formatEntry(entry, false),
        value: entry,
      })),
    },
  ]);

  if (selected.length === 0) return;
  await killEntries(selected);
}

async function killByPort(port, entries, options) {
  if (!Number.isInteger(port)) {
    throw new Error("端口必须是数字");
  }

  const targets = entries.filter((entry) => entry.port === port);
  if (targets.length === 0) {
    console.log(chalk.yellow(`没有发现可关闭的开发端口: ${port}`));
    return;
  }

  if (!options.yes) {
    printEntries(targets);
    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: `确认关闭端口 ${port} 吗？`,
        default: false,
      },
    ]);
    if (!confirm) return;
  }

  await killEntries(targets);
}

async function killEntries(entries) {
  const pids = [...new Set(entries.map((entry) => entry.pid))];

  for (const pid of pids) {
    try {
      await killPid(pid);
      console.log(chalk.green(`已关闭 PID ${pid}`));
    } catch (error) {
      const { force } = await inquirer.prompt([
        {
          type: "confirm",
          name: "force",
          message: `PID ${pid} 关闭失败，是否强制关闭？`,
          default: false,
        },
      ]);

      if (!force) continue;
      await killPid(pid, true);
      console.log(chalk.green(`已强制关闭 PID ${pid}`));
    }
  }
}

async function killPid(pid, force = false) {
  if (os.platform() === "win32") {
    await execFileAsync("taskkill", ["/PID", String(pid), "/T", ...(force ? ["/F"] : [])], { windowsHide: true });
    return;
  }

  process.kill(pid, force ? "SIGKILL" : "SIGTERM");
}

function formatEntry(entry, color = true) {
  const command = shorten(entry.command || entry.address, 120);
  const text = `${String(entry.port).padEnd(6)} PID ${String(entry.pid).padEnd(7)} ${entry.name.padEnd(16)} ${command}`;
  return color ? chalk.white(text) : text;
}

function shorten(text, maxLength) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function selfTest() {
  const entries = parseWindowsNetstat(`
  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       100
  TCP    127.0.0.1:5173         0.0.0.0:0              LISTENING       200
  TCP    [::]:3000              [::]:0                 LISTENING       300
`);

  assert.equal(entries.length, 3);
  assert.equal(entries[1].port, 5173);
  assert.equal(entries[2].port, 3000);
}

if (process.argv.includes("--self-test") && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  selfTest();
}

export { parseWindowsNetstat };
export default ports;
