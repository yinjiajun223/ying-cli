import inquirer from "inquirer";
import { TEMPLATE_LIST } from "../../config/constant.js";

export function required(createName) {
  return inquirer.prompt([
    {
      name: "name",
      type: "input",
      default: createName,
      message: "请输入你的项目名称",
      filter: (val) => val.trim(),
      validate: (val) => (val ? true : "项目名称必填"),
    },
    {
      name: "repo",
      type: "list",
      message: "请选择你要创建的模板",
      choices: TEMPLATE_LIST,
    },
  ]);
};
