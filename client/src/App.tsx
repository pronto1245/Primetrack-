import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Register from "@/pages/Register";
import Login from "@/pages/Login";
import AdvertiserRegister from "@/pages/AdvertiserRegister";
import PublisherRegister from "@/pages/PublisherRegister";
import Setup2FA from "@/pages/Setup2FA";
import NotificationsPage from "@/pages/NotificationsPage";
import Pricing from "@/pages/Pricing";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import "./lib/i18n";

function DashboardGuard() {
  const { data: session, isLoading } = useQuery({
    queryKey: ["/api/auth/session"],
    queryFn: async () => {
      const res = await fetch("/api/auth/session", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!session?.role) {
    return <Redirect to="/login" />;
  }

  return <Redirect to={`/dashboard/${session.role}`} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/setup-2fa" component={Setup2FA} />
      <Route path="/register" component={Register} />
      <Route path="/register/advertiser" component={AdvertiserRegister} />
      <Route path="/register/:ref" component={PublisherRegister} />
      <Route path="/dashboard" component={DashboardGuard} />
      <Route path="/dashboard/:role" component={Dashboard} />
      <Route path="/dashboard/:role/*" component={Dashboard} />
      <Route path="/notifications" component={NotificationsPage} />
      <Route path="/pricing" component={Pricing} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
