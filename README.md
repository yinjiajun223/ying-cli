# Ying-CLI 脚手架工具

一个功能丰富的命令行脚手架工具，包含项目创建、Host文件管理和本地开发端口管理等功能。

## 特性

- 🚀 快速创建项目
- 📦 支持多种项目模板
- 🔄 自动安装依赖
- 💪 支持强制覆盖已存在的项目
- 🌐 Host文件管理
- 🔌 查看并关闭本地开发端口
- 🎨 友好的命令行界面

## 安装

```bash
# 全局安装
npm install -g ying-cli

# 或者使用 yarn
yarn global add ying-cli
```

安装完成后可使用以下两个命令，效果完全一致：

- `ying-cli`
- `y`

## 使用方法

以下示例默认同时支持 `ying-cli` 和 `y` 两种调用方式。

### 创建新项目

```bash
ying-cli create <project-name>
y create <project-name>
```

#### 参数说明

- `project-name`: 项目名称（必填）
- `-f, --force`: 如果目标目录已存在，强制覆盖

#### 示例

```bash
# 创建新项目
ying-cli create my-project
y create my-project

# 强制覆盖已存在的项目
ying-cli create my-project -f
y create my-project -f
```

### Host文件管理

#### 查看当前所有host配置

```bash
ying-cli host -l
ying-cli host --list
y host -l
y host --list
```

#### 选择默认配置模板

```bash
ying-cli host -c
ying-cli host --create
y host -c
y host --create
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
ying-cli host -s "example.com 127.0.0.1"
ying-cli host --set "test.local 192.168.1.100"
y host -s "example.com 127.0.0.1"
y host --set "test.local 192.168.1.100"
```

#### 删除指定host

```bash
ying-cli host -d example.com
ying-cli host --delete test.local
y host -d example.com
y host --delete test.local
```

#### Host备注说明

- 通过 `set` 新增的条目会自动写入一行 `ying-cli` 管理备注，备注中包含 hostname 和操作时间。
- 删除 host 时，如果目标条目上一行是 `ying-cli` 自动生成的备注，也会一并删除。
- 旧版本生成的 `# 由ying-cli添加 - ...` 备注同样兼容删除。

### 查看并关闭开发端口

```bash
ying-cli ports
y ports
```

#### 参数说明

- `-l, --list`: 只查看端口
- `-k, --kill <port>`: 关闭指定端口
- `-y, --yes`: 跳过确认

#### 示例

```bash
# 查看可关闭的开发端口
ying-cli ports -l
y ports -l

# 交互选择端口并关闭
ying-cli ports
y ports

# 关闭指定端口
ying-cli ports -k 3000
y ports -k 3000
```

## 版本信息

使用 `ying-cli --version` 或 `y --version` 查看当前版本。

使用 `ying-cli --help` 或 `y --help` 查看所有可用命令。

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

## 许可证

ISC

## 作者

yinjiajun 
