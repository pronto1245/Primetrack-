import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Globe, Menu, X, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { t, i18n } = useTranslation();
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        ? 'bg-[#09090b]/90 backdrop-blur-md border-white/5 py-3' 
        : 'bg-[#09090b] border-transparent py-4'
    }`}>
      <div className="container mx-auto px-4 flex items-center justify-between">
        
        {/* Brand - Tech/Terminal Style */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded bg-emerald-600 flex items-center justify-center text-white font-bold font-mono text-sm shadow-[0_0_15px_rgba(16,185,129,0.4)] group-hover:bg-emerald-500 transition-colors">
            PT
          </div>
          <span className="font-bold text-lg tracking-tight text-white group-hover:text-emerald-400 transition-colors font-mono">
            PrimeTrack_
          </span>
        </Link>

        {/* Desktop Menu - Minimal */}
        <div className="hidden md:flex items-center gap-8 text-xs font-mono font-medium text-slate-400 uppercase tracking-widest">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="#" className="hover:text-white transition-colors">API Docs</a>
        </div>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 text-xs font-mono text-slate-400 hover:text-white hover:bg-white/5">
                <Globe className="h-3 w-3 mr-2" />
                {i18n.language.toUpperCase()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#111] border-white/10 text-slate-300">
              <DropdownMenuItem onClick={() => changeLanguage('ru')} className="hover:bg-white/10 hover:text-white cursor-pointer font-mono text-xs">RUSSIAN</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('en')} className="hover:bg-white/10 hover:text-white cursor-pointer font-mono text-xs">ENGLISH</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-4 w-px bg-white/10" />

          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="h-8 text-xs font-mono text-white hover:bg-white/10">
              LOG_IN
            </Button>
          </Link>
          
          <Button size="sm" className="h-8 bg-white text-black hover:bg-slate-200 text-xs font-bold font-mono px-4 rounded-sm">
             GET_STARTED <ArrowRight className="w-3 h-3 ml-2" />
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden flex items-center gap-4">
           <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-white">
             {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
           </Button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#09090b] border-b border-white/10 p-4 shadow-xl flex flex-col gap-4">
          <a href="#features" className="text-sm font-mono text-slate-300 py-2">Features</a>
          <a href="#pricing" className="text-sm font-mono text-slate-300 py-2">Pricing</a>
          <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-mono">ACCESS PORTAL</Button>
        </div>
      )}
    </nav>
  );
}
