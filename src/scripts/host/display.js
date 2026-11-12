import chalk from "chalk";
import stringWidth from "string-width";
import { cleanText, wrapText, pad } from "../../utils/terminal.js";

export default function formatHostsList(entries, hostsPath, columns = 100) {
  const width = Math.max(16, Math.min(columns, 120) - 3);
  const rows = entries.map((entry) => ({
    hostname: cleanText(entry.hostname),
    ip: cleanText(entry.ip),
    note: cleanText(entry.comment.replace(/^#\s*/, "")),
  }));
  const count = `共 ${rows.length} 条记录`;
  const addresses = `${new Set(rows.map((row) => row.ip)).size} 个 IP`;
  const summary = `${count} · ${addresses}`;
  const lines = [];
  if (stringWidth(`HOSTS  ${summary}`) <= width) {
    lines.push(`${chalk.cyanBright.bold("HOSTS")}  ${chalk.dim(summary)}`);
  } else {
    lines.push(chalk.cyanBright.bold("HOSTS"), ...(stringWidth(summary) <= width ? [summary] : [count, addresses]).map((line) => chalk.dim(line)));
  }
  lines.push(...wrapText(cleanText(hostsPath), width).map((line) => chalk.dim(line)), "");

  if (rows.length === 0) {
    lines.push("暂无 hosts 配置", "", ...wrapText("添加：y host -s example.com 127.0.0.1", width).map((line) => chalk.dim(line)));
    return `\n${lines.map((line) => line ? `  ${line}` : "").join("\n")}\n`;
  }

  const maxHostWidth = rows.reduce((max, row) => Math.max(max, stringWidth(row.hostname)), 4);
  const ipWidth = rows.reduce((max, row) => Math.max(max, stringWidth(row.ip)), 2);
  const maxNoteWidth = rows.reduce((max, row) => Math.max(max, stringWidth(row.note)), 0);
  const noteWidth = maxNoteWidth ? Math.min(Math.max(4, maxNoteWidth), 28, Math.max(12, width - ipWidth - maxHostWidth - 4)) : 0;
  const hostWidth = Math.min(maxHostWidth, width - ipWidth - (noteWidth ? noteWidth + 4 : 2));

  if (hostWidth < Math.min(12, maxHostWidth)) {
    // When IPv6 leaves too little room for columns, keep every value readable.
    lines.push(chalk.bold("域名 / IP"), chalk.dim("─".repeat(width)));
    rows.forEach((row, index) => {
      if (index > 0) lines.push("");
      lines.push(...wrapText(row.hostname, width).map((line) => chalk.bold(line)));
      lines.push(...wrapText(row.ip, width).map((line) => chalk.cyanBright(line)));
      if (row.note) lines.push(...wrapText(`备注 ${row.note}`, width).map((line) => chalk.dim(line)));
    });
  } else {
    const tableWidth = hostWidth + 2 + ipWidth + (noteWidth ? noteWidth + 2 : 0);
    lines.push(chalk.bold(`${pad("域名", hostWidth)}  ${noteWidth ? pad("IP", ipWidth) + "  备注" : "IP"}`));
    lines.push(chalk.dim("─".repeat(tableWidth)));
    rows.forEach((row) => {
      const hostLines = wrapText(row.hostname, hostWidth);
      const noteLines = noteWidth ? wrapText(row.note || "—", noteWidth) : [];
      const height = Math.max(hostLines.length, noteLines.length);
      for (let index = 0; index < height; index++) {
        const hostname = pad(hostLines[index] || "", hostWidth);
        const ip = index === 0 ? row.ip : "";
        lines.push(noteWidth
          ? `${hostname}  ${chalk.cyanBright(pad(ip, ipWidth))}  ${chalk.dim(noteLines[index] || "")}`
          : `${hostname}  ${chalk.cyanBright(ip)}`);
      }
    });
  }

  return `\n${lines.map((line) => line ? `  ${line}` : "").join("\n")}\n`;
}
