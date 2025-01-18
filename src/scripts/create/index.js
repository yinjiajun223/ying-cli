import { required } from "./required.js";
import { TEMPLATE_LIST } from "../../config/constant.js";
import ora from "ora";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import simpleGit from "simple-git";
import { promises as fsPromises } from "fs";

async function create(projectName, options) {
  const syncTemplate = ora("创建项目中...");
  const { name, repo } = await required(projectName);
  console.log("name,repo", name, repo);
  try {
    syncTemplate.start();

    const targetDir = path.resolve(process.cwd(), name);

    // 1、判断目录是否存在
    await checkDirExists(!!options?.force, targetDir);

    // 创建项目目录
    await fs.ensureDir(targetDir);

    // 解析 git 仓库地址和分支
    const [repoUrl, branch] = repo.split("#");

    // 初始化 git
    const git = simpleGit();

    // 克隆指定分支的仓库
    await git.clone(repoUrl, targetDir, ["--branch", branch || "master"]);

    // 删除 .git 目录
    await fs.remove(path.join(targetDir, ".git"));

    syncTemplate.succeed(chalk.green("项目创建成功！"));

    console.log(
      chalk.green(`
##    ## #### ##    ##          ######  ##       #### 
 ##  ##   ##  ###   ##         ##    ## ##        ##  
  ####    ##  ####  ##         ##       ##        ##  
   ##     ##  ## ## ## ####### ##       ##        ##  
   ##     ##  ##  ####         ##       ##        ##  
   ##     ##  ##   ###         ##    ## ##        ##  
   ##    #### ##    ##          ######  ######## #### 
        `)
    );
  } catch (err) {
    syncTemplate.fail(chalk.red(chalk.red(err)));
  }
}

async function checkDirExists(force, filePath) {
  //项目存在并且没有强制覆盖
  if (fs.existsSync(filePath) && !force) {
    throw new Error("项目已存在，-f 可强制覆盖");
  }

  //项目存在并且强制覆盖
  if (fs.existsSync(filePath)) {
    await fs.remove(filePath);
  }
}

export default create;
