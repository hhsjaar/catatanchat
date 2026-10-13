'use client';

import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { NOTE_SORT_OPTIONS, NoteSortOrder } from '@/lib/noteSort';

interface NoteSortToggleProps {
  value: NoteSortOrder;
  onChange: (order: NoteSortOrder) => void;
}

export const NoteSortToggle: React.FC<NoteSortToggleProps> = ({ value, onChange }) => (
  <div className="flex items-center gap-1.5 text-xs">
    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
    <span className="text-slate-500 font-medium shrink-0">Urutan:</span>
    {NOTE_SORT_OPTIONS.map(opt => (
      <button
        key={opt.value}
        type="button"
        onClick={() => onChange(opt.value)}
        className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-all border ${
          value === opt.value
            ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200/70'
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);
