import chalk from "chalk";
import ora from "ora";
import prompt from "../../utils/prompt.js";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { isIP } from "net";
import formatHostsList from "./display.js";

// Windows host文件路径
const HOSTS_PATH = path.join(
  os.platform() === "win32" ? "C:\\Windows\\System32\\drivers\\etc" : "/etc",
  "hosts"
);

const MANAGED_COMMENT_PREFIX = "# ying-cli:";
const LEGACY_MANAGED_COMMENT_PREFIX = "# 由ying-cli添加 -";

// 读取host文件
async function readHostsFile() {
  try {
    const content = await fs.readFile(HOSTS_PATH, "utf-8");
    return content;
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`Host文件不存在: ${HOSTS_PATH}`);
    } else if (["EACCES", "EPERM"].includes(error.code)) {
      throw new Error(
        `没有权限访问host文件，请以管理员身份运行: ${HOSTS_PATH}`
      );
    }
    throw error;
  }
}

// 写入host文件
async function writeHostsFile(content) {
  try {
    await fs.writeFile(HOSTS_PATH, content, "utf-8");
  } catch (error) {
    if (["EACCES", "EPERM"].includes(error.code)) {
      throw new Error(
        `没有权限写入host文件，请以管理员身份运行: ${HOSTS_PATH}`
      );
    }
    throw error;
  }
}

async function assertHostsUnchanged(content) {
  if (await readHostsFile() !== content) {
    throw new Error("hosts 文件已发生变化，未执行修改，请重新运行命令确认");
  }
}

function sameHostname(left, right) {
  return left.toLowerCase() === right.toLowerCase();
}

// 解析host文件内容
function parseHostsContent(content) {
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  const entries = [];
  const comments = [];

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      comments.push({ line: trimmedLine, index });
      return;
    }

    const commentIndex = line.indexOf("#");
    const comment = commentIndex === -1 ? "" : line.slice(commentIndex);
    const address = commentIndex === -1 ? line : line.slice(0, commentIndex);
    const parts = address.trim().split(/\s+/);
    if (parts.length >= 2) {
      const [ip, ...hostnames] = parts;
      hostnames.forEach((hostname) => {
        entries.push({ ip, hostname, hostnames, comment, originalLine: line, index });
      });
    }
  });

  return { entries, comments, originalLines: lines, newline };
}

// 格式化host条目为字符串
function formatHostEntry(ip, hostname) {
  return `${ip.padEnd(15)} ${hostname}`;
}

function formatHostLine(ip, hostnames, comment = "") {
  return `${formatHostEntry(ip, hostnames.join(" "))}${comment ? ` ${comment}` : ""}`;
}

function formatManagedComment(hostname) {
  return `${MANAGED_COMMENT_PREFIX} ${hostname} - ${new Date().toLocaleString()}`;
}

function findManagedCommentIndex(lines, entryIndex, hostname) {
  const commentIndex = entryIndex - 1;

  if (commentIndex < 0) {
    return -1;
  }

  const commentLine = lines[commentIndex]?.trim();

  if (!commentLine?.startsWith("#")) {
    return -1;
  }

  if (commentLine.toLowerCase().startsWith(`${MANAGED_COMMENT_PREFIX} ${hostname.toLowerCase()} - `)) {
    return commentIndex;
  }

  if (commentLine.startsWith(LEGACY_MANAGED_COMMENT_PREFIX)) {
    return commentIndex;
  }

  return -1;
}

// 列出当前host配置
async function listHosts() {
  const content = await readHostsFile();
  const { entries } = parseHostsContent(content);
  console.log(formatHostsList(entries, HOSTS_PATH, process.stdout.columns || 100));
}

function validateHostname(input) {
  const hostname = input.trim();
  const labels = hostname.replace(/\.$/, "").split(".");
  return hostname.length <= 253 && labels.every((label) =>
    /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(label)
  ) ? true : "请输入有效的主机名（字母、数字、连字符和点）";
}

function validateIP(input) {
  return isIP(input.trim()) ? true : "请输入有效的IP地址（IPv4 或 IPv6）";
}

