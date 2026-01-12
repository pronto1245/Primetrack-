import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2, Copy, Pencil, ExternalLink, Loader2, GitBranch, Percent } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { toast } from "sonner";

interface SplitTestItem {
  id: string;
  splitTestId: string;
  offerId: string;
  landingId: string | null;
  weight: number;
  offerName: string;
  landingName: string | null;
}

interface SplitTest {
  id: string;
  publisherId: string;
  name: string;
  description: string | null;
  shortCode: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  items: SplitTestItem[];
  itemCount: number;
}

interface OfferWithLandings {
  id: string;
  name: string;
  landings: { id: string; name: string | null; geo: string }[];
}

interface ItemFormData {
  offerId: string;
  landingId: string | null;
  weight: number;
}

export function PublisherSplitTests({ role }: { role: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<SplitTest | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formItems, setFormItems] = useState<ItemFormData[]>([
    { offerId: "", landingId: null, weight: 50 },
    { offerId: "", landingId: null, weight: 50 },
  ]);

  const { data: splitTests, isLoading } = useQuery<SplitTest[]>({
    queryKey: ["/api/publisher/split-tests"],
    queryFn: async () => {
      const res = await fetch("/api/publisher/split-tests", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch split tests");
      return res.json();
    },
  });

  const { data: approvedOffers } = useQuery<OfferWithLandings[]>({
    queryKey: ["/api/publisher/offers-approved"],
    queryFn: async () => {
      const res = await fetch("/api/publisher/offers-approved", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; items: ItemFormData[] }) => {
      const res = await fetch("/api/publisher/split-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create split test");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/publisher/split-tests"] });
      closeModal();
      toast.success(t("splitTests.created"));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; description: string; items: ItemFormData[]; status: string }) => {
      const res = await fetch(`/api/publisher/split-tests/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update split test");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/publisher/split-tests"] });
      closeModal();
      toast.success(t("splitTests.updated"));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/publisher/split-tests/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete split test");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/publisher/split-tests"] });
      toast.success(t("splitTests.deleted"));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const openCreateModal = () => {
    setEditingTest(null);
    setFormName("");
    setFormDescription("");
    setFormItems([
      { offerId: "", landingId: null, weight: 50 },
      { offerId: "", landingId: null, weight: 50 },
    ]);
    setIsModalOpen(true);
  };

  const openEditModal = (test: SplitTest) => {
    setEditingTest(test);
    setFormName(test.name);
    setFormDescription(test.description || "");
    setFormItems(test.items.map(item => ({
      offerId: item.offerId,
      landingId: item.landingId,
      weight: item.weight,
    })));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTest(null);
  };

  const handleSubmit = () => {
    if (!formName.trim()) {
      toast.error(t("splitTests.nameRequired"));
      return;
    }
    if (formItems.length < 2) {
      toast.error(t("splitTests.minItemsRequired"));
      return;
    }
    if (formItems.some(item => !item.offerId)) {
      toast.error(t("splitTests.selectAllOffers"));
      return;
    }
    const totalWeight = formItems.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight !== 100) {
      toast.error(t("splitTests.weightsMustEqual100", { total: totalWeight }));
      return;
    }

    if (editingTest) {
      updateMutation.mutate({
        id: editingTest.id,
        name: formName,
        description: formDescription,
        items: formItems,
        status: editingTest.status,
      });
    } else {
      createMutation.mutate({
        name: formName,
        description: formDescription,
        items: formItems,
      });
    }
  };

  const addItem = () => {
    const newWeight = Math.floor(100 / (formItems.length + 1));
    const remaining = 100 - (newWeight * (formItems.length + 1));
    setFormItems([
      ...formItems.map((item, i) => ({ ...item, weight: newWeight + (i === 0 ? remaining : 0) })),
      { offerId: "", landingId: null, weight: newWeight },
    ]);
  };

  const removeItem = (index: number) => {
    if (formItems.length <= 2) return;
    const newItems = formItems.filter((_, i) => i !== index);
    const totalWeight = newItems.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight !== 100) {
      const diff = 100 - totalWeight;
      newItems[0].weight += diff;
    }
    setFormItems(newItems);
  };

  const updateItemWeight = (index: number, weight: number) => {
    const newItems = [...formItems];
    newItems[index].weight = weight;
    setFormItems(newItems);
  };

  const updateItemOffer = (index: number, offerId: string) => {
    const newItems = [...formItems];
    newItems[index].offerId = offerId;
    newItems[index].landingId = null;
    setFormItems(newItems);
  };

  const updateItemLanding = (index: number, landingId: string | null) => {
    const newItems = [...formItems];
    newItems[index].landingId = landingId;
    setFormItems(newItems);
  };

  const copyTrackingLink = (shortCode: string) => {
    const link = `${window.location.origin}/t/s/${shortCode}`;
    navigator.clipboard.writeText(link);
    toast.success(t("splitTests.linkCopied"));
  };

  const toggleStatus = (test: SplitTest) => {
    const newStatus = test.status === 'active' ? 'paused' : 'active';
    updateMutation.mutate({
      id: test.id,
      name: test.name,
      description: test.description || "",
      items: test.items.map(item => ({
        offerId: item.offerId,
        landingId: item.landingId,
        weight: item.weight,
      })),
      status: newStatus,
    });
  };

  const totalWeight = formItems.reduce((sum, item) => sum + item.weight, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold" data-testid="text-split-tests-title">{t("splitTests.title")}</h2>
          <p className="text-muted-foreground">{t("splitTests.description")}</p>
        </div>
        <Button onClick={openCreateModal} data-testid="button-create-split-test">
          <Plus className="h-4 w-4 mr-2" />
          {t("splitTests.create")}
        </Button>
      </div>

      {splitTests && splitTests.length === 0 ? (
        <Card className="p-8 text-center">
          <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">{t("splitTests.noTests")}</h3>
          <p className="text-muted-foreground mb-4">{t("splitTests.noTestsDescription")}</p>
          <Button onClick={openCreateModal} data-testid="button-create-first-split-test">
            <Plus className="h-4 w-4 mr-2" />
            {t("splitTests.createFirst")}
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {splitTests?.map((test) => (
            <Card key={test.id} className="p-4" data-testid={`card-split-test-${test.id}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{test.name}</h3>
                    <Badge variant={test.status === 'active' ? 'default' : 'secondary'}>
                      {test.status}
                    </Badge>
                  </div>
                  {test.description && (
                    <p className="text-muted-foreground text-sm mb-3">{test.description}</p>
                  )}
                  <div className="space-y-2 mb-4">
                    {test.items.map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <Percent className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{item.weight}%</span>
                        <span className="text-muted-foreground">→</span>
                        <span>{item.offerName}</span>
                        {item.landingName && (
                          <span className="text-muted-foreground">({item.landingName})</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <code className="bg-muted px-2 py-1 rounded">/t/s/{test.shortCode}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyTrackingLink(test.shortCode)}
                      data-testid={`button-copy-link-${test.id}`}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={test.status === 'active'}
                    onCheckedChange={() => toggleStatus(test)}
                    data-testid={`switch-status-${test.id}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditModal(test)}
                    data-testid={`button-edit-${test.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(test.id)}
                    data-testid={`button-delete-${test.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTest ? t("splitTests.edit") : t("splitTests.create")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("splitTests.name")}</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("splitTests.namePlaceholder")}
                data-testid="input-split-test-name"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("splitTests.descriptionLabel")}</Label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={t("splitTests.descriptionPlaceholder")}
                data-testid="input-split-test-description"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("splitTests.items")}</Label>
                <span className={`text-sm ${totalWeight === 100 ? 'text-green-500' : 'text-destructive'}`}>
                  {t("splitTests.totalWeight")}: {totalWeight}%
                </span>
              </div>

              <div className="space-y-3">
                {formItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 border rounded-lg" data-testid={`item-row-${index}`}>
                    <div className="flex-1">
                      <Select
                        value={item.offerId}
                        onValueChange={(val) => updateItemOffer(index, val)}
                      >
                        <SelectTrigger data-testid={`select-offer-${index}`}>
                          <SelectValue placeholder={t("splitTests.selectOffer")} />
                        </SelectTrigger>
                        <SelectContent>
                          {approvedOffers?.map((offer) => (
                            <SelectItem key={offer.id} value={offer.id}>
                              {offer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Select
                        value={item.landingId || "default"}
                        onValueChange={(val) => updateItemLanding(index, val === "default" ? null : val)}
                        disabled={!item.offerId}
                      >
                        <SelectTrigger data-testid={`select-landing-${index}`}>
                          <SelectValue placeholder={t("splitTests.defaultLanding")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">{t("splitTests.defaultLanding")}</SelectItem>
                          {approvedOffers
                            ?.find(o => o.id === item.offerId)
                            ?.landings?.map((landing) => (
                              <SelectItem key={landing.id} value={landing.id}>
                                {landing.name || landing.geo}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24 flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={99}
                        value={item.weight}
                        onChange={(e) => updateItemWeight(index, parseInt(e.target.value) || 0)}
                        className="text-center"
                        data-testid={`input-weight-${index}`}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={formItems.length <= 2}
                      data-testid={`button-remove-item-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={addItem}
                className="w-full"
                data-testid="button-add-item"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("splitTests.addItem")}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal} data-testid="button-cancel">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-split-test"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingTest ? t("common.save") : t("splitTests.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
