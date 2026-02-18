export interface ColorEntry {
  label: string;
  swatch: string;
  description: string;
}

export const NODE_READER_COLORS: Record<string, ColorEntry> = {
  lemmaMatch: {
    label: "Lemma Match",
    swatch: "bg-amber-500",
    description: "Shared word form",
  },
  rootMatch: {
    label: "Root Match",
    swatch: "bg-teal-500",
    description: "Shared root",
  },
  rootAnalysis: {
    label: "Root",
    swatch: "bg-indigo-500",
    description: "Root analysis",
  },
  selected: {
    label: "Selected",
    swatch: "bg-emerald-500",
    description: "Current selection",
  },
  userData: {
    label: "Personal Data",
    swatch: "bg-yellow-400",
    description: "Notes & connections",
  },
};
