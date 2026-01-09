import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Globe, Menu, X, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useQuery } from "@tanstack/react-query";

export function Navbar() {
  const { t, i18n } = useTranslation();
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: platformSettings } = useQuery<any>({
    queryKey: ["/api/public/platform-settings"],
  });

  const platformName = platformSettings?.platformName || t("brand");

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 border-b ${
      scrolled 
        ? 'bg-background/90 backdrop-blur-md border-border py-3' 
        : 'bg-background border-transparent py-4'
    }`}>
      <div className="container mx-auto px-4 flex items-center justify-between">
        
        {/* Brand - Tech/Terminal Style */}
        <Link href="/" className="flex items-center gap-2 group">
          {platformSettings?.platformLogoUrl ? (
            <img src={platformSettings.platformLogoUrl} alt={platformName} className="w-8 h-8 rounded object-cover" />
          ) : (
            <div className="w-8 h-8 rounded bg-emerald-600 flex items-center justify-center text-foreground font-bold font-mono text-sm shadow-[0_0_15px_rgba(16,185,129,0.4)] group-hover:bg-emerald-500 transition-colors">
              {platformName.substring(0, 2).toUpperCase()}
            </div>
          )}
          <span className="font-bold text-lg tracking-tight text-foreground group-hover:text-emerald-400 transition-colors font-mono">
            {platformName}_
          </span>
        </Link>

        {/* Desktop Menu - Minimal */}
        <div className="hidden md:flex items-center gap-8 text-xs font-mono font-medium text-muted-foreground uppercase tracking-widest">
          <a href="#features" className="hover:text-foreground transition-colors">Возможности</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Тарифы</a>
          <a href="#" className="hover:text-foreground transition-colors">API Документация</a>
        </div>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted">
                <Globe className="h-3 w-3 mr-2" />
                {i18n.language.toUpperCase()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border text-foreground">
              <DropdownMenuItem onClick={() => changeLanguage('ru')} className="hover:bg-muted hover:text-foreground cursor-pointer font-mono text-xs">RUSSIAN</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('en')} className="hover:bg-muted hover:text-foreground cursor-pointer font-mono text-xs">ENGLISH</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ThemeToggle />

          <div className="h-4 w-px bg-border" />

          <Link href="/login">
            <Button variant="ghost" size="sm" className="h-8 text-xs font-mono text-foreground hover:bg-muted">
              ВОЙТИ
            </Button>
          </Link>
          
          <Link href="/register/advertiser">
            <Button size="sm" className="h-8 bg-white text-black hover:bg-muted text-xs font-bold font-mono px-4 rounded-sm">
               НАЧАТЬ <ArrowRight className="w-3 h-3 ml-2" />
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden flex items-center gap-4">
           <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-foreground">
             {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
           </Button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b border-border p-4 shadow-xl flex flex-col gap-4">
          <a href="#features" className="text-sm font-mono text-muted-foreground py-2">Возможности</a>
          <a href="#pricing" className="text-sm font-mono text-muted-foreground py-2">Тарифы</a>
          <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-foreground font-mono">ВОЙТИ В СИСТЕМУ</Button>
        </div>
      )}
    </nav>
  );
}
