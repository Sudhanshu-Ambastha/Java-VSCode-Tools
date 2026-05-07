# Change Log

All notable changes to the **JAR Cart** extension are documented in this file.

## [1.2.0] - 2026-05-07

### Added

- **Multi-Format Manifest Support**: Added support for both `jar-cart.json` and `jar-cart.xml`. Users can now choose their preferred configuration style.
- **Dynamic Format Switching**: New command `JAR Cart: Switch Manifest Format` to instantly convert an existing JSON manifest to XML (or vice-versa) while preserving all dependency trees and strategies.
- **Smart Project Naming**: The manifest now automatically detects the workspace folder name and updates the `project` field, ensuring the manifest stays in sync with your local directory structure.
- **Recursive XML Serialization**: Enhanced the XML engine to support deep-nested dependency structures, matching the transparency of the JSON format.
- **Status Bar Persistence**: The 🛒 icon now provides a persistent shortcut to the active manifest, regardless of its format.

### Changed

- **Zero-Footprint Refactoring**: Removed the `versionMap` and internal tracking variables in favor of a stateless "Source of Truth" model.
- **Enhanced Save Logic**: The `saveManifest` function now performs a silent merge with existing files, preventing data loss when adding new libraries to large projects.
- **Intelligent XML Handling**: Configured `xml2js` builders to produce human-readable, pretty-printed XML with standard declarations.

### Fixed

- **XML Tag Integrity**: Fixed a bug where the project name would default to "java" instead of the actual workspace folder name.
- **Purge Safety**: Added null-checks to the `Purge` command to prevent extension crashes when no manifest is present in the workspace.
- **Format Consistency**: Fixed an issue where switching formats would sometimes flatten a nested dependency tree; recursion is now fully preserved during migration.

---

## [1.1.0] - 2026-04-26

### Added

- **Sovereign Manifest System**: Introducing `jar-cart.json`. Your project dependencies are now stored in a readable, editable manifest that acts as the single source of truth.
- **Nested Dependency Visualization**: "Include All Dependencies" now generates a hierarchical tree in the manifest, showing exactly which library brought in which sub-dependency.
- **Selective Sync Logic**: Users can now manually delete unwanted sub-dependencies from the manifest before installing, allowing for ultra-lean project builds.
- **Two-Stage Workflow**: Separation of the "Drafting" phase (building the JSON) and the "Installation" phase (Syncing to `/lib`).
- **Auto-Review**: The manifest now automatically opens for inspection after adding a new library.

### Changed

- **Cleaner Manifest Schema**: Simplified the JSON structure by removing redundant internal keys and timestamps for better readability.
- **Improved Version Logic**: Enhanced version comparison to handle complex Maven version strings and prioritize newer releases.
- **Enforced Sync**: The `Sync` command now strictly matches the disk to the manifest, automatically deleting any JARs not explicitly defined in the JSON.

### Fixed

- **Cognitive Complexity**: Refactored the core dependency resolver to improve extension performance and maintainability.
- **Conflict Resolution**: Fixed an issue where duplicate dependencies with different versions could cause redundant downloads; the system now settles on the highest version found in the tree.

---

## [1.0.0] - 2026-04-24

### Added

- **Maven Central Integration**: Instant access to millions of artifacts via the official Maven search API.
- **The "Cart" System**: Interactive workflow to search, select, and manage multiple libraries before downloading.
- **Recursive Dependency Solver**: New "Include All Dependencies" mode that parses POM files to download full runtime trees.
- **Surgical Download Mode**: "Direct JARs Only" option for lightweight project structures without dependency bloat.
- **Status Bar Integration**: Real-time cart counter for quick access and visibility.
- **Enhanced UI**: Added a Version Picker to select specific historical releases of any library.
- **Developer Productivity**: Global shortcut `Ctrl+Shift+J` to trigger instant search.
- **Library Hygiene**: Added a "Purge lib folder" command to wipe the workspace clean.
