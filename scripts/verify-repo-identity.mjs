#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

function git(args, cwd) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (error) {
    const detail = error?.stderr?.toString().trim();
    throw new Error(`git ${args.join(" ")} failed${detail ? `: ${detail}` : ""}`);
  }
}

export function normalizeRepositoryUrl(value) {
  return value
    .trim()
    .replace(/^git\+/i, "")
    .replace(/^ssh:\/\/git@/i, "")
    .replace(/^git@/i, "")
    .replace(/^https?:\/\//i, "")
    .replace(/^github\.com:/i, "github.com/")
    .replace(/\.git$/i, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

function repositoryUrl(packageJson) {
  const repository = packageJson.repository;
  if (typeof repository === "string") return repository;
  if (repository && typeof repository.url === "string") return repository.url;
  return undefined;
}

function argumentValue(args, name, fallback) {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
}

export function verifyRepository({ cwd = process.cwd(), remoteName = "origin", allowDetached = false, requireMain = false } = {}) {
  const root = realpathSync(git(["rev-parse", "--show-toplevel"], cwd));
  const packagePath = join(root, "package.json");
  if (!existsSync(packagePath)) throw new Error(`Dedicated package checkout is required; no package.json at ${root}`);

  const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
  const expectedRaw = repositoryUrl(packageJson);
  if (!expectedRaw) throw new Error(`package.json at ${root} must declare repository.url before committing`);

  const actualRaw = git(["remote", "get-url", "--push", remoteName], root);
  const expected = normalizeRepositoryUrl(expectedRaw);
  const actual = normalizeRepositoryUrl(actualRaw);
  if (expected !== actual) {
    throw new Error([
      "Repository identity mismatch.",
      `root: ${root}`,
      `expected push remote: ${expected}`,
      `actual ${remoteName} push remote: ${actual}`,
      "Edit and push from the dedicated repository checkout, not a nested package mirror.",
    ].join("\n"));
  }

  const branch = git(["branch", "--show-current"], root);
  if (!branch && !allowDetached) throw new Error(`Repository checkout is detached at ${root}; check out a named branch before committing`);
  if (requireMain && branch !== "main") throw new Error(`Expected branch main, got ${branch || "(detached)"}`);
  return { root, branch, expected, remoteName };
}

const args = process.argv.slice(2);
const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  try {
    const result = verifyRepository({
      remoteName: argumentValue(args, "--remote", "origin"),
      allowDetached: args.includes("--ci"),
      requireMain: args.includes("--main"),
    });
    console.log(`[repo-identity] ok root=${result.root} remote=${result.expected} branch=${result.branch || "(detached)"}`);
  } catch (error) {
    console.error(`[repo-identity] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
