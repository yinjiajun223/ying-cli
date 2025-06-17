import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { DEFAULT_TEMPLATES } from "../../config/constant.js";

// Windows host文件路径
const HOSTS_PATH = path.join(
  os.platform() === "win32" ? "C:\\Windows\\System32\\drivers\\etc" : "/etc",
  "hosts"
);

// 读取host文件
async function readHostsFile() {
  try {
    const content = await fs.readFile(HOSTS_PATH, "utf-8");
    return content;
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`Host文件不存在: ${HOSTS_PATH}`);
    } else if (error.code === "EACCES") {
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
    if (error.code === "EACCES") {
      throw new Error(
        `没有权限写入host文件，请以管理员身份运行: ${HOSTS_PATH}`
      );
    }
    throw error;
  }
}

// 解析host文件内容
function parseHostsContent(content) {
  const lines = content.split("\n");
  const entries = [];
  const comments = [];

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      comments.push({ line: trimmedLine, index });
      return;
    }

    const parts = trimmedLine.split(/\s+/);
    if (parts.length >= 2) {
      const [ip, ...hostnames] = parts;
      hostnames.forEach((hostname) => {
        entries.push({ ip, hostname, originalLine: line, index });
      });
    }
  });

  return { entries, comments, originalLines: lines };
}

// 格式化host条目为字符串
function formatHostEntry(ip, hostname) {
  return `${ip.padEnd(15)} ${hostname}`;
}

// 列出当前host配置
async function listHosts() {
  const spinner = ora("读取host配置中...").start();

  try {
    const content = await readHostsFile();
    const { entries } = parseHostsContent(content);

    spinner.succeed(chalk.green("读取host配置成功"));

    if (entries.length === 0) {
      console.log(chalk.yellow("当前没有配置任何host条目"));
      return;
    }

    console.log(chalk.cyan.bold("\n当前host配置列表："));
    console.log(chalk.gray("=".repeat(50)));

    entries.forEach((entry, index) => {
      console.log(
        chalk.white(`${(index + 1).toString().padStart(2)}.`) +
          chalk.green(` ${entry.ip.padEnd(15)}`) +
          chalk.blue(` → ${entry.hostname}`)
      );
    });

    console.log(chalk.gray("=".repeat(50)));
    console.log(chalk.yellow(`共 ${entries.length} 条记录`));
  } catch (error) {
    spinner.fail(chalk.red(`读取host配置失败: ${error.message}`));
    throw error;
  }
}

// 创建模板配置
async function createFromTemplate() {
  const spinner = ora("加载模板配置...").start();

  try {
    spinner.succeed(chalk.green("模板加载完成"));

    const { template } = await inquirer.prompt([
      {
        type: "list",
        name: "template",
        message: "请选择要应用的配置模板：",
        choices: DEFAULT_TEMPLATES.map((template, index) => ({
          name: `${template.name} (${template.hostname} ${template.ip})`,
          value: index,
        })),
      },
    ]);

    const selectedTemplate = DEFAULT_TEMPLATES[template];

    console.log(
      chalk.cyan.bold(`\n将要添加的配置 - ${selectedTemplate.name}：`)
    );

    console.log(
      chalk.green(` ${selectedTemplate.ip.padEnd(15)}`) +
        chalk.blue(` → ${selectedTemplate.hostname}`)
    );

    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: "确认要添加这些配置吗？",
        default: true,
      },
    ]);

    if (!confirm) {
      console.log(chalk.yellow("操作已取消"));
      return;
    }

    const applySpinner = ora("应用模板配置中...").start();

    const content = await readHostsFile();
    const { originalLines } = parseHostsContent(content);

    // 添加模板注释和条目
    const newLines = [...originalLines];
    // newLines.push("", `# ${selectedTemplate.name} - 由ying-cli自动添加`);

    newLines.push(
      formatHostEntry(selectedTemplate.ip, selectedTemplate.hostname)
    );

    await writeHostsFile(newLines.join("\n"));

    applySpinner.succeed(
      chalk.green(`模板"${selectedTemplate.name}"应用成功！`)
    );
  } catch (error) {
    spinner.fail(chalk.red(`创建模板配置失败: ${error.message}`));
    throw error;
  }
}

