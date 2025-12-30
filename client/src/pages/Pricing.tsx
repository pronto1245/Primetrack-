import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Check, X, Zap, Shield, Users, Globe, Code, Bell, Webhook, Building } from "lucide-react";

type SubscriptionPlan = {
  id: string;
  name: string;
  monthlyPrice: string;
  yearlyPrice: string;
  maxPartners: number | null;
  maxOffers: number | null;
  hasAntifraud: boolean;
  hasNews: boolean;
  hasPostbacks: boolean;
  hasTeam: boolean;
  hasWebhooks: boolean;
  hasCustomDomain: boolean;
  hasApiAccess: boolean;
};

const featureIcons: Record<string, React.ReactNode> = {
  antifraud: <Shield className="w-4 h-4" />,
  news: <Bell className="w-4 h-4" />,
  postbacks: <Zap className="w-4 h-4" />,
  team: <Users className="w-4 h-4" />,
  webhooks: <Webhook className="w-4 h-4" />,
  customDomain: <Globe className="w-4 h-4" />,
  apiAccess: <Code className="w-4 h-4" />,
};

const featureLabels: Record<string, string> = {
  antifraud: "Антифрод защита",
  news: "Новости и уведомления",
  postbacks: "Постбеки",
  team: "Команда (стаффы)",
  webhooks: "Webhooks",
  customDomain: "Кастомный домен",
  apiAccess: "API доступ",
};

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false);
  const [, navigate] = useLocation();

  const { data: plans = [], isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription/plans"],
  });

  const getPrice = (plan: SubscriptionPlan) => {
    if (isYearly) {
      const yearlyTotal = parseFloat(plan.yearlyPrice);
      const monthlyEquiv = yearlyTotal / 12;
      return monthlyEquiv.toFixed(0);
    }
    return parseFloat(plan.monthlyPrice).toFixed(0);
  };

  const getYearlyTotal = (plan: SubscriptionPlan) => {
    return parseFloat(plan.yearlyPrice).toFixed(0);
  };

  const getMonthlyTotal = (plan: SubscriptionPlan) => {
    return (parseFloat(plan.monthlyPrice) * 12).toFixed(0);
  };

  const getSavings = (plan: SubscriptionPlan) => {
    const monthlyTotal = parseFloat(plan.monthlyPrice) * 12;
    const yearlyTotal = parseFloat(plan.yearlyPrice);
    return (monthlyTotal - yearlyTotal).toFixed(0);
  };

  const getFeatures = (plan: SubscriptionPlan) => {
    return [
      { key: "partners", value: plan.maxPartners ? `До ${plan.maxPartners} партнёров` : "Безлимит партнёров", included: true },
      { key: "offers", value: "Безлимит офферов", included: true },
      { key: "postbacks", value: featureLabels.postbacks, included: plan.hasPostbacks },
      { key: "antifraud", value: featureLabels.antifraud, included: plan.hasAntifraud },
      { key: "news", value: featureLabels.news, included: plan.hasNews },
      { key: "team", value: featureLabels.team, included: plan.hasTeam },
      { key: "webhooks", value: featureLabels.webhooks, included: plan.hasWebhooks },
      { key: "customDomain", value: featureLabels.customDomain, included: plan.hasCustomDomain },
      { key: "apiAccess", value: featureLabels.apiAccess, included: plan.hasApiAccess },
    ];
  };

  const getPlanStyle = (index: number) => {
    if (index === 1) {
      return "border-primary shadow-lg scale-105 relative z-10";
    }
    return "border-border";
  };

  const handleSelectPlan = (planId: string) => {
    navigate(`/register?plan=${planId}&billing=${isYearly ? 'yearly' : 'monthly'}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            30 дней бесплатно
          </Badge>
          <h1 className="text-4xl font-bold mb-4" data-testid="text-pricing-title">
            Выберите план для вашего бизнеса
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Начните бесплатный 30-дневный пробный период. Никаких обязательств, отменить можно в любой момент.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm font-medium ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
            Ежемесячно
          </span>
          <Switch
            checked={isYearly}
            onCheckedChange={setIsYearly}
            data-testid="switch-billing-cycle"
          />
          <span className={`text-sm font-medium ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
            Ежегодно
          </span>
          {isYearly && (
            <Badge variant="default" className="bg-green-600 hover:bg-green-600">
              -15%
            </Badge>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {plans.map((plan, index) => (
            <Card 
              key={plan.id} 
              className={`relative transition-all duration-300 ${getPlanStyle(index)}`}
              data-testid={`card-plan-${plan.name.toLowerCase()}`}
            >
              {index === 1 && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    Популярный
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>
                  {index === 0 && "Для начинающих рекламодателей"}
                  {index === 1 && "Для растущего бизнеса"}
                  {index === 2 && "Для крупных компаний"}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="text-center">
                <div className="mb-6">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">${getPrice(plan)}</span>
                    <span className="text-muted-foreground">/мес</span>
                  </div>
                  {isYearly && (
                    <p className="text-sm text-green-600 mt-1">
                      ${getYearlyTotal(plan)}/год (экономия ${getSavings(plan)})
                    </p>
                  )}
                  {!isYearly && (
                    <p className="text-sm text-muted-foreground mt-1">
                      ${getMonthlyTotal(plan)}/год
                    </p>
                  )}
                </div>

                <ul className="space-y-3 text-left">
                  {getFeatures(plan).map((feature) => (
                    <li 
                      key={feature.key} 
                      className={`flex items-center gap-3 ${!feature.included ? 'text-muted-foreground' : ''}`}
                    >
                      {feature.included ? (
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <X className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
                      )}
                      <span className="text-sm">{feature.value}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant={index === 1 ? "default" : "outline"}
                  size="lg"
                  onClick={() => handleSelectPlan(plan.id)}
                  data-testid={`button-select-${plan.name.toLowerCase()}`}
                >
                  Начать бесплатно
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <h3 className="text-lg font-semibold mb-2">Нужны индивидуальные условия?</h3>
          <p className="text-muted-foreground mb-4">
            Свяжитесь с нами для обсуждения специальных условий для вашего бизнеса
          </p>
          <Button variant="outline" data-testid="button-contact-sales">
            <Building className="w-4 h-4 mr-2" />
            Связаться с нами
          </Button>
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>Все планы включают:</p>
          <div className="flex flex-wrap justify-center gap-4 mt-2">
            <span>✓ Мини-трекер</span>
            <span>✓ Конверсии</span>
            <span>✓ Базовые отчёты</span>
            <span>✓ Email поддержка</span>
          </div>
        </div>
      </div>
    </div>
  );
}
