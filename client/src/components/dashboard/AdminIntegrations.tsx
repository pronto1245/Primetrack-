import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Key, Webhook, Copy, Eye, EyeOff, Play, Ban, RefreshCw, ExternalLink } from "lucide-react";

const PERMISSIONS = [
  { value: "offers:read", label: "Offers (Read)" },
  { value: "offers:write", label: "Offers (Write)" },
  { value: "partners:read", label: "Partners (Read)" },
  { value: "partners:write", label: "Partners (Write)" },
  { value: "clicks:read", label: "Clicks (Read)" },
  { value: "conversions:read", label: "Conversions (Read)" },
  { value: "conversions:write", label: "Conversions (Write)" },
  { value: "payouts:read", label: "Payouts (Read)" },
  { value: "payouts:write", label: "Payouts (Write)" },
];

const WEBHOOK_EVENTS = [
  { value: "conversion.created", label: "Conversion Created" },
  { value: "conversion.approved", label: "Conversion Approved" },
  { value: "conversion.rejected", label: "Conversion Rejected" },
  { value: "payout.requested", label: "Payout Requested" },
  { value: "payout.approved", label: "Payout Approved" },
  { value: "payout.completed", label: "Payout Completed" },
  { value: "partner.registered", label: "Partner Registered" },
  { value: "partner.activated", label: "Partner Activated" },
  { value: "offer.created", label: "Offer Created" },
  { value: "offer.updated", label: "Offer Updated" },
];

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  expiresAt: string | null;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
  apiKey?: string;
}

interface PlatformWebhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  method: string;
  isActive: boolean;
  lastTriggeredAt: string | null;
  failedAttempts: number;
  lastError: string | null;
  createdAt: string;
}

