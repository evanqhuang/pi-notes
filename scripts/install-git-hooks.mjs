#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { verifyRepository } from "./verify-repo-identity.mjs";

const { root } = verifyRepository({ requireMain: true });
execFileSync("git", ["config", "core.hooksPath", ".githooks"], { cwd: root, stdio: "inherit" });
console.log(`[repo-identity] installed .githooks for ${root}`);
