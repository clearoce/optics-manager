import { Search, X } from 'lucide-react';

type SearchBarProps = {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
};

export function SearchBar({ value, placeholder, onChange }: SearchBarProps) {
  return (
    <div className="relative w-full sm:w-80">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="text"
        placeholder={placeholder}
        className="w-full bg-white border border-slate-300 rounded-lg py-2 pl-9 pr-9 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
          aria-label="清空搜索框"
          title="清空"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
