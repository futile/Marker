import test from "node:test";
import assert from "node:assert/strict";

import {
  formatTagName,
  getSynchronizedVersion,
  updateCargoTomlVersion,
  updateJsonVersion,
  validateVersion,
} from "./bump-release-version.mjs";

test("validateVersion accepts simple semver", () => {
  assert.equal(validateVersion("1.5.0"), "1.5.0");
});

test("validateVersion rejects non-semver input", () => {
  assert.throws(
    () => validateVersion("v1.5.0"),
    /Expected version in the form X\.Y\.Z/
  );
});

test("formatTagName prefixes the version with v", () => {
  assert.equal(formatTagName("1.5.0"), "v1.5.0");
});

test("updateJsonVersion updates the root version field", () => {
  const original = JSON.stringify(
    {
      name: "marker",
      version: "1.4.1",
    },
    null,
    2
  );

  const updated = updateJsonVersion(original, "1.5.0");
  const parsed = JSON.parse(updated);

  assert.equal(parsed.version, "1.5.0");
});

test("updateCargoTomlVersion updates only the package version", () => {
  const original = `[package]
name = "marker"
version = "1.4.1"

[dependencies]
tauri = { version = "2.9.5", features = [ "protocol-asset" ] }
`;

  const updated = updateCargoTomlVersion(original, "1.5.0");

  assert.match(updated, /version = "1\.5\.0"/);
  assert.match(updated, /tauri = \{ version = "2\.9\.5"/);
});

test("updateCargoTomlVersion fails if the package version is missing", () => {
  const original = `[package]
name = "marker"

[dependencies]
tauri = { version = "2.9.5" }
`;

  assert.throws(
    () => updateCargoTomlVersion(original, "1.5.0"),
    /Could not find package version field/
  );
});

test("getSynchronizedVersion returns the shared version when all files match", () => {
  const version = getSynchronizedVersion({
    "package.json": "1.5.0",
    "src-tauri/tauri.conf.json": "1.5.0",
    "src-tauri/Cargo.toml": "1.5.0",
  });

  assert.equal(version, "1.5.0");
});

test("getSynchronizedVersion fails when versions are out of sync", () => {
  assert.throws(
    () =>
      getSynchronizedVersion({
        "package.json": "1.5.0",
        "src-tauri/tauri.conf.json": "1.5.1",
        "src-tauri/Cargo.toml": "1.5.0",
      }),
    /Version files are out of sync/
  );
});