// 设置host条目
async function setHost(options) {
  let { hostname, ip } = options;

  // 如果没有提供参数，通过交互获取
  if (!hostname || !ip) {
    const answers = await prompt([
      {
        type: "input",
        name: "hostname",
        message: "请输入主机名(hostname)：",
        default: hostname,
        validate: validateHostname,
      },
      {
        type: "input",
        name: "ip",
        message: "请输入IP地址：",
        default: ip || "127.0.0.1",
        validate: validateIP,
      },
    ]);

    hostname = answers.hostname.trim();
    ip = answers.ip.trim();
  }

  hostname = hostname.trim();
  ip = ip.trim();
  for (const validation of [validateHostname(hostname), validateIP(ip)]) {
    if (validation !== true) throw new Error(validation);
  }

  const spinner = ora(`设置host配置 ${hostname} → ${ip}`).start();

  try {
    const content = await readHostsFile();
    const { entries, originalLines, newline } = parseHostsContent(content);

    // 检查是否已存在相同的hostname
    const matchingEntries = entries.filter((entry) => sameHostname(entry.hostname, hostname));
    const existingEntry = matchingEntries[0];

    if (existingEntry) {
      spinner.info(
        chalk.yellow(`主机名 ${hostname} 已存在，当前IP: ${existingEntry.ip}`)
      );
      console.log(formatHostsList(matchingEntries, HOSTS_PATH, process.stdout.columns || 100));

      const { action } = await prompt([
        {
          type: "list",
          name: "action",
          message: "选择操作：",
          choices: [
            { name: `更新为新IP: ${ip}`, value: "update" },
            { name: "取消操作", value: "cancel" },
          ],
        },
      ]);

      if (action === "cancel") {
        console.log(chalk.yellow("操作已取消"));
        return;
      }

      // 更新现有条目
      const targets = new Map(
        matchingEntries.map((entry) => [entry.index, entry])
      );
      const newLines = originalLines.flatMap((line, index) => {
        const entry = targets.get(index);
        if (!entry) return [line];
        const remaining = entry.hostnames.filter((name) => !sameHostname(name, hostname));
        if (remaining.length === 0) {
          return [formatHostLine(ip, [entry.hostname], entry.comment)];
        }
        const remainingLine = formatHostLine(entry.ip, remaining, entry.comment);
        const updatedLine = formatHostEntry(ip, entry.hostname);
        // Keep a managed marker directly above the hostname it describes.
        return findManagedCommentIndex(originalLines, index, hostname) !== -1
          ? [updatedLine, remainingLine]
          : [remainingLine, updatedLine];
      });

      await assertHostsUnchanged(content);
      await writeHostsFile(newLines.join(newline));
      spinner.succeed(chalk.green(`已更新 ${hostname} → ${ip}`));
    } else {
      // 添加新条目
      const newLines = [...originalLines];
      newLines.push(formatManagedComment(hostname));
      newLines.push(formatHostEntry(ip, hostname));

      await assertHostsUnchanged(content);
      await writeHostsFile(newLines.join(newline));
      spinner.succeed(chalk.green(`已添加 ${hostname} → ${ip}`));
    }
  } catch (error) {
    spinner.stop();
    throw error;
  }
}

