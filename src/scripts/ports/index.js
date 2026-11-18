import assert from "assert/strict";
import { execFile } from "child_process";
import { promisify } from "util";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { setTimeout as delay } from "timers/promises";
import chalk from "chalk";
import prompt from "../../utils/prompt.js";
import formatPortsList, { formatPortsHeading, formatPortChoice, formatPortDetails } from "./display.js";

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
  if (options.list && options.kill !== undefined) {
    throw new Error("-l 和 -k 不能同时使用，请选择查看或关闭端口");
  }
  const requested = [].concat(options.kill ?? []);
  const killAll = requested.length === 1 && requested[0] === "all";
  const portNumbers = killAll ? [] : requested.map(Number);
  if (portNumbers.some((port) => !Number.isInteger(port) || port < 1 || port > 65535)) {
    throw new Error("端口必须是 1 到 65535 之间的整数，all 必须单独使用");
  }
  const entries = await getPortEntries();

  if (killAll) {
    if (entries.length === 0) {
      printEntries(entries);
    } else {
      await closeSelected(entries, entries, { ...options, yes: false, killAll, continueOnFailure: true });
    }
    return;
  }

  if (portNumbers.length > 0) {
    await killByPorts(portNumbers, entries, options);
    return;
  }

  if (options.list) {
    printEntries(entries);
    return;
  }

  await chooseAndKill(entries, options);
}

async function getPortEntries() {
  const entries = os.platform() === "win32" ? await getWindowsEntries() : await getUnixEntries();
  const seen = new Set();

  return entries
    .filter((entry) => Number.isInteger(entry.port) && entry.port >= 1 && entry.port <= 65535)
    .filter(isDevEntry)
    .filter((entry) => {
      const key = `${entry.port}:${entry.pid}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
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
  let stdout;
  try {
    ({ stdout } = await execFileAsync("lsof", ["-nP", "-iTCP", "-sTCP:LISTEN"]));
  } catch (error) {
    if (error.code === 1 && !error.stdout?.trim() && !error.stderr?.trim()) return [];
    throw error;
  }

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

function printEntries(entries, details = false) {
  const columns = process.stdout.columns || 100;
  console.log(formatPortsList(entries, columns));
  if (details) console.log(formatPortDetails(entries, columns));
}

async function chooseAndKill(entries, options) {
  if (entries.length === 0) {
    printEntries(entries);
    return;
  }

  console.log(formatPortsHeading(entries, process.stdout.columns || 100));
  const { selected } = await prompt([
    {
      type: "checkbox",
      name: "selected",
      message: options.yes
        ? "选择端口（空格选择，回车关闭；不选直接回车退出）："
        : "选择端口（空格选择，回车继续；不选直接回车退出）：",
      pageSize: 12,
      choices: entries.map((entry) => ({
        name: formatPortChoice(entry),
        value: entry,
      })),
    },
  ]);

  if (selected.length === 0) {
    console.log(chalk.dim("未选择端口，已退出"));
    return;
  }
  await closeSelected(selected, entries, options);
}

async function killByPorts(ports, entries, options) {
  const requested = new Set(ports);
  const targets = entries.filter((entry) => requested.has(entry.port));
  const matched = new Set(targets.map((entry) => entry.port));
  for (const port of requested) {
    if (!matched.has(port)) console.log(chalk.yellow(`没有发现可关闭的开发端口: ${port}`));
  }
  if (targets.length === 0) return;

  await closeSelected(targets, entries, { ...options, continueOnFailure: requested.size > 1 });
}

async function closeSelected(selected, entries, options) {
  const pids = new Set(selected.map((entry) => entry.pid));
  const targets = entries.filter((entry) => pids.has(entry.pid));
  if (!options.yes) {
    printEntries(targets, true);
    const ports = [...new Set(targets.map((entry) => entry.port))].join("、");
    const { confirm } = await prompt([
      {
        type: "confirm",
        name: "confirm",
        message: options.killAll
          ? `确认关闭以上全部 ${new Set(targets.map((entry) => entry.port)).size} 个开发端口（${pids.size} 个进程）？`
          : `确认结束 ${pids.size} 个进程并关闭端口 ${ports}？`,
        default: false,
      },
    ]);
    if (!confirm) {
      console.log(chalk.yellow("操作已取消"));
      return;
    }
  }

  await killEntries(targets, options);
}

async function killEntries(entries, options) {
  const pids = [...new Set(entries.map((entry) => entry.pid))];
  const failures = [];

  for (const pid of pids) {
    try {
      await closeProcess(pid, options);
    } catch (error) {
      if (error.name === "ExitPromptError" || error.isTtyError || !options.continueOnFailure) throw error;
      failures.push(`PID ${pid}: ${error.message}`);
    }
  }
  if (failures.length > 0) {
    throw new Error(`有 ${failures.length} 个进程未能关闭：\n${failures.join("\n")}`);
  }
}

async function closeProcess(pid, options) {
  let stopped = false;
  let failure = "进程仍在运行";
  try {
    await killPid(pid);
    stopped = await waitForExit(pid);
  } catch (error) {
    stopped = !isProcessRunning(pid);
    failure = error.message;
  }

  if (stopped) {
    console.log(chalk.green(`已关闭 PID ${pid}`));
    return;
  }

  let confirmForce = options.yes;
  if (!confirmForce) {
    ({ confirmForce } = await prompt([
      {
        type: "confirm",
        name: "confirmForce",
        message: `PID ${pid} 未退出（${failure}），是否强制关闭？`,
        default: false,
      },
    ]));
  }
  if (!confirmForce) {
    throw new Error(`PID ${pid} 仍在运行，未强制关闭`);
  }
  try {
    await killPid(pid, true);
  } catch (error) {
    if (isProcessRunning(pid)) throw error;
  }
  if (!(await waitForExit(pid))) {
    throw new Error(`PID ${pid} 强制关闭后仍在运行`);
  }
  console.log(chalk.green(`已强制关闭 PID ${pid}`));
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") return false;
    throw error;
  }
}

async function waitForExit(pid) {
  const deadline = Date.now() + 3000;
  while (isProcessRunning(pid)) {
    if (Date.now() >= deadline) return false;
    await delay(100);
  }
  return true;
}

async function killPid(pid, force = false) {
  if (os.platform() === "win32") {
    await execFileAsync("taskkill", ["/PID", String(pid), "/T", ...(force ? ["/F"] : [])], { windowsHide: true });
    return;
  }

  process.kill(pid, force ? "SIGKILL" : "SIGTERM");
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
