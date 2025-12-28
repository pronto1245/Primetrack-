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
import SetupAdmin from "@/pages/SetupAdmin";
import "./lib/i18n";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/setup-admin" component={SetupAdmin} />
      <Route path="/register" component={Register} />
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