// 删除host条目
async function deleteHost(options) {
  let { hostname } = options;
  hostname = hostname?.trim();

  const spinner = ora("读取host配置中...").start();

  try {
    const content = await readHostsFile();
    const { entries, originalLines, newline } = parseHostsContent(content);

    if (entries.length === 0) {
      spinner.fail(chalk.yellow("当前没有任何host配置"));
      return;
    }

    spinner.succeed(chalk.green("读取配置完成"));

    // 如果没有指定hostname，显示列表让用户选择
    if (!hostname) {
      const { selectedHostname } = await prompt([
        {
          type: "list",
          name: "selectedHostname",
          message: "请选择要删除的host条目：",
          pageSize: 12,
          choices: [
            ...entries.map((entry) => ({
              name: `${entry.hostname}  ${chalk.cyanBright(entry.ip)}`,
              value: entry.hostname,
            })),
            { name: "取消", value: null },
          ],
        },
      ]);
      hostname = selectedHostname;
      if (!hostname) {
        console.log(chalk.yellow("操作已取消"));
        return;
      }
    }

    const targetEntries = entries.filter(
      (entry) => sameHostname(entry.hostname, hostname)
    );

    if (targetEntries.length === 0) {
      console.log(chalk.yellow(`未找到主机名: ${hostname}`));
      return;
    }

    // 确认删除
    console.log(formatHostsList(targetEntries, HOSTS_PATH, process.stdout.columns || 100));
    const { confirm } = await prompt([
      {
        type: "confirm",
        name: "confirm",
        message: `确认删除 ${hostname} 的以上 ${targetEntries.length} 条映射吗？`,
        default: false,
      },
    ]);

    if (!confirm) {
      console.log(chalk.yellow("操作已取消"));
      return;
    }

    spinner.start(`删除 ${hostname} 中...`);

    // 删除对应的行
    const linesToDelete = new Set();
    const replacements = new Map();

    targetEntries.forEach((entry) => {
      const remaining = entry.hostnames.filter((name) => !sameHostname(name, hostname));
      if (remaining.length > 0) {
        replacements.set(entry.index, formatHostLine(entry.ip, remaining, entry.comment));
      } else if (entry.comment) {
        replacements.set(entry.index, entry.comment);
      } else {
        linesToDelete.add(entry.index);
      }
      const commentIndex = findManagedCommentIndex(
        originalLines,
        entry.index,
        entry.hostname
      );

      if (commentIndex !== -1) {
        linesToDelete.add(commentIndex);
      }
    });

    const newLines = originalLines.flatMap((line, index) =>
      linesToDelete.has(index) ? [] : [replacements.get(index) ?? line]
    );

    await assertHostsUnchanged(content);
    await writeHostsFile(newLines.join(newline));

    spinner.succeed(chalk.green(`已删除 ${hostname}`));
  } catch (error) {
    spinner.stop();
    throw error;
  }
}

async function deleteAllHosts() {
  const content = await readHostsFile();
  const { entries, originalLines, newline } = parseHostsContent(content);
  const targets = entries.filter((entry) => isIP(entry.ip));

  if (targets.length === 0) {
    console.log(chalk.yellow("当前没有可删除的 hosts 映射"));
    return;
  }

  console.log(formatHostsList(targets, HOSTS_PATH, process.stdout.columns || 100));
  const { confirmAll } = await prompt([
    {
      type: "confirm",
      name: "confirmAll",
      message: `确认删除以上全部 ${targets.length} 条 hosts 映射？`,
      default: false,
    },
  ]);
  if (!confirmAll) {
    console.log(chalk.yellow("操作已取消"));
    return;
  }

  await assertHostsUnchanged(content);

  const backupPath = `${HOSTS_PATH}.ying-cli-${new Date().toISOString().replace(/[:.]/g, "-")}.bak`;
  try {
    await fs.copyFile(HOSTS_PATH, backupPath, fs.constants.COPYFILE_EXCL);
  } catch (error) {
    const reason = ["EACCES", "EPERM"].includes(error.code)
      ? "请以管理员身份运行"
      : error.message;
    throw new Error(`备份失败，未删除任何 hosts 配置：${reason}`);
  }
  console.log(chalk.dim(`已备份：${backupPath}`));

  const targetLines = new Map(targets.map((entry) => [entry.index, entry]));
  const managedComments = new Set();
  targets.forEach((entry) => {
    const index = findManagedCommentIndex(originalLines, entry.index, entry.hostname);
    if (index !== -1) managedComments.add(index);
  });
  const newLines = originalLines.flatMap((line, index) => {
    if (managedComments.has(index)) return [];
    const entry = targetLines.get(index);
    return entry ? (entry.comment ? [entry.comment] : []) : [line];
  });

  await writeHostsFile(newLines.join(newline));
  console.log(chalk.green(`已删除全部 ${targets.length} 条 hosts 映射，用户注释已保留`));
}

// 主函数
async function host(action, options = {}) {
  try {
    switch (action) {
      case "list":
        await listHosts();
        break;
      case "set":
        await setHost(options);
        break;
      case "delete":
        await deleteHost(options);
        break;
      case "deleteAll":
        await deleteAllHosts();
        break;
      default:
        throw new Error(`未知操作: ${action}`);
    }
  } catch (error) {
    if (os.platform() === "win32" && error.message.includes("管理员")) {
      console.log(
        chalk.yellow(
          "\n提示: Windows系统需要以管理员身份运行PowerShell或命令提示符"
        )
      );
    }
    throw error;
  }
}

export default host;
