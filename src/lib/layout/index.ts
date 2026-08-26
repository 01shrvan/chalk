import type { Spec } from "../forms";
import { comparison } from "./comparison";
import { dataflow } from "./dataflow";
import { sequence } from "./sequence";
import type { Plan } from "./types";

export * from "./types";

export function layout(spec: Spec): Plan {
  switch (spec.form) {
    case "sequence":
      return sequence(spec);
    case "dataflow":
      return dataflow(spec);
    case "comparison":
      return comparison(spec);
  }
}
