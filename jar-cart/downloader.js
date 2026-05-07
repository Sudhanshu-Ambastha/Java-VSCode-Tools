// @ts-nocheck
const vscode = require("vscode");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("node:path");

async function downloadJars(manifestDeps, libDir) {
  const requiredFiles = new Map();

  function getRawList(deps) {
    if (!deps) return [];
    if (Array.isArray(deps)) return deps;
    if (deps.dependency) {
      return Array.isArray(deps.dependency)
        ? deps.dependency
        : [deps.dependency];
    }
    return [];
  }

  function flatten(list) {
    const items = getRawList(list);
    for (const d of items) {
      const fileName = `${d.library}-${d.version}.jar`;
      if (!requiredFiles.has(fileName)) {
        requiredFiles.set(fileName, {
          group: d.group,
          library: d.library,
          version: d.version,
          fileName: fileName,
        });
      }

      if (d.dependencies) {
        flatten(d.dependencies);
      }
    }
  }

  flatten(manifestDeps);

  if (await fs.pathExists(libDir)) {
    const existingFiles = await fs.readdir(libDir);
    for (const file of existingFiles) {
      if (file.endsWith(".jar") && !requiredFiles.has(file)) {
        await fs.remove(path.join(libDir, file));
      }
    }
  } else {
    await fs.ensureDir(libDir);
  }

  for (const dep of requiredFiles.values()) {
    const filePath = path.join(libDir, dep.fileName);
    if (await fs.pathExists(filePath)) continue;

    try {
      const gPath = dep.group.replaceAll(".", "/");
      const url = `https://repo1.maven.org/maven2/${gPath}/${dep.library}/${dep.version}/${dep.fileName}`;

      const response = await axios({
        url,
        responseType: "stream",
        headers: { "User-Agent": "JarCart-VSCode/1.1.1" },
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", (err) => {
          writer.close();
          reject(err);
        });
      });
    } catch (e) {
      vscode.window.showErrorMessage(`Failed to download ${dep.fileName} ❌`);
    }
  }
}

module.exports = { downloadJars };