export default function AdminIntegrations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("api-keys");
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [showNewWebhookDialog, setShowNewWebhookDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>([]);
  const [newKeyExpiry, setNewKeyExpiry] = useState("never");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [newWebhookName, setNewWebhookName] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>([]);
  const [newWebhookSecret, setNewWebhookSecret] = useState("");

  const { data: apiKeys = [], isLoading: keysLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/admin/platform-api-keys"],
  });

  const { data: webhooks = [], isLoading: webhooksLoading } = useQuery<PlatformWebhook[]>({
    queryKey: ["/api/admin/platform-webhooks"],
  });

  const createKeyMutation = useMutation({
    mutationFn: async (data: { name: string; permissions: string[]; expiresInDays: number | null }) => {
      const res = await fetch("/api/admin/platform-api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create API key");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-api-keys"] });
      setCreatedKey(data.apiKey);
      setNewKeyName("");
      setNewKeyPermissions([]);
      setNewKeyExpiry("never");
      toast({ title: "API key created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create API key", variant: "destructive" });
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/platform-api-keys/${id}/revoke`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to revoke API key");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-api-keys"] });
      toast({ title: "API key revoked" });
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/platform-api-keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete API key");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-api-keys"] });
      toast({ title: "API key deleted" });
    },
  });

  const createWebhookMutation = useMutation({
    mutationFn: async (data: { name: string; url: string; events: string[]; secret?: string }) => {
      const res = await fetch("/api/admin/platform-webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create webhook");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-webhooks"] });
      setShowNewWebhookDialog(false);
      setNewWebhookName("");
      setNewWebhookUrl("");
      setNewWebhookEvents([]);
      setNewWebhookSecret("");
      toast({ title: "Webhook created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create webhook", variant: "destructive" });
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/platform-webhooks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete webhook");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-webhooks"] });
      toast({ title: "Webhook deleted" });
    },
  });

  const testWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/platform-webhooks/${id}/test`, { method: "POST" });
      if (!res.ok) throw new Error("Test failed");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Webhook test successful", description: `Status: ${data.statusCode}` });
      } else {
        toast({ title: "Webhook test failed", description: `Status: ${data.statusCode}`, variant: "destructive" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-webhooks"] });
    },
    onError: () => {
      toast({ title: "Webhook test failed", variant: "destructive" });
    },
  });

  const toggleWebhookMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/admin/platform-webhooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed to update webhook");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-webhooks"] });
    },
  });

  const handleCreateKey = () => {
    const expiresInDays = newKeyExpiry === "never" ? null : parseInt(newKeyExpiry);
    createKeyMutation.mutate({ name: newKeyName, permissions: newKeyPermissions, expiresInDays });
  };

  const handleCreateWebhook = () => {
    createWebhookMutation.mutate({
      name: newWebhookName,
      url: newWebhookUrl,
      events: newWebhookEvents,
      secret: newWebhookSecret || undefined,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">API & Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Manage API keys for external integrations (n8n, Zapier, custom scripts)
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="api-keys" data-testid="tab-api-keys">
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks" data-testid="tab-webhooks">
            <Webhook className="h-4 w-4 mr-2" />
            Platform Webhooks
          </TabsTrigger>
          <TabsTrigger value="docs" data-testid="tab-docs">
            <ExternalLink className="h-4 w-4 mr-2" />
            Documentation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>Keys for X-API-Key authentication to /api/v1/* endpoints</CardDescription>
              </div>
              <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
                <DialogTrigger asChild>
                  <Button data-testid="btn-create-api-key">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Key
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create API Key</DialogTitle>
                    <DialogDescription>Generate a new API key for external integrations</DialogDescription>
                  </DialogHeader>
                  {createdKey ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800 font-medium mb-2">API Key Created!</p>
                        <p className="text-xs text-green-600 mb-2">Copy this key now - it won't be shown again</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs bg-white p-2 rounded border break-all">{createdKey}</code>
                          <Button size="sm" variant="outline" onClick={() => copyToClipboard(createdKey)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => {
                          setCreatedKey(null);
                          setShowNewKeyDialog(false);
                        }}
                        data-testid="btn-close-key-dialog"
                      >
                        Done
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          placeholder="e.g., n8n Production"
                          data-testid="input-key-name"
                        />
                      </div>
                      <div>
                        <Label>Permissions</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {PERMISSIONS.map((perm) => (
                            <div key={perm.value} className="flex items-center gap-2">
                              <Checkbox
                                id={perm.value}
                                checked={newKeyPermissions.includes(perm.value)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setNewKeyPermissions([...newKeyPermissions, perm.value]);
                                  } else {
                                    setNewKeyPermissions(newKeyPermissions.filter((p) => p !== perm.value));
                                  }
                                }}
                                data-testid={`checkbox-${perm.value}`}
                              />
                              <label htmlFor={perm.value} className="text-sm">{perm.label}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label>Expiration</Label>
                        <Select value={newKeyExpiry} onValueChange={setNewKeyExpiry}>
                          <SelectTrigger data-testid="select-expiry">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="never">Never expires</SelectItem>
                            <SelectItem value="7">7 days</SelectItem>
                            <SelectItem value="30">30 days</SelectItem>
                            <SelectItem value="90">90 days</SelectItem>
                            <SelectItem value="365">1 year</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        className="w-full"
                        onClick={handleCreateKey}
                        disabled={!newKeyName || newKeyPermissions.length === 0}
                        data-testid="btn-submit-key"
                      >
                        Create Key
                      </Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {keysLoading ? (
                <p>Loading...</p>
              ) : apiKeys.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No API keys created yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key Prefix</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((key) => (
                      <TableRow key={key.id} data-testid={`row-key-${key.id}`}>
                        <TableCell className="font-medium">{key.name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{key.keyPrefix}...</code>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {key.permissions.slice(0, 3).map((p) => (
                              <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                            ))}
                            {key.permissions.length > 3 && (
                              <Badge variant="outline" className="text-xs">+{key.permissions.length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {key.revokedAt ? (
                            <Badge variant="destructive">Revoked</Badge>
                          ) : key.isActive ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Never"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : "Never"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {key.isActive && !key.revokedAt && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => revokeKeyMutation.mutate(key.id)}
                                data-testid={`btn-revoke-${key.id}`}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteKeyMutation.mutate(key.id)}
                              data-testid={`btn-delete-key-${key.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Platform Webhooks</CardTitle>
                <CardDescription>Send events to external services (n8n, Zapier, custom endpoints)</CardDescription>
              </div>
              <Dialog open={showNewWebhookDialog} onOpenChange={setShowNewWebhookDialog}>
                <DialogTrigger asChild>
                  <Button data-testid="btn-create-webhook">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Webhook
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Webhook</DialogTitle>
                    <DialogDescription>Configure a new webhook endpoint</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={newWebhookName}
                        onChange={(e) => setNewWebhookName(e.target.value)}
                        placeholder="e.g., n8n Conversions"
                        data-testid="input-webhook-name"
                      />
                    </div>
                    <div>
                      <Label>URL</Label>
                      <Input
                        value={newWebhookUrl}
                        onChange={(e) => setNewWebhookUrl(e.target.value)}
                        placeholder="https://..."
                        data-testid="input-webhook-url"
                      />
                    </div>
                    <div>
                      <Label>Events</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
                        {WEBHOOK_EVENTS.map((event) => (
                          <div key={event.value} className="flex items-center gap-2">
                            <Checkbox
                              id={event.value}
                              checked={newWebhookEvents.includes(event.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setNewWebhookEvents([...newWebhookEvents, event.value]);
                                } else {
                                  setNewWebhookEvents(newWebhookEvents.filter((e) => e !== event.value));
                                }
                              }}
                              data-testid={`checkbox-event-${event.value}`}
                            />
                            <label htmlFor={event.value} className="text-sm">{event.label}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Secret (optional)</Label>
                      <Input
                        value={newWebhookSecret}
                        onChange={(e) => setNewWebhookSecret(e.target.value)}
                        placeholder="HMAC signing secret"
                        type="password"
                        data-testid="input-webhook-secret"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Used for X-Webhook-Signature header</p>
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleCreateWebhook}
                      disabled={!newWebhookName || !newWebhookUrl || newWebhookEvents.length === 0}
                      data-testid="btn-submit-webhook"
                    >
                      Create Webhook
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {webhooksLoading ? (
                <p>Loading...</p>
              ) : webhooks.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No webhooks configured yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Events</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Triggered</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooks.map((webhook) => (
                      <TableRow key={webhook.id} data-testid={`row-webhook-${webhook.id}`}>
                        <TableCell className="font-medium">{webhook.name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[200px] block">
                            {webhook.url}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {webhook.events.slice(0, 2).map((e) => (
                              <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>
                            ))}
                            {webhook.events.length > 2 && (
                              <Badge variant="outline" className="text-xs">+{webhook.events.length - 2}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={webhook.isActive}
                              onCheckedChange={(checked) => toggleWebhookMutation.mutate({ id: webhook.id, isActive: checked })}
                              data-testid={`switch-webhook-${webhook.id}`}
                            />
                            {webhook.failedAttempts > 0 && (
                              <Badge variant="destructive" className="text-xs">{webhook.failedAttempts} fails</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {webhook.lastTriggeredAt ? new Date(webhook.lastTriggeredAt).toLocaleDateString() : "Never"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => testWebhookMutation.mutate(webhook.id)}
                              disabled={testWebhookMutation.isPending}
                              data-testid={`btn-test-${webhook.id}`}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                              data-testid={`btn-delete-webhook-${webhook.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>API Documentation</CardTitle>
              <CardDescription>How to use the Platform API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Authentication</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  All API requests require an API key in the X-API-Key header:
                </p>
                <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`curl -H "X-API-Key: pt_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxx" \\
     https://your-domain.com/api/v1/offers`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Available Endpoints</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2">
                    <Badge variant="outline">GET</Badge>
                    <code>/api/v1/offers</code>
                    <span className="text-muted-foreground">- List all offers</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">GET</Badge>
                    <code>/api/v1/offers/:id</code>
                    <span className="text-muted-foreground">- Get offer details</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">GET</Badge>
                    <code>/api/v1/partners</code>
                    <span className="text-muted-foreground">- List all partners</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">GET</Badge>
                    <code>/api/v1/partners/:id</code>
                    <span className="text-muted-foreground">- Get partner details</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">GET</Badge>
                    <code>/api/v1/clicks</code>
                    <span className="text-muted-foreground">- List clicks</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">GET</Badge>
                    <code>/api/v1/conversions</code>
                    <span className="text-muted-foreground">- List conversions</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">POST</Badge>
                    <code>/api/v1/conversions</code>
                    <span className="text-muted-foreground">- Create conversion</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">GET</Badge>
                    <code>/api/v1/payouts</code>
                    <span className="text-muted-foreground">- List payout requests</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">PATCH</Badge>
                    <code>/api/v1/payouts/:id</code>
                    <span className="text-muted-foreground">- Update payout status</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">GET</Badge>
                    <code>/api/v1/stats</code>
                    <span className="text-muted-foreground">- Platform statistics</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">n8n Integration</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  To integrate with n8n, create an HTTP Request node with:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Authentication: Header Auth</li>
                  <li>Header Name: X-API-Key</li>
                  <li>Header Value: Your API key</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Webhook Payloads</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Webhooks send JSON payloads with the following structure:
                </p>
                <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "event": "conversion.created",
  "timestamp": "2024-01-16T12:00:00.000Z",
  "data": {
    "conversionId": "...",
    "clickId": "...",
    "offerId": "...",
    "publisherId": "...",
    "conversionType": "lead",
    "status": "pending",
    "publisherPayout": 50,
    "advertiserCost": 60
  }
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
