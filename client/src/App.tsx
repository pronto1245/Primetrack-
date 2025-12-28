import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
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
import "./lib/i18n";

// Wrapper that shows PublisherRegister if ref query param exists
function RegisterWrapper() {
  const ref = new URLSearchParams(window.location.search).get("ref");
  if (ref) {
    return <PublisherRegister />;
  }
  return <Register />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/setup-2fa" component={Setup2FA} />
      <Route path="/register" component={RegisterWrapper} />
      <Route path="/register/advertiser" component={AdvertiserRegister} />
      <Route path="/register/:ref" component={PublisherRegister} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/:role" component={Dashboard} />
      <Route path="/dashboard/:role/*" component={Dashboard} />
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
