// @ts-nocheck
const vscode = require("vscode");
const fs = require("fs-extra");
const path = require("node:path");
const xml2js = require("xml2js");
const { saveManifest } = require("./manifest");
const { downloadJars } = require("./downloader");
const {
  searchAndPickJar,
  getManifestPath,
  createStatusBar,
  updateStatusBar,
} = require("./utils");

let jarCart = [];
let statusBarItem;

function flattenDepsRecursive(deps, result = []) {
  if (!deps) return result;
  const depArray = Array.isArray(deps) ? deps : [deps];

  for (const d of depArray) {
    if (d.group && d.library) {
      result.push({ group: d.group, library: d.library, version: d.version });
      const children = d.dependencies?.dependency || d.dependencies;
      if (children) flattenDepsRecursive(children, result);
    }
  }
  return result;
}

function mapDependenciesRecursive(deps) {
  const depArray = Array.isArray(deps) ? deps : [deps];

  return depArray.map((d) => {
    const rawChildren = d.dependencies?.dependency || d.dependencies;
    return {
      group: d.group,
      library: d.library,
      version: d.version,
      dependencies: rawChildren ? mapDependenciesRecursive(rawChildren) : [],
    };
  });
}

async function activate(context) {
  statusBarItem = createStatusBar();
  context.subscriptions.push(statusBarItem);

  const config = vscode.workspace.getConfiguration("jar-cart");

  if (!config.get("manifestFormat")) {
    const choice = await vscode.window.showInformationMessage(
      "Select your preferred JAR Cart format:",
      "JSON",
      "XML",
    );
    if (choice) {
      await config.update(
        "manifestFormat",
        choice.toLowerCase(),
        vscode.ConfigurationTarget.Global,
      );
    }
  }

  const performAdd = async () => {
    const jar = await searchAndPickJar();
    if (!jar) return;

    jarCart.push(jar);
    updateStatusBar(statusBarItem, jarCart);

    const strategy = await vscode.window.showQuickPick(
      ["Direct JARs Only", "Include All Dependencies"],
      { placeHolder: "Select generation strategy" },
    );

    if (strategy) {
      let targetPath = await getManifestPath("Select manifest to update");
      if (!targetPath) {
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (root) {
          const pref = config.get("manifestFormat") || "json";
          targetPath = path.join(root, `jar-cart.${pref}`);
        }
      }

      if (targetPath) {
        await saveManifest(jarCart, strategy, targetPath);
        vscode.window.showInformationMessage(
          `Updated ${path.basename(targetPath)}! ✏️`,
        );
        jarCart = [];
        updateStatusBar(statusBarItem, jarCart);
      }
    }
  };

  const performSync = async () => {
    const configPath = await getManifestPath("Select manifest to sync");
    if (!configPath) return;

    try {
      let dependencies = [];

      if (configPath.endsWith(".xml")) {
        const raw = await fs.readFile(configPath, "utf-8");
        const result = await new xml2js.Parser({
          explicitArray: false,
        }).parseStringPromise(raw);
        dependencies = flattenDepsRecursive(
          result?.jarCart?.dependencies?.dependency,
        );
      } else {
        const data = await fs.readJson(configPath);
        dependencies = flattenDepsRecursive(data.dependencies || []);
      }

      const libDir = path.join(path.dirname(configPath), "lib");
      await fs.ensureDir(libDir);

      const requiredFiles = dependencies.map(
        (d) => `${d.library}-${d.version}.jar`,
      );
      if (await fs.pathExists(libDir)) {
        const existingFiles = await fs.readdir(libDir);
        for (const file of existingFiles) {
          if (file.endsWith(".jar") && !requiredFiles.includes(file)) {
            await fs.remove(path.join(libDir, file));
          }
        }
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Syncing ${path.basename(configPath)}...`,
        },
        async () => await downloadJars(dependencies, libDir),
      );

      vscode.window.showInformationMessage(
        `Sync Complete: ${dependencies.length} JARs active! 🏁`,
      );
    } catch (err) {
      vscode.window.showErrorMessage(`Sync failed: ${err.message}`);
    }
  };

  const performSwitch = async () => {
    const currentPath = await getManifestPath("Select manifest to convert");
    if (!currentPath) return;

    const isXml = currentPath.endsWith(".xml");
    const targetExt = isXml ? "json" : "xml";
    const newPath = currentPath.replace(
      isXml ? ".xml" : ".json",
      `.${targetExt}`,
    );

    const confirm = await vscode.window.showWarningMessage(
      `Convert to ${targetExt.toUpperCase()}? This preserves tree structure.`,
      "Convert",
      "Cancel",
    );
    if (confirm !== "Convert") return;

    try {
      let deps = [];
      let strategy = "Direct JARs Only";

      if (isXml) {
        const raw = await fs.readFile(currentPath, "utf-8");
        const res = await new xml2js.Parser({
          explicitArray: false,
        }).parseStringPromise(raw);
        strategy = res?.jarCart?.strategy || strategy;
        deps = mapDependenciesRecursive(
          res?.jarCart?.dependencies?.dependency || [],
        );
      } else {
        const json = await fs.readJson(currentPath);
        strategy = json.strategy || strategy;
        deps = json.dependencies || [];
      }

      await saveManifest(deps, strategy, newPath);
      await fs.remove(currentPath);
      await config.update(
        "manifestFormat",
        targetExt,
        vscode.ConfigurationTarget.Global,
      );

      vscode.window.showInformationMessage(
        `Migrated to jar-cart.${targetExt}! 🔄`,
      );
    } catch (err) {
      vscode.window.showErrorMessage(`Migration failed: ${err.message}`);
    }
  };

  const performPurge = async () => {
    const manifestPath = await getManifestPath();
    if (!manifestPath) return;
    const libDir = path.join(path.dirname(manifestPath), "lib");
    if (await fs.pathExists(libDir)) {
      const confirm = await vscode.window.showWarningMessage(
        "Purge all JARs in lib folder?",
        "Yes",
        "Cancel",
      );
      if (confirm === "Yes") {
        await fs.emptyDir(libDir);
        vscode.window.showInformationMessage("Cleared! 🧹");
      }
    }
  };

  const performView = async () => {
    const p = await getManifestPath();
    if (p)
      vscode.window.showTextDocument(
        await vscode.workspace.openTextDocument(p),
      );
  };

  context.subscriptions.push(
    vscode.commands.registerCommand("jar-cart.add", performAdd),
    vscode.commands.registerCommand("jar-cart.sync", performSync),
    vscode.commands.registerCommand("jar-cart.checkout", performSync),
    vscode.commands.registerCommand("jar-cart.switchFormat", performSwitch),
    vscode.commands.registerCommand("jar-cart.view", performView),
    vscode.commands.registerCommand("jar-cart.purge", performPurge),
  );
}

module.exports = { activate, deactivate: () => {} };
