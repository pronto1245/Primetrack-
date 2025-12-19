import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { useEffect, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { t, i18n } = useTranslation();
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-4' : 'py-6'}`}>
      <div className="container mx-auto px-4 md:px-6">
        <div className={`mx-auto flex items-center justify-between rounded-full border px-6 h-14 transition-all duration-300 ${
          scrolled 
            ? 'bg-white/5 border-white/10 backdrop-blur-xl shadow-lg max-w-5xl' 
            : 'bg-transparent border-transparent max-w-7xl'
        }`}>
          <Link href="/">
            <a className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black font-bold text-sm font-display group-hover:scale-110 transition-transform duration-300">
                O
              </div>
              <span className="font-display font-bold text-lg tracking-tight hidden sm:block">Orchestrator</span>
            </a>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">{t('nav.features')}</a>
            <a href="#roles" className="hover:text-foreground transition-colors">{t('nav.solutions')}</a>
            <a href="#" className="hover:text-foreground transition-colors">{t('nav.developers')}</a>
          </div>

          <div className="flex items-center gap-2">
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-white/10">
                  <Globe className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#0A0A0A] border-white/10 text-white">
                <DropdownMenuItem onClick={() => changeLanguage('en')} className="hover:bg-white/10 cursor-pointer">English</DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeLanguage('ru')} className="hover:bg-white/10 cursor-pointer">Русский</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {location === "/" ? (
              <Link href="/dashboard">
                <Button size="sm" className="rounded-full px-6 font-medium bg-white text-black hover:bg-white/90 transition-colors">
                  {t('nav.login')}
                </Button>
              </Link>
            ) : (
              <Link href="/">
                 <Button size="sm" variant="ghost" className="rounded-full px-4 hover:bg-white/10">
                  {t('nav.exit')}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
