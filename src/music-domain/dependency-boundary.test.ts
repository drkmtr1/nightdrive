// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("music-domain dependency boundary", () => {
  it("allows only relative imports in production modules", () => {
    const directory = new URL("./", import.meta.url);
    const productionFiles = readdirSync(directory).filter(
      (file) => file.endsWith(".ts") && !file.endsWith(".test.ts"),
    );

    for (const file of productionFiles) {
      const source = readFileSync(new URL(file, directory), "utf8");
      const specifiers = source.matchAll(/(?:from\s+|import\s*\()(["'])(?<specifier>[^"']+)\1/g);

      for (const match of specifiers) {
        expect(match.groups?.specifier, `${file} has an external import`).toMatch(/^\.\.?\//);
      }
    }
  });
});
