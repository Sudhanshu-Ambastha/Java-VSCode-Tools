# JAR Cart 🛒 (SA)

The **sovereign dependency manager for no-build Java projects**.

Search, select, and sync JAR dependencies directly into your project's `lib/` folder — without Maven, Gradle, or heavyweight build tooling.

Designed for:

- No-build Java workflows
- Student assignments
- Rapid prototyping
- Lightweight desktop apps
- Legacy Java projects
- Developers who want direct control over their classpath

---

## 🎥 Tutorial

Quick walkthrough:

![JAR Cart Demo](https://raw.githubusercontent.com/Sudhanshu-Ambastha/java-no-build-tools/main/jar-cart/images/example.gif)

---

# ✨ Features

## 📦 Dependency Management

- Search libraries directly from Maven Central
- Select exact versions or latest releases
- Download dependencies directly into `lib/`
- Supports recursive transitive dependency resolution

---

## 🔄 Dual Manifest Support

Choose between:

- `jar-cart.json`
- `jar-cart.xml`

Convert between formats anytime using:

```txt
JAR Cart: Switch Manifest Format
```

---

## 🌳 Recursive Dependency Trees

Use:

```txt
Include All Dependencies
```

to automatically resolve and store the full dependency graph from Maven POM metadata.

---

## ✂️ Selective Dependency Pruning

Edit your manifest manually to remove unwanted sub-dependencies before syncing.

This allows tighter control over:

- JAR size
- Duplicate libraries
- Logging frameworks
- Legacy transitive dependencies

---

## 🧹 Auto-Clean Sync

`Sync` ensures your `lib/` folder mirrors your manifest exactly.

Unused JARs are automatically removed to prevent:

- stale dependencies
- duplicate versions
- classpath pollution

---

## ⚡ Lightweight Workflow

No:

- Gradle
- Maven wrappers
- daemon processes
- hidden caches
- generated build folders

Just:

```txt
manifest -> sync -> lib/
```

---

# 🚀 Getting Started

## 1. Install the Extension

From VS Code Marketplace:

[JAR Cart SA](https://marketplace.visualstudio.com/items?itemName=SudhanshuAmbastha.jar-cart-sa&utm_source=chatgpt.com)

## ⚡ Looking for more power?

While this extension simplifies dependency management inside VS Code, you can also use the standalone jar-cart CLI for advanced build automation, project-locked JDKs, and CI/CD pipelines.

- [Check out the `jar-cart` CLI on GitHub](https://github.com/Sudhanshu-Ambastha/jar-cart)

---

## 2. Add Dependencies

Press:

### Windows / Linux / macOS

```txt
Ctrl + Shift + J
```

Search for a library and select a version.

---

## 3. Choose Resolution Strategy

### Direct JARs Only

Downloads only the selected dependency.

### Include All Dependencies

Resolves and downloads the full transitive dependency tree.

---

## 4. Review Manifest

Example:

### JSON

```json
{
  "project": "Backend-Stress-Test",
  "strategy": "Include All Dependencies",
  "dependencies": [
    {
      "group": "org.slf4j",
      "library": "slf4j-api",
      "version": "2.0.9",
      "dependencies": []
    }
  ]
}
```

### XML

```xml
<?xml version="1.0" encoding="UTF-8"?>

<jarCart>
  <project>Backend-Stress-Test</project>

  <strategy>Include All Dependencies</strategy>

  <dependencies>
    <dependency>
      <group>org.slf4j</group>
      <library>slf4j-api</library>
      <version>2.0.9</version>
    </dependency>
  </dependencies>

</jarCart>
```

---

## 5. Sync Dependencies

Run:

```txt
JAR Cart: Sync Dependencies (lib/)
```

This downloads all required JARs into:

```txt
/lib
```

---

# ⚙️ Extension Settings

## `jar-cart.manifestFormat`

Choose the default manifest format.

Supported values: `json`/`xml`

---

# 📁 Example Project Structure

```txt
project/
├── lib/
│   ├── slf4j-api-2.0.9.jar
│   └── ...
│
├── src/
│   └── Main.java
│
├── jar-cart.json
└── jar-cart.xml
```

---

# 🛠️ Development Setup

## Clone Repository

```bash
git clone https://github.com/Sudhanshu-Ambastha/java-no-build-tools.git
```

---

## Install Dependencies

```bash
npm install
```

Dependencies used:

- axios
- fs-extra
- xml2js
- vscode API

---

## Launch Extension

1. Open project in VS Code
2. Press:

```txt
F5
```

This opens the Extension Development Host.

---

## Package Extension

Install VSCE:

```bash
npm install -g @vscode/vsce
```

Build extension:

```bash
vsce package
```

---

# 🧠 Design Philosophy

JAR Cart focuses on:

- simplicity
- reproducibility
- direct dependency control
- no hidden build systems
- transparent classpaths

The goal is to make Java dependency management lightweight and understandable again.

---

# ⚖️ License

Licensed under the Apache License 2.0.

See:

[LICENSE](https://github.com/Sudhanshu-Ambastha/java-no-build-tools/blob/main/LICENSE?utm_source=chatgpt.com)

---

# 🌟 Support

If JAR Cart helps your workflow, consider supporting development:

[![Sponsor](https://img.shields.io/badge/Sponsor-JAR%20Cart-pink?style=for-the-badge)](https://github.com/sponsors/Sudhanshu-Ambastha)

You can also help by:

- Starring the repository
- Reporting issues
- Suggesting features
- Contributing improvements

---

Built with 💻 for the Java community.
