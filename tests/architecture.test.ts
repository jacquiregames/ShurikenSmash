import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = resolve(import.meta.dirname, "../src");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(SRC).filter((f) => /\.(ts|tsx|css)$/.test(f));

function importsOf(file: string): string[] {
  const text = readFileSync(file, "utf8");
  const out: string[] = [];
  for (const m of text.matchAll(/(?:from\s+|import\s+|@import\s+(?:url\()?)["'](\.[^"']+)["']/g)) {
    out.push(m[1]);
  }
  return out;
}

/** "shared" | "app" | "modes/<id>" | "root" for a path inside src. */
function layerOf(abs: string): string {
  const parts = relative(SRC, abs).split(sep);
  if (parts[0] === "modes") return parts.length > 2 ? `modes/${parts[1]}` : "registry";
  if (parts[0] === "shared" || parts[0] === "app") return parts[0];
  return "root";
}

const violations = (allowed: (from: string, to: string) => boolean) =>
  files.flatMap((file) =>
    importsOf(file)
      .map((spec) => resolve(dirname(file), spec))
      .filter((target) => target.startsWith(SRC))
      .filter((target) => !allowed(layerOf(file), layerOf(target)))
      .map((target) => `${relative(SRC, file)} -> ${relative(SRC, target)}`),
  );

describe("layer boundaries", () => {
  it("shared code never imports modes or the app", () => {
    expect(violations((from, to) => from !== "shared" || to === "shared")).toEqual([]);
  });

  it("a mode only imports itself and shared code (only the registry sees every mode)", () => {
    expect(
      violations((from, to) => !from.startsWith("modes/") || to === from || to === "shared"),
    ).toEqual([]);
  });

  it("the mode registry is the one place that imports every mode's meta", () => {
    const registry = readFileSync(join(SRC, "modes/registry.ts"), "utf8");
    const dirs = readdirSync(join(SRC, "modes")).filter((n) =>
      statSync(join(SRC, "modes", n)).isDirectory(),
    );
    const registered = dirs.filter((d) => d === "kunai" || registry.includes(`./${d}/meta`));
    expect(registered.sort()).toEqual(dirs.sort());
  });
});
