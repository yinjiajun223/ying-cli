import chalk from "chalk";
import stringWidth from "string-width";
import { cleanText, wrapText, pad } from "../../utils/terminal.js";

export function formatPortsHeading(entries, columns = 100) {
  const width = Math.max(16, Math.min(columns, 120) - 3);
  const counts = `${new Set(entries.map((entry) => entry.port)).size} 个端口 · ${new Set(entries.map((entry) => entry.pid)).size} 个进程`;
  const title = chalk.cyanBright.bold("PORTS");
  return stringWidth(`PORTS  ${counts}`) <= width
    ? `\n  ${title}  ${chalk.dim(counts)}\n`
    : `\n  ${title}\n${wrapText(counts, width).map((line) => `  ${chalk.dim(line)}`).join("\n")}\n`;
}

export function formatPortChoice(entry) {
  return `${chalk.cyanBright(pad(String(entry.port), 5))}  ${cleanText(entry.name)}  ${chalk.dim(`PID ${entry.pid} · ${cleanText(entry.address)}`)}`;
}

export function formatPortDetails(entries, columns = 100) {
  const processes = new Map(entries.map((entry) => [entry.pid, entry]));
  const width = Math.max(16, Math.min(columns, 120) - 3);
  return [...processes.values()].flatMap((entry) =>
    wrapText(`PID ${entry.pid} · ${cleanText(entry.command || entry.name)}`, width)
      .map((line) => `  ${chalk.dim(line)}`)
  ).join("\n");
}

export default function formatPortsList(entries, columns = 100) {
  const width = Math.max(16, Math.min(columns, 120) - 3);
  const lines = [...wrapText("TCP LISTEN · 开发进程", width).map((line) => chalk.dim(line)), ""];
  if (entries.length === 0) {
    lines.push(...wrapText("没有发现可关闭的开发端口", width));
  } else {
    const rows = entries.map((entry) => ({
      port: String(entry.port), name: cleanText(entry.name),
      pid: String(entry.pid), address: cleanText(entry.address),
    }));
    const portWidth = rows.reduce((max, row) => Math.max(max, stringWidth(row.port)), 4);
    const pidWidth = rows.reduce((max, row) => Math.max(max, stringWidth(row.pid)), 3);
    const addressWidth = rows.reduce((max, row) => Math.max(max, stringWidth(row.address)), 8);
    const maxNameWidth = rows.reduce((max, row) => Math.max(max, stringWidth(row.name)), 4);
    const nameWidth = Math.min(maxNameWidth, 24, width - portWidth - pidWidth - addressWidth - 6);

    if (nameWidth < Math.min(8, maxNameWidth)) {
      lines.push(chalk.dim("─".repeat(width)));
      rows.forEach((row, index) => {
        if (index > 0) lines.push("");
        lines.push(...wrapText(`${row.port}  ${row.name}`, width).map((line) => chalk.cyanBright(line)));
        lines.push(chalk.dim(`PID ${row.pid}`));
        lines.push(...wrapText(row.address, width).map((line) => chalk.dim(line)));
      });
    } else {
      lines.push(chalk.bold(`${pad("端口", portWidth)}  ${pad("进程", nameWidth)}  ${pad("PID", pidWidth)}  监听地址`));
      lines.push(chalk.dim("─".repeat(portWidth + nameWidth + pidWidth + addressWidth + 6)));
      rows.forEach((row) => {
        wrapText(row.name, nameWidth).forEach((name, index) => {
          lines.push(`${chalk.cyanBright(pad(index === 0 ? row.port : "", portWidth))}  ${pad(name, nameWidth)}  ${chalk.dim(pad(index === 0 ? row.pid : "", pidWidth))}  ${chalk.dim(index === 0 ? row.address : "")}`);
        });
      });
    }
  }
  return `${formatPortsHeading(entries, columns)}${lines.map((line) => line ? `  ${line}` : "").join("\n")}\n`;
}
