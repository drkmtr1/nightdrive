import { mkdir, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import {
  type ComparisonPackage,
  comparisonInventory,
  validateComparisonPackage,
} from "./stage7-arpeggiator-comparison";

function within(parent: string, target: string): boolean {
  const path = relative(parent, target);
  return path === "" || (!isAbsolute(path) && path !== ".." && !path.startsWith(`..${sep}`));
}

/** Custodian package only. Release pass1 alone; withhold pass2 until a separately accepted Pass 1 lock. */
export async function materializeStage7ComparisonPackage(
  outputDirectory: string,
  candidate: ComparisonPackage,
): Promise<void> {
  if (!isAbsolute(outputDirectory)) throw new RangeError("Explicit absolute destination required.");
  // All package-content validation and byte snapshots complete before the first await/mutation.
  const entries = validateComparisonPackage(candidate);
  comparisonInventory(entries, "custodian/package-lock.json");
  const target = resolve(outputDirectory);
  const actualParent = await realpath(dirname(target));
  const actualTarget = resolve(actualParent, basename(target));
  const repository = await realpath(process.cwd());
  if (
    within(resolve(repository, "src"), actualTarget) ||
    within(resolve(repository, "docs"), actualTarget)
  ) {
    throw new RangeError("Evaluation output cannot be under src or docs.");
  }
  // Fresh directory only, no recursive creation, no overwrite and no rollback deletion.
  await mkdir(actualTarget);
  for (const directory of ["custodian", "pass1", "pass2"])
    await mkdir(resolve(actualTarget, directory));
  for (const entry of entries)
    await writeFile(resolve(actualTarget, entry.path), entry.bytes, { flag: "wx" });
}
