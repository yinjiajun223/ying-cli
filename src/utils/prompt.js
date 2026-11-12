import inquirer from "inquirer";

export default async function prompt(questions) {
  if (!process.stdin.isTTY) {
    throw Object.assign(new Error("当前环境不支持交互，请在终端中运行"), { isTtyError: true });
  }
  return inquirer.prompt(questions);
}
