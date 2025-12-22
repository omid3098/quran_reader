import React, { useState } from "react";
import { Share2, Check } from "lucide-react";
import { buildFullVerseUrl } from "../services/urlService";
import type { ShareButtonProps } from "../types";

export const ShareButton: React.FC<ShareButtonProps> = ({
  surahId,
  verseNumber,
  className = "",
}) => {
  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = buildFullVerseUrl(surahId, verseNumber);

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy URL", error);
    }
  };

  return (
    <button onClick={handleShare} className={className} title={copied ? "Copied!" : "Share verse"}>
      {copied ? <Check size={16} /> : <Share2 size={16} />}
    </button>
  );
};
