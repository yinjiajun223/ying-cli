# Yin CLI

一个简单而强大的项目脚手架工具，帮助你快速创建项目模板。

## 特性

- 🚀 快速创建项目
- 📦 支持多种项目模板
- 🔄 自动安装依赖
- 💪 支持强制覆盖已存在的项目
- 🎨 友好的命令行界面

## 安装

```bash
# 全局安装
npm install -g yin-cli

# 或者使用 yarn
yarn global add yin-cli
```

## 使用方法

### 创建新项目

```bash
yin-cli create <project-name>
```

### 参数说明

- `project-name`: 项目名称（必填）
- `-f, --force`: 如果目标目录已存在，强制覆盖

### 示例

```bash
# 创建新项目
yin-cli create my-project

# 强制覆盖已存在的项目
yin-cli create my-project -f
```

## 可用模板

目前支持以下项目模板：

- Vue2 + Ts + Vant + H5
- Vue2 + Ts + Vant + Appweb

## 项目结构

```
yin-cli/
├── bin/              # CLI 入口文件
├── src/              # 源代码
│   ├── config/       # 配置文件
│   └── scripts/      # 脚本文件
└── templates/        # 项目模板
```

## 开发

```bash
# 克隆项目
git clone <repository-url>

# 安装依赖
npm install

# 链接到全局
npm link
```

## 依赖项

- chalk: 命令行美化工具
- commander: 命令行工具
- inquirer: 交互式命令行工具
- ora: 命令行 loading 效果
- fs-extra: 文件系统操作工具
- simple-git: Git 操作工具

## 许可证

ISC

## 作者

yinjiajun 