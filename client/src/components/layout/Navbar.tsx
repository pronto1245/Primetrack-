import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Globe, Moon, Sun, LayoutDashboard } from "lucide-react";
import { useEffect, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { t, i18n } = useTranslation();
  const [location] = useLocation();
  const [theme, setTheme] = useState<"light" | "dark">("dark"); // Default to dark for "cool" vibe

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/">
          <a className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xl group-hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-500">
              O
            </div>
            <span className="font-heading font-bold text-xl tracking-tight">Orchestrator</span>
          </a>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">{t('nav.features')}</a>
          <a href="#roles" className="hover:text-foreground transition-colors">{t('nav.pricing')}</a>
          <a href="#" className="hover:text-foreground transition-colors">{t('nav.docs')}</a>
        </div>

        <div className="flex items-center gap-3">
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-9 h-9">
                <Globe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => changeLanguage('en')}>English</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('ru')}>Русский</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" onClick={toggleTheme} className="w-9 h-9">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {location === "/" ? (
            <Link href="/dashboard">
              <Button variant="default" className="font-semibold shadow-lg shadow-primary/20">
                {t('nav.login')}
              </Button>
            </Link>
          ) : (
            <Link href="/">
              <Button variant="ghost">
                {t('nav.getStarted')}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
