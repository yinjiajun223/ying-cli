# Ying-CLI 命令行工具

一个命令行工具，包含 Host 修改和本地开发端口管理功能。

## 特性

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

### 修改Host配置

#### 查看当前所有host配置

```bash
ying-cli host -l
ying-cli host --list
y host -l
y host --list
```

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
- `-y, -Y, --yes`: 跳过确认（`-Y` 兼容大写输入）

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

## 项目结构

```
ying-cli/
├── bin/              # CLI 入口文件
├── src/              # 源代码
│   └── scripts/      # 脚本文件
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
