import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

type RawIdentity = { byteLength: number; sha256: string };

export type TrackedBlobIdentity = RawIdentity & {
  commit: string;
  path: string;
  gitBlobOid?: string;
};

export type HistoricalCheckoutObservation = RawIdentity & {
  platform: string;
  architecture: string;
  relationship: "raw-git-blob" | "lf-to-crlf";
};

export type InstalledToolObservation = {
  platform: string;
  architecture: string;
  packageName: string;
  packageVersion: string;
  files: Array<RawIdentity & { path: string }>;
};

function fail(message: string): never {
  throw new Error(`First Playable provenance: ${message}`);
}

function validRawIdentity(identity: RawIdentity): void {
  if (!Number.isSafeInteger(identity.byteLength) || identity.byteLength < 0) {
    fail("invalid byte length");
  }
  if (!/^[0-9a-f]{64}$/.test(identity.sha256)) fail("invalid SHA-256");
}

function validPath(path: string): boolean {
  return (
    typeof path === "string" &&
    path.length > 0 &&
    !path.startsWith("/") &&
    !path.includes("\\") &&
    !path.includes(":") &&
    !Array.from(path).some((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127;
    }) &&
    path.split("/").every((part) => part !== "" && part !== "." && part !== "..")
  );
}

function checkRawBytes(bytes: Uint8Array, identity: RawIdentity, label: string): void {
  validRawIdentity(identity);
  if (bytes.byteLength !== identity.byteLength) fail(`${label} byte length mismatch`);
  if (createHash("sha256").update(bytes).digest("hex") !== identity.sha256) {
    fail(`${label} SHA-256 mismatch`);
  }
}

/** Reads only the recorded commit/path's raw Git blob, never the checkout. */
export function verifyTrackedBlob(repositoryRoot: string, identity: TrackedBlobIdentity): Buffer {
  if (!/^[0-9a-f]{40}$/.test(identity.commit)) fail("invalid full commit SHA");
  if (!validPath(identity.path)) fail("invalid slash-relative path");
  validRawIdentity(identity);
  if (identity.gitBlobOid !== undefined && !/^[0-9a-f]{40}$/.test(identity.gitBlobOid)) {
    fail("invalid Git blob OID");
  }

  const git = (args: string[]): Buffer => {
    try {
      return execFileSync("git", args, {
        cwd: repositoryRoot,
        maxBuffer: 128 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch {
      return fail("recorded commit/path blob unavailable");
    }
  };
  const commitType = git(["cat-file", "-t", identity.commit]).toString("utf8").trim();
  if (commitType !== "commit") fail("recorded identity is not a commit");
  const object = `${identity.commit}:${identity.path}`;
  const blobOid = git(["rev-parse", "--verify", object]).toString("utf8").trim();
  if (git(["cat-file", "-t", blobOid]).toString("utf8").trim() !== "blob") {
    fail("recorded path is not a blob");
  }
  if (identity.gitBlobOid !== undefined && blobOid !== identity.gitBlobOid) {
    fail("Git blob OID mismatch");
  }
  const bytes = git(["cat-file", "blob", blobOid]);
  checkRawBytes(bytes, identity, "tracked blob");
  return bytes;
}

function expandLfToCrlf(bytes: Uint8Array): Buffer {
  const expanded: number[] = [];
  for (let index = 0; index < bytes.length; index++) {
    if (bytes[index] === 10 && (index === 0 || bytes[index - 1] !== 13)) expanded.push(13);
    expanded.push(bytes[index]);
  }
  return Buffer.from(expanded);
}

/** Checks a recorded checkout relationship without reading today's checkout. */
export function verifyHistoricalCheckout(
  portableBlob: Uint8Array,
  observation: HistoricalCheckoutObservation,
  observedBytes?: Uint8Array,
): { kind: "historical-checkout"; platform: string; architecture: string } {
  if (!observation.platform || !observation.architecture)
    fail("missing checkout platform identity");
  const expected =
    observation.relationship === "raw-git-blob"
      ? Buffer.from(portableBlob)
      : observation.relationship === "lf-to-crlf"
        ? expandLfToCrlf(portableBlob)
        : fail("unexplained checkout relationship");
  checkRawBytes(expected, observation, "historical checkout");
  if (observedBytes !== undefined && !expected.equals(Buffer.from(observedBytes))) {
    fail("historical checkout bytes do not match claimed relationship");
  }
  return {
    kind: "historical-checkout",
    platform: observation.platform,
    architecture: observation.architecture,
  };
}

/** Generated evidence retains exact raw-byte custody, even when committed. */
export function verifyGeneratedArtifact(
  bytes: Uint8Array,
  identity: RawIdentity,
): {
  kind: "generated-artifact";
} {
  checkRawBytes(bytes, identity, "generated artifact");
  return { kind: "generated-artifact" };
}

/** Structural classification only; this does not qualify a platform or inspect installed files. */
export function inspectInstalledTool(observation: InstalledToolObservation): {
  kind: "installed-tool";
  platform: string;
  architecture: string;
  packageName: string;
  packageVersion: string;
  fileCount: number;
} {
  if (
    !observation.platform ||
    !observation.architecture ||
    !observation.packageName ||
    !observation.packageVersion ||
    !Array.isArray(observation.files) ||
    observation.files.length === 0
  ) {
    fail("incomplete installed-tool identity");
  }
  for (const file of observation.files) {
    if (!validPath(file.path)) fail("invalid installed-tool relative path");
    validRawIdentity(file);
  }
  return {
    kind: "installed-tool",
    platform: observation.platform,
    architecture: observation.architecture,
    packageName: observation.packageName,
    packageVersion: observation.packageVersion,
    fileCount: observation.files.length,
  };
}
