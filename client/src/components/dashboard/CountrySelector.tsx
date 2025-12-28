import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, ChevronDown } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";

interface CountrySelectorProps {
  value: string;
  onChange: (value: string) => void;
  testId?: string;
}

function getCountryFlag(code: string): string {
  const codeMap: Record<string, string> = {
    'UK': 'GB',
    'EN': 'GB',
  };
  const mappedCode = codeMap[code.toUpperCase()] || code.toUpperCase();
  const codePoints = mappedCode
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function CountrySelector({ value, onChange, testId }: CountrySelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredCountries = useMemo(() => {
    if (!search) return COUNTRIES;
    const lowerSearch = search.toLowerCase();
    return COUNTRIES.filter(
      c => c.code.toLowerCase().includes(lowerSearch) || 
           c.name.toLowerCase().includes(lowerSearch)
    );
  }, [search]);

  const selectedCountry = COUNTRIES.find(c => c.code === value);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between bg-card border-border text-foreground hover:bg-muted h-8 text-sm font-mono"
        onClick={() => setOpen(!open)}
        data-testid={testId}
      >
        <span className="text-left flex items-center gap-2">
          {selectedCountry ? (
            <>
              <span className="text-lg">{getCountryFlag(selectedCountry.code)}</span>
              <span>{selectedCountry.code} - {selectedCountry.name}</span>
            </>
          ) : "ГЕО (код страны)"}
        </span>
        <ChevronDown className={`w-4 h-4 opacity-50 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-md shadow-lg">
          <div className="p-2 border-b border-border">
            <Input
              placeholder="Поиск по коду или названию..."
              className="bg-muted border-border text-foreground text-xs h-7"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              data-testid={`${testId}-search`}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredCountries.length === 0 ? (
              <div className="p-3 text-center text-muted-foreground text-xs">Не найдено</div>
            ) : (
              filteredCountries.map(country => (
                <button
                  key={country.code}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-white/10 transition-colors flex items-center gap-2 ${
                    value === country.code ? "bg-blue-600/30 text-blue-400" : "text-muted-foreground"
                  }`}
                  onClick={() => {
                    onChange(country.code);
                    setOpen(false);
                    setSearch("");
                  }}
                  data-testid={`country-${country.code}`}
                >
                  <span className="text-base">{getCountryFlag(country.code)}</span>
                  <span className="font-mono font-bold">{country.code}</span>
                  <span className="text-muted-foreground">{country.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {value && (
        <button
          type="button"
          className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={() => onChange("")}
          data-testid={`${testId}-clear`}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
