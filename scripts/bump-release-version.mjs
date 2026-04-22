import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

const VERSION_FILES = [
  "package.json",
  "src-tauri/tauri.conf.json",
  "src-tauri/Cargo.toml",
];

function readFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

export function validateVersion(version) {
  if (!VERSION_PATTERN.test(version)) {
    throw new Error("Expected version in the form X.Y.Z");
  }

  return version;
}

export function formatTagName(version) {
  return `v${validateVersion(version)}`;
}

export function updateJsonVersion(contents, version) {
  const parsed = JSON.parse(contents);

  if (typeof parsed.version !== "string") {
    throw new Error("Could not find root version field");
  }

  parsed.version = version;

  return `${JSON.stringify(parsed, null, 2)}\n`;
}

export function updateCargoTomlVersion(contents, version) {
  const packageSectionStart = contents.indexOf("[package]\n");

  if (packageSectionStart === -1) {
    throw new Error("Could not find [package] section");
  }

  const nextSectionIndex = contents
    .slice(packageSectionStart + 10)
    .search(/^\[/m);
  const packageSectionEnd =
    nextSectionIndex === -1
      ? contents.length
      : packageSectionStart + 10 + nextSectionIndex;
  const packageSection = contents.slice(packageSectionStart, packageSectionEnd);
  const currentVersionLine = packageSection.match(/^version = "[^"]+"$/m);

  if (currentVersionLine === null) {
    throw new Error("Could not find package version field");
  }

  const newVersionLine = `version = "${version}"`;

  const updatedPackageSection = packageSection.replace(
    currentVersionLine,
    newVersionLine,
  );

  return contents.replace(packageSection, updatedPackageSection);
}

function readJsonVersion(contents) {
  const parsed = JSON.parse(contents);

  if (typeof parsed.version !== "string") {
    throw new Error("Could not find root version field");
  }

  return parsed.version;
}

function readCargoTomlVersion(contents) {
  const packageSectionStart = contents.indexOf("[package]\n");

  if (packageSectionStart === -1) {
    throw new Error("Could not find [package] section");
  }

  const nextSectionIndex = contents
    .slice(packageSectionStart + 10)
    .search(/^\[/m);
  const packageSectionEnd =
    nextSectionIndex === -1
      ? contents.length
      : packageSectionStart + 10 + nextSectionIndex;
  const packageSection = contents.slice(packageSectionStart, packageSectionEnd);
  const match = packageSection.match(/^version = "([^"]+)"$/m);

  if (!match) {
    throw new Error("Could not find package version field");
  }

  return match[1];
}

function readVersionFromContents(relativePath, contents) {
  return relativePath.endsWith(".toml")
    ? readCargoTomlVersion(contents)
    : readJsonVersion(contents);
}

export function getSynchronizedVersion(versionMap) {
  const entries = Object.entries(versionMap);

  if (entries.length === 0) {
    throw new Error("No version files were provided");
  }

  const uniqueVersions = [...new Set(entries.map(([, version]) => version))];

  if (uniqueVersions.length !== 1) {
    const details = entries
      .map(([file, version]) => `${file}: ${version}`)
      .join(", ");
    throw new Error(`Version files are out of sync: ${details}`);
  }

  return validateVersion(uniqueVersions[0]);
}

export function readVersions() {
  return Object.fromEntries(
    VERSION_FILES.map((relativePath) => [
      relativePath,
      readVersionFromContents(relativePath, readFile(relativePath)),
    ]),
  );
}

export function getReleaseTag() {
  return formatTagName(getSynchronizedVersion(readVersions()));
}

function updateFile(relativePath, version) {
  const absolutePath = path.join(repoRoot, relativePath);
  const original = readFile(relativePath);
  const updated = relativePath.endsWith(".toml")
    ? updateCargoTomlVersion(original, version)
    : updateJsonVersion(original, version);

  fs.writeFileSync(absolutePath, updated);
}

export function bumpVersion(version) {
  const validatedVersion = validateVersion(version);

  for (const relativePath of VERSION_FILES) {
    updateFile(relativePath, validatedVersion);
  }
}

function printCurrentTag() {
  const tagName = getReleaseTag();
  console.log(tagName);
}

function main(argv) {
  const command = argv[2];

  if (!command) {
    throw new Error(
      "Usage: node scripts/bump-release-version.mjs <version> | --print-tag",
    );
  }

  if (command === "--print-tag") {
    printCurrentTag();
    return;
  }

  bumpVersion(command);
  console.log(`Updated release version to ${command}`);

  console.log(
    `Running 'pnpm tauri info' to check for compatible tauri versions between Js & Rust...`,
  );

  const tauriInfoResult = spawnSync("pnpm", ["tauri", "info"], {
    stdio: "inherit",
  });

  if (tauriInfoResult.status !== 0) {
    throw new Error(
      "`pnpm tauri info` exited with an error, make sure tauri versions in Js & Rust are in-sync.",
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv);
}
