
import React from 'react';
import { X, ExternalLink } from 'lucide-react';

interface IframeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

export const IframeModal: React.FC<IframeModalProps> = ({ isOpen, onClose, url, title }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-4">{title}</h3>
            <div className="flex gap-2 shrink-0">
                 <a 
                   href={url} 
                   target="_blank" 
                   rel="noreferrer" 
                   className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm font-medium transition-colors" 
                   title="Open in new tab"
                 >
                    <span className="hidden sm:inline">Open in New Tab</span>
                    <ExternalLink size={16} />
                </a>
                <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors">
                    <X size={20} />
                </button>
            </div>
        </div>
        <div className="flex-1 relative bg-white w-full h-full">
             <iframe 
               src={url} 
               className="w-full h-full border-0" 
               title={title} 
               sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
               referrerPolicy="no-referrer"
             />
        </div>
      </div>
    </div>
  );
};
