#! /usr/bin/env node
import chalk from "chalk"; // 命令行美化工具
import ora from "ora"; // 命令行 loading 效果
import inquirer from "inquirer"; // 命令行交互工具
import fs from "fs-extra"; // 传统fs复制文件目录需要加很多判断比较麻烦,fs-extra解决了这个问题
import path from "path"; // 命令行交互工具
import { program } from "commander"; // 引入commander
import { fileURLToPath } from "url";
import { dirname } from "path";
import create from "../src/scripts/create/index.js";
import server from "../src/scripts/server/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json"), "utf8"));

// 设置命令行名称、使用方法、描述、版本
program.name(pkg.name).usage("<command> [options]").description(chalk.greenBright(pkg.description)).version(pkg.version);

// 定义 create 命令
program
  .command("create [projectName]") // 配置命令的名字和参数
  .description(chalk.greenBright("创建一个项目")) // 命令对应的描述
  .option("-f, --force", chalk.greenBright("如果文件存在就强行覆盖"))
  .action(create);

// 定义 server 命令
program
  .command("server [directory]")
  .description(chalk.greenBright(chalk.bold("启动本地静态文件服务器")))
  .option("-p, --port <port>", `指定${chalk.yellowBright("端口号")}`, "8080")
  .option("-o, --open", "自动打开浏览器", false)
  .action((directory, options) => {
    server(directory, {
      port: parseInt(options.port),
      open: options.open,
    }).catch(() => process.exit(1));
  });

program.parse();
