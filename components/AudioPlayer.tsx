import React from "react";
import { Play, Pause, SkipForward, SkipBack, Repeat } from "lucide-react";

interface AudioPlayerProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  autoPlayEnabled: boolean;
  onToggleAutoPlay: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  autoPlayEnabled,
  onToggleAutoPlay,
}) => {
  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-30 animate-in slide-in-from-bottom duration-300">
      <div className="bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white rounded-full shadow-lg shadow-black/20 dark:shadow-black/40 px-8 py-3 flex items-center gap-6 border border-emerald-500 backdrop-blur-md">
        {/* Controls */}
        <div className="flex items-center gap-6">
          <button
            onClick={onPrev}
            className="text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors active:scale-95"
            title="Previous Ayah"
          >
            <SkipBack size={24} fill="currentColor" />
          </button>

          <button
            onClick={onPlayPause}
            className="w-12 h-12 flex items-center justify-center bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full hover:bg-slate-700 dark:hover:bg-slate-200 hover:scale-105 transition-all duration-300 shadow-lg shadow-slate-900/20 dark:shadow-white/10"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" className="ml-1" />
            )}
          </button>

          <button
            onClick={onNext}
            className="text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors active:scale-95"
            title="Next Ayah"
          >
            <SkipForward size={24} fill="currentColor" />
          </button>
        </div>

        {/* Separator */}
        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>

        {/* Autoplay Toggle */}
        <button
          onClick={onToggleAutoPlay}
          className={`
            transition-colors duration-200 flex items-center justify-center
            ${
              autoPlayEnabled
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
            }
          `}
          title={`Auto-play: ${autoPlayEnabled ? "On" : "Off"}`}
        >
          <Repeat size={20} />
        </button>
      </div>
    </div>
  );
};
