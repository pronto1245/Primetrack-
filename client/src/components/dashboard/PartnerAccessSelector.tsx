import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Users, X, ChevronDown } from "lucide-react";

interface Partner {
  publisherId: string;
  username: string;
  email: string;
}

interface PartnerAccessSelectorProps {
  partners: Partner[];
  selectedPartnerIds: string[];
  onAdd: (partnerId: string) => void;
  onRemove: (partnerId: string) => void;
  showWarning?: boolean;
}

export function PartnerAccessSelector({
  partners,
  selectedPartnerIds,
  onAdd,
  onRemove,
  showWarning = true,
}: PartnerAccessSelectorProps) {
  const [partnerSearch, setPartnerSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredPartners = partners?.filter(p => 
    !selectedPartnerIds.includes(p.publisherId) &&
    (partnerSearch === "" || 
     p.username.toLowerCase().includes(partnerSearch.toLowerCase()) ||
     p.email.toLowerCase().includes(partnerSearch.toLowerCase()))
  ) || [];

  return (
    <div className="space-y-3">
      <Label className="text-red-400 text-xs font-mono uppercase flex items-center gap-2">
        <Lock className="w-3 h-3" /> Доступ к приватному офферу
      </Label>
      <p className="text-xs text-muted-foreground">
        Выберите партнёров, которые получат доступ к этому офферу. Остальные партнёры не увидят его в каталоге.
      </p>
      
      {selectedPartnerIds.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedPartnerIds.map(id => {
            const partner = partners?.find(p => p.publisherId === id);
            return (
              <span 
                key={id} 
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/20 text-red-400 text-xs"
              >
                <Users className="w-3 h-3" />
                {partner?.username || id}
                <button
                  type="button"
                  onClick={() => onRemove(id)}
                  className="hover:text-red-300 transition-colors"
                  data-testid={`button-remove-partner-${id}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
      
      <div className="relative" ref={containerRef}>
        <div className="relative">
          <Input
            placeholder="Выберите партнёра или начните ввод..."
            value={partnerSearch}
            onChange={e => setPartnerSearch(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onClick={() => setIsOpen(true)}
            className="bg-background border-border text-foreground font-mono focus:border-red-500 pr-8"
            data-testid="input-partner-search"
          />
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            onMouseDown={e => e.preventDefault()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
            data-testid="button-toggle-partner-dropdown"
            aria-label={isOpen ? "Закрыть список партнёров" : "Открыть список партнёров"}
          >
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
        {isOpen && filteredPartners.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-auto">
            {filteredPartners.map(partner => (
              <button
                key={partner.publisherId}
                type="button"
                onClick={() => {
                  onAdd(partner.publisherId);
                  setPartnerSearch("");
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2 text-sm"
                data-testid={`button-add-partner-${partner.publisherId}`}
              >
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{partner.username}</span>
                <span className="text-muted-foreground text-xs">({partner.email})</span>
              </button>
            ))}
          </div>
        )}
        {isOpen && filteredPartners.length === 0 && (
          <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg p-3 text-center text-muted-foreground text-sm">
            {partners?.length === selectedPartnerIds.length ? "Все партнёры уже выбраны" : "Партнёры не найдены"}
          </div>
        )}
      </div>
      
      {showWarning && selectedPartnerIds.length === 0 && (
        <p className="text-xs text-yellow-500 flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Пока не выбран ни один партнёр — оффер будет полностью скрыт
        </p>
      )}
    </div>
  );
}
