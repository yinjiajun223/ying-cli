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

列表以紧凑表格展示域名、IP 和行尾备注，顶部显示记录数与配置文件路径。
长内容按终端宽度换行；窄窗口下自动采用分行布局，保留完整的域名和 IPv6 地址。

#### 设置host和ip

```bash
ying-cli host -s "example.com 127.0.0.1"
ying-cli host --set "test.local 192.168.1.100"
y host -s "example.com 127.0.0.1"
y host --set "test.local 192.168.1.100"

# 也支持分开传参，以及 IPv6
y host --set example.com 127.0.0.1
y host --set test.local ::1

# 不带参数：交互输入主机名和 IP
y host -s
```

主机名和 IP 会在写入前校验。省略参数或只提供主机名时会进入交互补充信息；多余参数会报错。
`-l`、`-s`、`-d` 每次只能选择一种；直接运行 `y host` 会显示帮助。

#### 删除指定host

```bash
ying-cli host -d example.com
ying-cli host --delete test.local
y host -d example.com
y host --delete test.local

# 不带域名：方向键选择，回车后确认删除
y host -d

# 预览并确认删除全部有效映射
y host -d all
```

`-d all` 会删除所有有效的 IPv4/IPv6 映射，包括 localhost、Docker 等条目，不仅限于 ying-cli 添加的记录。
确认默认选择“否”。删除前会在 hosts 同目录创建 `hosts.ying-cli-时间戳.bak` 备份并打印路径；备份失败则不会删除。
用户注释、已注释的映射和未识别内容会保留，相关的 ying-cli 自动备注会一并移除。
需要恢复时，可用管理员权限将打印路径对应的备份文件复制回 hosts 文件。
如果某个域名恰好叫 `all`，可通过 `y host -d` 的列表单独选择它。

#### Host备注说明

- 通过 `set` 新增的条目会自动写入一行 `ying-cli` 管理备注，备注中包含 hostname 和操作时间。
- 删除 host 时，如果目标条目上一行是 `ying-cli` 自动生成的备注，也会一并删除。
- 旧版本生成的 `# 由ying-cli添加 - ...` 备注同样兼容删除。
- 更新或删除一个域名时，会保留同一行的其他域名及用户注释；更新会处理该域名的所有重复映射。
- 列表不会将行尾注释识别为域名，修改时保留文件原有的 LF 或 CRLF 换行方式。
- 域名按大小写不敏感匹配；更新和删除前会展示受影响的全部映射。
- 如果确认期间 hosts 文件被其他程序修改，本次操作会中止，避免覆盖新内容。

### 查看并关闭开发端口

```bash
ying-cli ports
y ports
y p
```

`p`、`port` 和 `ports` 是同一命令。列表采用端口、进程、PID、监听地址四列，端口以亮青色突出显示。
交互模式用空格选择、回车继续，不选直接回车退出。确认前会展示目标进程的启动命令，以及它同时占用的其他端口。

#### 参数说明

- `-l, --list`: 只查看端口
- `-k, --kill <port|all>`: 关闭指定端口，`all` 批量关闭所有查到的开发端口
- `-y, -Y, --yes`: 跳过确认，包括必要时的强制关闭确认；`-k all` 始终需要确认（`-Y` 兼容大写输入）

`-l` 和 `-k` 不能同时使用。交互中按 Ctrl+C 会取消后续操作并退出；已关闭的进程不会恢复。
交互操作需要在终端中运行；非交互环境可使用列表命令，或用 `y p -k 端口 -y` 关闭指定端口。

端口必须是 1–65535 的整数；查询包含 80、443 等低端口，列出被识别为开发进程的 TCP 监听端口。
系统进程、数据库和浏览器等仍按现有规则排除；未被识别为开发进程的监听程序不会列出。
关闭操作会结束占用端口的进程；如果同一进程占用多个端口，确认时会一并列出，且只结束该进程一次。
关闭时先尝试正常结束进程，最多等待 3 秒；未退出或正常关闭失败时，再确认是否强制关闭。
强制关闭后也会检查进程退出，仍在运行则返回错误。Windows 通过 `taskkill /T` 处理目标进程及其子进程。
`y p -k all` 会先展示全部目标端口与进程，再统一确认，默认选择“否”。同一进程只关闭一次；某个进程失败时继续处理其余进程，最后汇总失败项并返回非零退出码。

#### 示例

```bash
# 查看可关闭的开发端口
ying-cli ports -l
y ports -l
y p -l

# 交互选择端口并关闭
ying-cli ports
y ports

# 关闭指定端口
ying-cli ports -k 3000
y ports -k 3000

# 低端口也支持查看与关闭
y p -k 80
y p -k 443

# 确认后关闭所有查到的开发端口
y p -k all
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
- string-width: 终端字符宽度计算，支持中文和 emoji 对齐

## 许可证

ISC

## 作者

yinjiajun 
