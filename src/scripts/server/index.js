import express from "express";
import path from "path";
import chalk from "chalk";
import os from "os";

async function server(directory = ".", options = {}) {
  const {
    port = 8080,
    host = "0.0.0.0",
    open = false,
  } = options;

  const app = express();
  const rootDir = path.resolve(process.cwd(), directory);
  
  // 静态文件服务
  app.use(express.static(rootDir));

  return new Promise((resolve, reject) => {
    try {
      const portNumber = parseInt(port, 10);
      const server = app.listen(portNumber, host, () => {
        const localIP = getLocalIP();
        const localAddress = `http://localhost:${portNumber}`;
        const networkAddress = `http://${localIP}:${portNumber}`;

        console.log(`
${chalk.bold("Static file server running at:")}
  ${chalk.cyan("Local:")}     ${chalk.cyan(localAddress)}
  ${chalk.cyan("Network:")}   ${chalk.cyan(networkAddress)}
`);

        if (open) {
          import("open").then(module => module.default(localAddress));
        }

        resolve(server);
      });

      server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          console.error(chalk.red(`Port ${portNumber} is already in use`));
          console.error(chalk.yellow(`Try: yin-cli server -p ${portNumber + 1}`));
        } else {
          console.error(chalk.red("Server error:"), err.message);
        }
        reject(err);
      });
    } catch (err) {
      console.error(chalk.red("Fatal error:"), err.message);
      reject(err);
    }
  });
}

function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        if (net.address.startsWith("192.168")) return net.address;
      }
    }
  }
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "localhost";
}

export default server;
