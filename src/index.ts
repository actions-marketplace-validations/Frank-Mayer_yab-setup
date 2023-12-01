import * as core from "@actions/core";
import * as path from "path";
import * as http from "https";
import * as fs from "fs";
import { exec } from "child_process";

function getToolPath() {
  const toolPath = path.resolve("./artifacts");

  if (!fs.existsSync(toolPath)) {
    fs.mkdirSync(toolPath, { recursive: true });
  }

  return toolPath;
}

const toolPath = getToolPath();

async function main() {
  const { os, arch, fext } = getSystemData();
  const url = `https://frank-mayer.github.io/yab/yab-${os}-${arch}${fext}`;
  core.info(`Downloading Yab from ${url}`);

  await download(url, path.join(toolPath, "yab" + fext));
  core.addPath(toolPath);
  core.info(`Yab installed to ${toolPath}`);

  const version = await getVersion();
  core.info(`Yab version ${version} installed`);
}

async function download(url: string, file: string) {
  const fileStream = fs.createWriteStream(file);

  return new Promise<void>((resolve, reject) => {
    http.get(url, function (response) {
      response.pipe(fileStream);
      fileStream.on("finish", function () {
        fileStream.close();
        core.info(`Downloaded ${file}`);
        fs.chmodSync(file, "775");
        resolve();
      });
      fileStream.on("error", function (err) {
        fs.unlink(file, () => {});
        reject(err);
      });
    });
  });
}

function getSystemData() {
  let os = "";
  let arch = "";
  let fext = "";

  switch (process.platform) {
    case "win32":
      os = "windows";
      fext = ".exe";
      break;
    case "darwin":
      os = "darwin";
      break;
    case "linux":
      os = "linux";
      break;
    default:
      throw new Error(`Unsupported OS found: ${process.platform}`);
  }

  switch (process.arch) {
    case "x64":
      arch = "amd64";
      break;
    case "arm64":
      arch = "arm64";
      break;
    default:
      throw new Error(`Unsupported architecture found: ${process.arch}`);
  }

  return { os, arch, fext };
}

async function getVersion() {
  return new Promise((resolve, reject) => {
    exec("yab --version", (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

try {
  main().catch((error) => {
    core.setFailed(error.message);
  });
} catch (error) {
  core.setFailed(error.message);
}
