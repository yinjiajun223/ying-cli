# Ying-CLI 脚手架工具

一个功能丰富的命令行脚手架工具，包含项目创建、本地服务器启动和Host文件管理等功能。

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

### 3. Host文件管理 (Host)

#### 查看当前所有host配置
```bash
# 查看当前host配置列表
ying-cli host -l
ying-cli host --list
```

#### 选择默认配置模板
```bash
# 选择并应用配置模板
ying-cli host -c
ying-cli host --create
```

内置模板包含：
- **观微前端测试环境**: `dev-web.cxai.chaoxing.com → 127.0.0.1`
- **观微后端测试环境**: `dev-service.cxai.chaoxing.com → 192.168.111.179`
- **能力中心**: `ability-test.chaoxing.com → 127.0.0.1`
- **AI问数**: `aidigi.libsou.com → 127.0.0.1`
- **启明星**: `cx.qmx.chaoxing.com → 127.0.0.1`
- 其他常用开发环境配置

#### 设置host和ip
```bash
# 设置host映射 (注意使用引号)
ying-cli host -s "example.com 127.0.0.1"
ying-cli host --set "test.local 192.168.1.100"
```

#### 删除指定host
```bash
# 删除指定的host条目
ying-cli host -d example.com
ying-cli host --delete test.local
```

## Host管理功能特性

- ✅ **跨平台支持**: 自动检测Windows/Linux/Mac系统
- ✅ **权限检查**: 自动提示管理员权限要求
- ✅ **安全操作**: 所有修改操作都有确认提示
- ✅ **智能解析**: 自动解析和格式化host文件
- ✅ **重复检测**: 自动检测重复条目，提供更新选项
- ✅ **备注支持**: 自动添加操作备注和时间戳
- ✅ **模板系统**: 内置常用配置模板
- ✅ **交互体验**: 美观的命令行界面和进度提示

## 注意事项

### Windows系统
- 需要以**管理员身份**运行PowerShell或命令提示符
- Host文件位置: `C:\Windows\System32\drivers\etc\hosts`

### Linux/Mac系统
- 需要`sudo`权限
- Host文件位置: `/etc/hosts`

## 使用示例

```bash
# 查看当前host配置
ying-cli host -l

# 添加本地开发域名
ying-cli host -s "api.dev.local 127.0.0.1"

# 应用开发环境模板
ying-cli host -c

# 删除不需要的host
ying-cli host -d old.domain.com
```

## 版本信息

使用 `ying-cli --version` 查看当前版本。

使用 `ying-cli --help` 查看所有可用命令。

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