// 设置host条目
async function setHost(options) {
  let { hostname, ip } = options;

  // 如果没有提供参数，通过交互获取
  if (!hostname || !ip) {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "hostname",
        message: "请输入主机名(hostname)：",
        default: hostname,
        validate: (input) => {
          if (!input.trim()) {
            return "主机名不能为空";
          }
          return true;
        },
      },
      {
        type: "input",
        name: "ip",
        message: "请输入IP地址：",
        default: ip || "127.0.0.1",
        validate: (input) => {
          const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
          if (!ipRegex.test(input.trim())) {
            return "请输入有效的IP地址";
          }
          return true;
        },
      },
    ]);

    hostname = answers.hostname.trim();
    ip = answers.ip.trim();
  }

  const spinner = ora(`设置host配置 ${hostname} → ${ip}`).start();

  try {
    const content = await readHostsFile();
    const { entries, originalLines } = parseHostsContent(content);

    // 检查是否已存在相同的hostname
    const existingEntry = entries.find((entry) => entry.hostname === hostname);

    if (existingEntry) {
      spinner.info(
        chalk.yellow(`主机名 ${hostname} 已存在，当前IP: ${existingEntry.ip}`)
      );

      const { action } = await inquirer.prompt([
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
      const newLines = [...originalLines];
      newLines[existingEntry.index] = formatHostEntry(ip, hostname);

      await writeHostsFile(newLines.join("\n"));
      spinner.succeed(chalk.green(`已更新 ${hostname} → ${ip}`));
    } else {
      // 添加新条目
      const newLines = [...originalLines];
      newLines.push(`# 由ying-cli添加 - ${new Date().toLocaleString()}`);
      newLines.push(formatHostEntry(ip, hostname));

      await writeHostsFile(newLines.join("\n"));
      spinner.succeed(chalk.green(`已添加 ${hostname} → ${ip}`));
    }
  } catch (error) {
    spinner.fail(chalk.red(`设置host配置失败: ${error.message}`));
    throw error;
  }
}

// 删除host条目
async function deleteHost(options) {
  let { hostname } = options;

  const spinner = ora("读取host配置中...").start();

  try {
    const content = await readHostsFile();
    const { entries, originalLines } = parseHostsContent(content);

    if (entries.length === 0) {
      spinner.fail(chalk.yellow("当前没有任何host配置"));
      return;
    }

    spinner.succeed(chalk.green("读取配置完成"));

    // 如果没有指定hostname，显示列表让用户选择
    if (!hostname) {
      const { selectedHostname } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedHostname",
          message: "请选择要删除的host条目：",
          choices: entries.map((entry) => ({
            name: `${entry.ip.padEnd(15)} → ${entry.hostname}`,
            value: entry.hostname,
          })),
        },
      ]);
      hostname = selectedHostname;
    }

    const targetEntries = entries.filter(
      (entry) => entry.hostname === hostname
    );

    if (targetEntries.length === 0) {
      console.log(chalk.yellow(`未找到主机名: ${hostname}`));
      return;
    }

    // 确认删除
    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: `确认要删除 ${hostname} 吗？`,
        default: false,
      },
    ]);

    if (!confirm) {
      console.log(chalk.yellow("操作已取消"));
      return;
    }

    const deleteSpinner = ora(`删除 ${hostname} 中...`).start();

    // 删除对应的行
    const linesToDelete = new Set(targetEntries.map((entry) => entry.index));
    const newLines = originalLines.filter(
      (_, index) => !linesToDelete.has(index)
    );

    await writeHostsFile(newLines.join("\n"));

    deleteSpinner.succeed(chalk.green(`已删除 ${hostname}`));
  } catch (error) {
    spinner.fail(chalk.red(`删除host配置失败: ${error.message}`));
    throw error;
  }
}

// 主函数
async function host(action, options = {}) {
  try {
    switch (action) {
      case "list":
        await listHosts();
        break;
      case "create":
        await createFromTemplate();
        break;
      case "set":
        await setHost(options);
        break;
      case "delete":
        await deleteHost(options);
        break;
      default:
        console.log(chalk.red(`未知操作: ${action}`));
        process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red(`操作失败: ${error.message}`));
    if (error.message.includes("管理员")) {
      console.log(
        chalk.yellow(
          "\n提示: Windows系统需要以管理员身份运行PowerShell或命令提示符"
        )
      );
    }
    process.exit(1);
  }
}

export default host;
