export type Variant = "plain" | "accent" | "muted" | "result" | "rewritten";

export type Item =
  | {
      kind: "box" | "circle";
      id: string;
      label: string;
      x: number;
      y: number;
      w: number;
      h: number;
      variant: Variant;
      owner?: string;
    }
  | {
      kind: "title";
      id: string;
      label: string;
      x: number;
      y: number;
      w: number;
      h: number;
    }
  | {
      kind: "lifeline";
      id: string;
      owner: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }
  | {
      kind: "arrow";
      id: string;
      label: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      dashed: boolean;
    }
  | {
      kind: "curve";
      id: string;
      label: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      bend: number;
    };

export type Plan = {
  items: Item[];
  width: number;
  height: number;
};

export const PAD = 36;
