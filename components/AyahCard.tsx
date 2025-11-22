
import React from 'react';
import { Verse } from '../types';
import { Sparkles, NotebookPen } from 'lucide-react';

interface AyahCardProps {
  verse: Verse;
  chapterName: string;
  chapterId: number;
  onExplain: (verse: Verse, e: React.MouseEvent) => void;
  onNote: (verse: Verse, e: React.MouseEvent) => void;
  onSelect: () => void;
  isActive: boolean;
  fontSize: number;
  showTranslation: boolean;
  note?: string; // Current note text if exists
  scriptType: 'uthmani' | 'simple';
}

export const AyahCard: React.FC<AyahCardProps> = ({ 
  verse, 
  chapterId, 
  onExplain, 
  onNote,
  onSelect,
  isActive,
  fontSize,
  showTranslation,
  note,
  scriptType
}) => {
  const verseNum = verse.verse_key.split(':')[1];
  
  // Calculate translation font size relative to Arabic font size
  const translationFontSize = Math.max(14, Math.round(fontSize * 0.55));

  // Check if note contains Arabic/Persian characters to apply RTL and Vazir font
  const isRtlNote = note ? /[\u0600-\u06FF]/.test(note) : false;

  // Select correct text based on setting
  const displayText = scriptType === 'simple' ? verse.text_simple : verse.text_uthmani;
  
  const renderArabicText = () => {
    if (!displayText) return null;
    // Split by space to render individual words
    return displayText.split(' ').map((word, i, arr) => (
      <React.Fragment key={i}>
        <span 
          data-word-index={i}
          className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors duration-150 rounded px-0.5 -mx-0.5 cursor-text"
        >
          {word}
        </span>
        {i < arr.length - 1 && ' '}
      </React.Fragment>
    ));
  };

  return (
    <div 
      id={`ayah-${chapterId}-${verseNum}`}
      onClick={(e) => {
        // If the user is selecting text, do NOT trigger the row selection/activation.
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) {
          return;
        }
        onSelect();
      }}
      className={`
        group scroll-mt-48 border-b border-slate-100 dark:border-slate-800 py-8 px-4 md:px-8 transition-all duration-300 cursor-default rounded-xl
        ${isActive 
          ? 'bg-emerald-50/60 dark:bg-emerald-900/20 ring-1 ring-emerald-100 dark:ring-emerald-900/50 shadow-sm' 
          : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/50'}
      `}
    >
      <div className="flex flex-col gap-6">
        {/* Top Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`
              px-3 py-1 rounded-full text-xs font-medium transition-colors
              ${isActive 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' 
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}
            `}>
              {chapterId}:{verseNum}
            </span>
            {/* Small indicator if note exists */}
            {note && (
              <span className="block md:hidden w-2 h-2 rounded-full bg-yellow-400"></span>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button 
              onClick={(e) => onNote(verse, e)}
              className={`
                p-2 rounded-full transition-colors flex items-center gap-2
                ${note 
                  ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}
              `}
              title="Personal Note"
            >
              <NotebookPen size={16} />
              {note && <span className="text-xs font-medium hidden sm:block">Edit Note</span>}
            </button>
            <button 
              onClick={(e) => onExplain(verse, e)}
              className="p-2 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 transition-colors"
              title="AI Tafseer"
            >
              <Sparkles size={16} />
            </button>
          </div>
        </div>

        {/* Arabic Text with Selection Data */}
        <div 
           className="w-full text-right relative" 
           dir="rtl" 
           data-verse-key={verse.verse_key}
        >
          <p 
            className="font-quran leading-[2.5] text-slate-800 dark:text-slate-100 mb-2 transition-all duration-300 selection:bg-emerald-200/50 dark:selection:bg-emerald-700/50"
            style={{ fontSize: `${fontSize}px` }}
          >
            {renderArabicText()}
          </p>
        </div>

        {/* Translations */}
        {showTranslation && verse.translations && verse.translations.length > 0 && (
          <div className="max-w-5xl space-y-4 mt-2 w-full">
            {verse.translations.map((t, idx) => {
               const cleanText = t.text.replace(/<[^>]*>/g, '');
               const isRtl = t.direction === 'rtl';
               const isResourceNameRtl = t.resource_name && /[\u0600-\u06FF]/.test(t.resource_name);

               return (
                 <div 
                    key={t.id || idx} 
                    dir={isRtl ? 'rtl' : 'ltr'}
                    style={{ fontSize: `${translationFontSize}px` }}
                    className={`
                      text-slate-600 dark:text-slate-400 leading-relaxed font-light transition-all duration-300
                      ${isRtl 
                        ? 'text-right border-r-2 border-slate-100 dark:border-slate-800 pr-4 font-vazir' 
                        : 'text-left border-l-2 border-slate-100 dark:border-slate-800 pl-4 font-sans'
                      }
                    `}
                 >
                   <p>
                     <span className={`
                       inline-block text-[0.75em] font-bold text-emerald-600 dark:text-emerald-500 opacity-90 me-2
                       ${isResourceNameRtl ? 'font-vazir' : 'font-sans'}
                     `}>
                       {t.resource_name}
                     </span>
                     <span>{cleanText}</span>
                   </p>
                 </div>
               );
            })}
          </div>
        )}

        {/* Display Note if exists */}
        {note && (
          <div 
            dir={isRtlNote ? 'rtl' : 'ltr'}
            className={`
              mt-4 p-4 bg-yellow-50 dark:bg-yellow-500/5 border border-yellow-100 dark:border-yellow-500/20 rounded-lg relative group/note
              ${isRtlNote ? 'font-vazir' : ''}
            `}
            onClick={(e) => { e.stopPropagation(); onNote(verse, e); }}
          >
             <div className={`absolute top-3 opacity-50 ${isRtlNote ? 'right-3' : 'left-3'}`}>
                <NotebookPen size={14} className="text-yellow-500" />
             </div>
             <p 
               className={`
                 text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed cursor-text
                 ${isRtlNote ? 'pr-6' : 'pl-6'}
               `}
               style={{ fontSize: `${translationFontSize}px` }}
             >
               {note}
             </p>
             <div className={`text-[10px] text-yellow-600/70 dark:text-yellow-500/70 mt-2 font-medium ${isRtlNote ? 'text-left' : 'text-right'}`}>
               Personal Note
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
