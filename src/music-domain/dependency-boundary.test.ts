// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function importedSpecifiers(source: string): string[] {
  return Array.from(
    source.matchAll(/(?:from\s+|import\s*(?:\(\s*)?)(["'])(?<specifier>[^"']+)\1/g),
    (match) => match.groups?.specifier ?? "",
  );
}

describe("music-domain dependency boundary", () => {
  it("allows only relative imports in production modules", () => {
    const directory = new URL("./", import.meta.url);
    const productionFiles = readdirSync(directory).filter(
      (file) => file.endsWith(".ts") && !file.endsWith(".test.ts"),
    );

    for (const file of productionFiles) {
      const source = readFileSync(new URL(file, directory), "utf8");

      for (const specifier of importedSpecifiers(source)) {
        expect(specifier, `${file} has an external import`).toMatch(/^\.\.?\//);
      }
    }
  });

  it("recognizes static, dynamic, re-export, and side-effect-only imports", () => {
    expect(
      importedSpecifiers(`
        import value from "package-static";
        import("package-dynamic");
        export { value } from "package-reexport";
        import "package-side-effect";
        import "./relative-side-effect";
      `),
    ).toEqual([
      "package-static",
      "package-dynamic",
      "package-reexport",
      "package-side-effect",
      "./relative-side-effect",
    ]);
  });
});
