# Ying-CLI

[简体中文](README.md)

Ying-CLI manages your local hosts file and shows or closes TCP ports used by development processes.

## Install

```bash
npm install -g ying-cli
# Or use Yarn Classic
yarn global add ying-cli
```

Both `ying-cli` and `y` run the same CLI.

## Manage the hosts file

### List mappings

```bash
y host -l
y host --list
```

The list shows hostnames, IP addresses, and inline comments. It wraps long entries and switches to a stacked layout in narrow terminals.

### Set a mapping

```bash
y host -s "example.com 127.0.0.1"
y host --set example.com 127.0.0.1
y host --set test.local ::1
y host -s
```

The command validates the hostname and IP address before writing. Omit the arguments to enter both values interactively, or supply only the hostname to be prompted for the IP address. Extra arguments produce an error.

### Delete mappings

```bash
y host -d example.com
y host --delete test.local
y host -d
y host -d all
```

With no hostname, use the arrow keys to select a mapping and press Enter to review the deletion. You can use this method to select a hostname literally named `all`.

`y host -d all` previews all valid IPv4 and IPv6 mappings, including localhost and Docker entries. Confirmation defaults to No. Before deleting, the command creates a `hosts.ying-cli-<timestamp>.bak` file alongside the hosts file and prints its path. If the backup fails, the operation stops. To restore, copy the backup over the hosts file with administrator privileges.

Use one of `-l`, `-s`, or `-d` per invocation. Run `y host` to see help.

- New mappings include a comment with the hostname and creation time. Deletion removes the corresponding Ying-CLI comment, including comments created by older releases.
- Updates and deletions preserve other hostnames on the same line and user comments. Bulk deletion also preserves commented-out mappings and unrecognized lines.
- Matching is case-insensitive. The command shows affected mappings before updating or deleting them, and updates all matching entries for a hostname.
- Edits preserve LF or CRLF line endings. If the hosts file changes during confirmation, the operation stops.

## Manage development ports

Use `y p`, `y port`, or `y ports`. The interactive picker uses Space to select and Enter to continue. Press Enter with an empty selection to exit.

| Option | Behavior |
| --- | --- |
| `-l`, `--list` | List development ports. |
| `-k`, `--kill <port...>` | Close one or more space-separated ports. Use `all` by itself to select every detected development port. |
| `-y`, `-Y`, `--yes` | Skip confirmation, including any force-close prompt. Closing `all` always requires confirmation. |

```bash
y p -l
y p -k 3000
y p -k 5173 5174
y p -k 5173 5174 -Y
y p -k all
```

- Use either `-l` or `-k` per invocation. Ports must be integers from 1 through 65535, including low ports such as 80 and 443.
- The list shows TCP listeners recognized as development processes. System processes, databases, browsers, and unrecognized programs are excluded.
- When you specify ports, the CLI reports each port that has no matching development process. It previews the remaining targets and asks for confirmation once unless you pass `-Y`. If no ports match, it exits without prompting.
- The preview includes the target processes and other detected ports they occupy. Each process is stopped once, even if it owns multiple selected ports.
- The command first attempts a normal shutdown and waits up to three seconds. If necessary, it asks before force-closing, then checks that the process has stopped. On Windows, `taskkill /T` closes the target and its child processes.
- When you specify multiple ports or use `all`, the command continues after an individual process fails to close, reports failures at the end, and exits with a nonzero status. Ctrl+C cancels the remaining work.
- Interactive prompts require a terminal. In non-interactive environments, use `-l` to list or pass `-Y` with explicit ports to close them.

## Help and version

```bash
y --help
y p --help
y --version
```

## Development

```bash
git clone https://github.com/yinjiajun223/ying-cli.git
cd ying-cli
npm install
npm link
```

The CLI entry point is in `bin/`. Command implementations and helpers are in `src/`. Dependencies include Commander, Chalk, Inquirer, Ora, fs-extra, and string-width.

## License

ISC, by yinjiajun.
