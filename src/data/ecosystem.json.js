// Data loader: parses the TriG dataset once, at build time, into plain JSON quads.
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {Parser} from "n3";

const file = fileURLToPath(new URL("./ecosystem.trig", import.meta.url));
const quads = new Parser({format: "application/trig"}).parse(readFileSync(file, "utf8"));

process.stdout.write(
  JSON.stringify(
    quads.map((q) => ({
      s: q.subject.value,
      p: q.predicate.value,
      o: q.object.value,
      literal: q.object.termType === "Literal",
      g: q.graph.value
    }))
  )
);
