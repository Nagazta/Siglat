import { useState, useRef } from "react";
import { Search, X } from "lucide-react";
import clsx from "clsx";

/**
 * Reusable SearchBar component.
 * @param {string} placeholder
 * @param {Function} onSearch - Called with the search value string
 * @param {string} className
 * @param {boolean} autoFocus
 */
export default function SearchBar({
  placeholder = "Search...",
  onSearch,
  className = "",
  autoFocus = false,
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const val = e.target.value;
    setValue(val);
    onSearch?.(val);
  };

  const handleClear = () => {
    setValue("");
    onSearch?.("");
    inputRef.current?.focus();
  };

  return (
    <div className={clsx("relative flex items-center", className)}>
      <Search
        size={16}
        className="absolute left-3.5 text-muted pointer-events-none"
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-border bg-white text-slate-800
                   placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30
                   focus:border-primary transition-all duration-200 text-sm"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-3 p-0.5 rounded text-muted hover:text-slate-600 transition-colors"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
