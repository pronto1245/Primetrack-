import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Globe, Menu, X } from "lucide-react";
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
        ? 'bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-border py-4' 
        : 'bg-white dark:bg-slate-950 border-transparent py-5'
    }`}>
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        
        {/* Brand */}
        <Link href="/">
          <a className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              P
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">
              {t('brand')}
            </span>
          </a>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
          <a href="#features" className="hover:text-blue-600 transition-colors">{t('nav.features')}</a>
          <a href="#pricing" className="hover:text-blue-600 transition-colors">{t('nav.pricing')}</a>
          <a href="#" className="hover:text-blue-600 transition-colors">{t('nav.integrations')}</a>
        </div>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-9 h-9 text-slate-500">
                <Globe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => changeLanguage('ru')}>Русский</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('en')}>English</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/dashboard">
            <Button variant="ghost" className="font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100">
              {t('nav.login')}
            </Button>
          </Link>
          
          <Button className="font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
             {t('nav.getStarted')}
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden flex items-center gap-4">
           <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
             {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
           </Button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-slate-950 border-b border-border p-4 shadow-xl flex flex-col gap-4">
          <a href="#features" className="text-sm font-medium px-2 py-2 hover:bg-slate-50 rounded-md">{t('nav.features')}</a>
          <a href="#pricing" className="text-sm font-medium px-2 py-2 hover:bg-slate-50 rounded-md">{t('nav.pricing')}</a>
          <div className="h-px bg-border my-1" />
          <Button className="w-full bg-blue-600">{t('nav.getStarted')}</Button>
        </div>
      )}
    </nav>
  );
}
