
import React, { useState } from 'react';
import { Chapter } from '../types';
import { Search, BookOpen } from 'lucide-react';
import { Spinner } from './Spinner';

interface SidebarProps {
  chapters: Chapter[];
  currentChapterId: number;
  onSelectChapter: (id: number) => void;
  loading: boolean;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  chapters, 
  currentChapterId, 
  onSelectChapter, 
  loading,
  isOpen,
  onCloseMobile
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChapters = chapters.filter(c => 
    c.name_simple.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.translated_name.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id.toString().includes(searchTerm)
  );

  return (
    <div className={`
      fixed inset-y-0 left-0 z-30 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      md:relative md:translate-x-0 md:w-80 flex flex-col h-full shadow-xl md:shadow-none
    `}>
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-emerald-600 p-2 rounded-lg text-white">
            <BookOpen size={24} />
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Open Quran Reader</h1>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search Surah..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-1">
        {loading && <div className="flex justify-center p-10"><Spinner className="text-emerald-600" /></div>}
        
        {!loading && filteredChapters.map((chapter) => (
          <button
            key={chapter.id}
            onClick={() => {
              onSelectChapter(chapter.id);
              onCloseMobile();
            }}
            className={`
              w-full flex items-center justify-between p-3 rounded-xl text-left transition-all duration-200 group
              ${currentChapterId === chapter.id 
                ? 'bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-100' 
                : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'}
            `}
          >
            <div className="flex items-center gap-4">
              <div className={`
                w-8 h-8 flex items-center justify-center rounded-full text-xs font-semibold transition-colors
                ${currentChapterId === chapter.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}
              `}>
                {chapter.id}
              </div>
              <div>
                <div className="font-medium text-sm">{chapter.name_simple}</div>
                <div className={`text-xs ${currentChapterId === chapter.id ? 'text-emerald-600/80' : 'text-slate-400'}`}>
                  {chapter.translated_name.name}
                </div>
              </div>
            </div>
            <div className="font-vazir text-lg opacity-40 group-hover:opacity-70 transition-opacity">
              {chapter.name_arabic}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
