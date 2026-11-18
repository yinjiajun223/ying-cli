#! /usr/bin/env node
import chalk from "chalk"; // 命令行美化工具
import fs from "fs-extra"; // 传统fs复制文件目录需要加很多判断比较麻烦,fs-extra解决了这个问题
import path from "path"; // 命令行交互工具
import { program } from "commander"; // 引入commander
import { fileURLToPath } from "url";
import { dirname } from "path";
import host from "../src/scripts/host/index.js";
import ports from "../src/scripts/ports/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../package.json"), "utf8")
);

// 设置命令行名称、使用方法、描述、版本
program
  .name(pkg.name)
  .usage("<command> [options]")
  .description(chalk.greenBright(pkg.description))
  .version(pkg.version);

// 定义 host 命令
program
  .command("host")
  .option("-l, --list", "查看当前host配置")
  .option("-s, --set [values...]", "设置host和ip；省略参数可交互输入")
  .option("-d, --delete [hostname]", "删除host；省略域名可交互选择，all 删除全部映射")
  .description(chalk.greenBright(chalk.bold("修改本地host配置")))
  .action(async (options, command) => {
    if ([options.list, options.set, options.delete].filter((value) => value !== undefined).length > 1) {
      throw new Error("-l、-s、-d 不能同时使用，请选择一种 host 操作");
    }
    if (options.list) {
      await host("list");
    } else if (options.set !== undefined) {
      const values = options.set === true ? [] : options.set.join(" ").trim().split(/\s+/);
      if ((values.length > 0 && !values[0]) || values.length > 2) {
        throw new Error("请提供一个主机名和一个IP地址，例如 --set example.com 127.0.0.1");
      }
      const [hostname, ip] = values;
      await host("set", { hostname, ip });
    } else if (options.delete !== undefined) {
      if (options.delete === "all") {
        await host("deleteAll");
      } else {
        await host("delete", { hostname: options.delete === true ? undefined : options.delete });
      }
    } else {
      command.outputHelp();
    }
  });

// 定义 ports 命令
program
  .command("ports")
  .alias("port")
  .alias("p")
  .description(chalk.greenBright(chalk.bold("查看并关闭本地开发端口")))
  .option("-l, --list", "只查看端口")
  .option("-k, --kill <port...>", "关闭一个或多个指定端口，或单独使用 all 关闭全部开发端口")
  .option("-y, --yes", "跳过确认（-k all 始终需要确认）")
  .option("-Y", "同 -y，跳过确认")
  .action(async (options) => {
    await ports({ ...options, yes: options.yes || options.Y });
  });

program.parseAsync().catch((error) => {
  if (error.name === "ExitPromptError") {
    console.log(chalk.yellow("操作已取消"));
    process.exitCode = 130;
  } else {
    console.error(chalk.red(error.isTtyError
      ? "当前环境不支持交互，请在终端中运行；仅查看可使用 y host -l 或 y p -l"
      : error.message));
    process.exitCode = 1;
  }
});
