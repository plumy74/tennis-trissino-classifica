import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';

interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  dropdownClassName?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Seleziona...',
  searchPlaceholder = 'Cerca...',
  className = '',
  dropdownClassName = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        className="w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 hover:border-slate-300 focus:outline-none focus:border-orange-500 cursor-pointer text-left transition-all shadow-sm"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className="w-4 h-4 text-slate-500 shrink-0 ml-2" />
      </button>
 
      {/* Dropdown Panel */}
      {isOpen && (
        <div className={`absolute left-0 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/80 z-50 p-2 space-y-1.5 min-w-[240px] max-h-64 flex flex-col ${dropdownClassName}`}>
          {/* Search Input inside the dropdown */}
          <div className="relative shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 font-medium"
              autoFocus
            />
          </div>
 
          {/* Options List */}
          <div className="overflow-y-auto flex-1 space-y-0.5 pr-0.5 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-orange-50 hover:text-orange-600 cursor-pointer ${
                    opt.value === value ? 'bg-orange-50 text-orange-600 font-bold' : 'text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))
            ) : (
              <div className="text-[11px] text-slate-400 text-center py-3 italic">
                Nessun risultato trovato
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
