# Ying CLI

一个简单而强大的项目脚手架工具，帮助你快速创建项目模板和启动本地开发服务器。

## 特性

- 🚀 快速创建项目
- 📦 支持多种项目模板
- 🔄 自动安装依赖
- 💪 支持强制覆盖已存在的项目
- 🌐 内置静态文件服务器
- 🎨 友好的命令行界面

## 安装

```bash
# 全局安装
npm install -g ying-cli

# 或者使用 yarn
yarn global add ying-cli
```

## 使用方法

### 创建新项目

```bash
ying-cli create <project-name>
```

#### 参数说明

- `project-name`: 项目名称（必填）
- `-f, --force`: 如果目标目录已存在，强制覆盖

#### 示例

```bash
# 创建新项目
ying-cli create my-project

# 强制覆盖已存在的项目
ying-cli create my-project -f
```

### 启动开发服务器

```bash
ying-cli server [directory]
```

#### 参数说明

- `directory`: 要服务的目录（可选，默认为当前目录）
- `-p, --port`: 指定端口号（默认：8080）
- `-o, --open`: 自动打开浏览器

#### 示例

```bash
# 在当前目录启动服务器
ying-cli server

# 指定端口和目录
ying-cli server ./dist -p 3000

# 启动服务器并自动打开浏览器
ying-cli server -o
```

## 可用模板

目前支持以下项目模板：

- Vue2 + Ts + Vant + H5
- Vue2 + Ts + Vant + Appweb

## 项目结构

```
ying-cli/
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

- commander: 命令行工具
- chalk: 命令行美化
- inquirer: 交互式命令行
- ora: 加载动画
- fs-extra: 文件操作
- express: 静态服务器

## 许可证

ISC

## 作者

yinjiajun 
