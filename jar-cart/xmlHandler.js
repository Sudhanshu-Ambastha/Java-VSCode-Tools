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

async function readXmlManifest(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true,
    });
    const result = await parser.parseStringPromise(raw);
    return result?.jarCart;
  } catch (err) {
    throw new Error(`XML Parse Failure: ${err.message}`);
  }
}

function flattenXmlDeps(deps, result = []) {
  if (!deps) return result;
  const depArray = Array.isArray(deps) ? deps : [deps];

  for (const d of depArray) {
    if (d.group && d.library) {
      result.push({
        group: d.group,
        library: d.library,
        version: d.version,
      });

      if (d.dependencies) {
        const nextLevel = d.dependencies.dependency || d.dependencies;
        flattenXmlDeps(nextLevel, result);
      }
    }
  }
  return result;
}

function mapDependenciesRecursive(deps) {
  const depArray = Array.isArray(deps) ? deps : [deps];
  return depArray.map((d) => ({
    group: d.group,
    library: d.library,
    version: d.version,
    dependencies: d.dependencies
      ? mapDependenciesRecursive(d.dependencies.dependency || d.dependencies)
      : [],
  }));
}

function flattenJsonDeps(deps) {
  return deps.reduce((acc, dep) => {
    acc.push(dep);
    if (dep.dependencies && dep.dependencies.length > 0) {
      acc = acc.concat(flattenJsonDeps(dep.dependencies));
    }
    return acc;
  }, []);
}

async function activate(context) {
  statusBarItem = createStatusBar();
  context.subscriptions.push(statusBarItem);

  const config = vscode.workspace.getConfiguration("jar-cart");
  const formatSetting = config.inspect("manifestFormat");

  if (!formatSetting.globalValue && !formatSetting.workspaceValue) {
    const choice = await vscode.window.showInformationMessage(
      "Welcome to JAR Cart! Which format do you prefer?",
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

  const addCmd = vscode.commands.registerCommand("jar-cart.add", async () => {
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
          const pref =
            vscode.workspace
              .getConfiguration("jar-cart")
              .get("manifestFormat") || "json";
          targetPath = path.join(root, `jar-cart.${pref}`);
        }
      }

      if (targetPath) {
        await saveManifest(jarCart, strategy, targetPath);
        vscode.window.showInformationMessage(
          `Added to ${path.basename(targetPath)}! ✏️`,
        );
        jarCart = [];
        updateStatusBar(statusBarItem, jarCart);
      }
    }
  });

  const performSync = async () => {
    const configPath = await getManifestPath("Select manifest to sync");
    if (!configPath) return;

    let dependencies = [];
    const isXml = configPath.endsWith(".xml");

    try {
      if (isXml) {
        const raw = await fs.readFile(configPath, "utf-8");
        const result = await new xml2js.Parser({
          explicitArray: false,
        }).parseStringPromise(raw);
        const rawDeps = result?.jarCart?.dependencies?.dependency;
        dependencies = flattenXmlDeps(rawDeps);
      } else {
        const data = await fs.readJson(configPath);
        dependencies = flattenJsonDeps(data.dependencies || []);
      }

      const libDir = path.join(path.dirname(configPath), "lib");
      await fs.ensureDir(libDir);

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Syncing ${path.basename(configPath)}...`,
        },
        async () => await downloadJars(dependencies, libDir),
      );
      vscode.window.showInformationMessage(
        `Synced ${dependencies.length} JARs! 🏁`,
      );
    } catch (err) {
      vscode.window.showErrorMessage(`Sync failed: ${err.message}`);
    }
  };

  const syncCmd = vscode.commands.registerCommand("jar-cart.sync", performSync);
  const checkoutCmd = vscode.commands.registerCommand(
    "jar-cart.checkout",
    performSync,
  );

  const switchCmd = vscode.commands.registerCommand(
    "jar-cart.switchFormat",
    async () => {
      const currentPath = await getManifestPath("Select manifest to convert");
      if (!currentPath) return;

      const isCurrentlyXml = currentPath.endsWith(".xml");
      const targetExt = isCurrentlyXml ? "json" : "xml";
      const newPath = currentPath.replace(
        isCurrentlyXml ? ".xml" : ".json",
        `.${targetExt}`,
      );

      const confirm = await vscode.window.showWarningMessage(
        `Convert to ${targetExt.toUpperCase()}? This will preserve the dependency tree structure.`,
        "Convert",
        "Cancel",
      );

      if (confirm !== "Convert") return;

      try {
        let deps = [];
        let strategy = "Direct JARs Only";

        const mapDependenciesRecursive = (data) => {
          const depArray = Array.isArray(data) ? data : [data];
          return depArray.map((d) => ({
            group: d.group,
            library: d.library,
            version: d.version,
            dependencies: d.dependencies
              ? mapDependenciesRecursive(
                  d.dependencies.dependency || d.dependencies,
                )
              : [],
          }));
        };

        if (isCurrentlyXml) {
          const raw = await fs.readFile(currentPath, "utf-8");
          const res = await new xml2js.Parser({
            explicitArray: false,
          }).parseStringPromise(raw);

          strategy = res?.jarCart?.strategy || strategy;
          const rawDeps = res?.jarCart?.dependencies?.dependency || [];
          deps = mapDependenciesRecursive(rawDeps);
        } else {
          const json = await fs.readJson(currentPath);
          strategy = json.strategy || strategy;
          deps = json.dependencies || [];
        }

        await saveManifest(deps, strategy, newPath);
        await fs.remove(currentPath);

        await vscode.workspace
          .getConfiguration("jar-cart")
          .update(
            "manifestFormat",
            targetExt,
            vscode.ConfigurationTarget.Global,
          );

        vscode.window.showInformationMessage(
          `Migrated to jar-cart.${targetExt} with tree integrity! 🔄`,
        );
      } catch (err) {
        vscode.window.showErrorMessage(`Migration failed: ${err.message}`);
      }
    },
  );

  const purgeCmd = vscode.commands.registerCommand(
    "jar-cart.purge",
    async () => {
      const manifestPath = await getManifestPath();
      if (!manifestPath) return;
      const libDir = path.join(path.dirname(manifestPath), "lib");
      if (await fs.pathExists(libDir)) {
        const confirm = await vscode.window.showWarningMessage(
          "Purge lib folder?",
          "Yes",
          "Cancel",
        );
        if (confirm === "Yes") {
          await fs.emptyDir(libDir);
          vscode.window.showInformationMessage("Cleared! 🧹");
        }
      }
    },
  );

  const viewCmd = vscode.commands.registerCommand("jar-cart.view", async () => {
    const p = await getManifestPath();
    if (p)
      vscode.window.showTextDocument(
        await vscode.workspace.openTextDocument(p),
      );
  });

  context.subscriptions.push(
    addCmd,
    syncCmd,
    checkoutCmd,
    switchCmd,
    viewCmd,
    purgeCmd,
  );
}

module.exports = { activate, deactivate: () => {} };
