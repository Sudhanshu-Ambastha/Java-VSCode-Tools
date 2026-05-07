// @ts-nocheck
const vscode = require("vscode");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("node:path");
const xml2js = require("xml2js");

function toXmlTree(dep) {
  const node = {
    group: dep.group,
    library: dep.library,
    version: dep.version,
  };
  if (dep.dependencies && dep.dependencies.length > 0) {
    node.dependencies = {
      dependency: dep.dependencies.map(toXmlTree),
    };
  }
  return node;
}

async function saveManifest(
  jarCart,
  strategy = "Direct JARs Only",
  customPath = null,
) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const root = workspaceFolder?.uri.fsPath;
  if (!root) return;

  const config = vscode.workspace.getConfiguration("jar-cart");
  const format = config.get("manifestFormat") || "json";
  let manifestPath = customPath || path.join(root, `jar-cart.${format}`);
  const isXml = manifestPath.endsWith(".xml");
  const projectName = vscode.workspace.name || path.basename(root);

  const finalDeps = [];
  const visited = new Set();

  for (const item of jarCart) {
    const doc = {
      g: item.group || item.g,
      a: item.library || item.a,
      v: item.version || item.v,
    };
    if (strategy.includes("All")) {
      const node = await resolveDependencies(doc, visited);
      if (node) finalDeps.push(node);
    } else {
      finalDeps.push({
        group: doc.g,
        library: doc.a,
        version: doc.v,
        dependencies: [],
      });
    }
  }

  if (isXml) {
    let currentManifest = {
      jarCart: {
        project: projectName,
        strategy,
        dependencies: { dependency: [] },
      },
    };

    if (await fs.pathExists(manifestPath)) {
      try {
        const rawXml = await fs.readFile(manifestPath, "utf-8");
        const res = await new xml2js.Parser({
          explicitArray: false,
        }).parseStringPromise(rawXml);
        if (res?.jarCart) {
          currentManifest = res;
          currentManifest.jarCart.project = projectName;
          if (!currentManifest.jarCart.dependencies)
            currentManifest.jarCart.dependencies = { dependency: [] };
          else if (
            !Array.isArray(currentManifest.jarCart.dependencies.dependency)
          ) {
            currentManifest.jarCart.dependencies.dependency = [
              currentManifest.jarCart.dependencies.dependency,
            ];
          }
        }
      } catch (e) {
        console.error("XML Load Error:", e);
      }
    }

    finalDeps.forEach((newDep) => {
      const xmlNode = toXmlTree(newDep);
      const exists = currentManifest.jarCart.dependencies.dependency.find(
        (d) => d.group === xmlNode.group && d.library === xmlNode.library,
      );
      if (!exists)
        currentManifest.jarCart.dependencies.dependency.push(xmlNode);
    });

    const builder = new xml2js.Builder({
      renderOpts: { pretty: true, indent: "  " },
      xmldec: { version: "1.0", encoding: "UTF-8" },
    });
    await fs.writeFile(
      manifestPath,
      builder.buildObject(currentManifest),
      "utf-8",
    );
  } else {
    let manifest = { project: projectName, strategy, dependencies: finalDeps };
    if (await fs.pathExists(manifestPath)) {
      const existing = await fs.readJson(manifestPath);
      // Ensure existing JSON project names are updated to current folder name
      existing.project = projectName;
      const combined = [...(existing.dependencies || []), ...finalDeps];
      manifest.dependencies = Array.from(
        new Map(combined.map((d) => [`${d.group}:${d.library}`, d])).values(),
      );
    }
    await fs.writeJson(manifestPath, manifest, { spaces: 2 });
  }
}

async function getPomDependencies(doc) {
  try {
    const url = `https://repo1.maven.org/maven2/${doc.g.replace(/\./g, "/")}/${doc.a}/${doc.v}/${doc.a}-${doc.v}.pom`;
    const res = await axios.get(url, {
      headers: { "User-Agent": "JarCart/1.0" },
      timeout: 5000,
    });
    const result = await new xml2js.Parser({
      explicitArray: false,
    }).parseStringPromise(res.data);
    let deps = result.project?.dependencies?.dependency;
    return deps ? (Array.isArray(deps) ? deps : [deps]) : [];
  } catch {
    return [];
  }
}

async function resolveDependencies(doc, visited) {
  const id = `${doc.g}:${doc.a}:${doc.v}`;
  if (visited.has(id)) return null;
  visited.add(id);

  const node = {
    group: doc.g,
    library: doc.a,
    version: doc.v,
    dependencies: [],
  };
  const rawDeps = await getPomDependencies(doc);

  for (const dep of rawDeps) {
    const scope = dep.scope || "compile";
    if (["compile", "runtime"].includes(scope) && dep.optional !== "true") {
      let v = dep.version || doc.v;
      if (v.includes("${") || v.includes("[") || v.includes("(")) v = doc.v;
      const child = await resolveDependencies(
        { g: dep.groupId, a: dep.artifactId, v },
        visited,
      );
      if (child) node.dependencies.push(child);
    }
  }
  return node;
}

module.exports = { saveManifest };
