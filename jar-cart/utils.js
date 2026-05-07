// @ts-nocheck
const vscode = require("vscode");
const axios = require("axios");
const path = require("node:path");

const MAVEN_URL = "https://search.maven.org/solrsearch/select";
const USER_AGENT = "JarCart-VSCode/1.2.0";

async function searchAndPickJar() {
  const query = await vscode.window.showInputBox({
    prompt: "Search Maven (e.g. 'gson' or 'org.slf4j')",
  });
  if (!query) return null;

  try {
    const res = await axios.get(MAVEN_URL, {
      params: { q: query, rows: 20, wt: "json" },
      headers: { "User-Agent": USER_AGENT },
    });
    const docs = res.data.response.docs;
    if (docs.length === 0) return null;

    const pick = await vscode.window.showQuickPick(
      docs.map((d) => ({ label: d.a, description: d.g, doc: d })),
      { placeHolder: "Select a library" },
    );
    if (!pick) return null;

    const vRes = await axios.get(MAVEN_URL, {
      params: {
        q: `g:${pick.doc.g} AND a:${pick.doc.a}`,
        core: "gav",
        rows: 10,
        wt: "json",
      },
      headers: { "User-Agent": USER_AGENT },
    });

    const ver = await vscode.window.showQuickPick(
      vRes.data.response.docs.map((d) => d.v),
      { placeHolder: "Select version" },
    );
    return ver
      ? { group: pick.doc.g, library: pick.doc.a, version: ver }
      : null;
  } catch {
    return null;
  }
}

async function getManifestPath() {
  const files = await vscode.workspace.findFiles(
    "**/jar-cart.{json,xml}",
    "**/node_modules/**",
  );

  if (files.length === 0) return null;
  if (files.length === 1) return files[0].fsPath;

  const folderMap = new Map();
  files.forEach((f) => {
    const dir = path.dirname(f.fsPath);
    if (!folderMap.has(dir)) {
      folderMap.set(dir, f.fsPath);
    } else if (f.fsPath.endsWith(".xml")) {
      folderMap.set(dir, f.fsPath);
    }
  });

  const uniqueProjects = Array.from(folderMap.values());
  if (uniqueProjects.length === 1) return uniqueProjects[0];

  const picks = uniqueProjects.map((f) => ({
    label: path.basename(path.dirname(f)) || "root project",
    description: vscode.workspace.asRelativePath(f),
    fsPath: f,
  }));

  const selected = await vscode.window.showQuickPick(picks, {
    placeHolder: "Select which project manifest to use",
  });
  return selected ? selected.fsPath : null;
}

function createStatusBar() {
  const item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  item.command = "jar-cart.view";
  return item;
}

function updateStatusBar(item, cart) {
  if (cart && cart.length > 0) {
    item.text = `$(shopping-cart) ${cart.length} JAR${cart.length > 1 ? "s" : ""}`;
    item.show();
  } else {
    item.hide();
  }
}

module.exports = {
  searchAndPickJar,
  getManifestPath,
  createStatusBar,
  updateStatusBar,
};
