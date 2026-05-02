import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Shield, Key, Users, DollarSign, Settings as SettingsIcon, Save, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface ApiKey {
  id: string;
  provider: string;
  category: string;
  api_key: string | null;
  secret_key: string | null;
  endpoint: string | null;
  enabled: boolean;
  notes: string | null;
}

interface DepositRow {
  id: string;
  user_id: string;
  amount: number;
  payment_method: string;
  status: string;
  reference: string | null;
  created_at: string;
}

interface ProfileRow {
  id: string;
  username: string;
  balance: number;
  currency: string;
}

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <NotAdmin />;

  return (
    <div className="min-h-screen bg-background pb-10">
      <SiteHeader />
      <div className="container max-w-5xl py-5 px-4 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-accent" />
          <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
        </div>

        <Tabs defaultValue="api">
          <TabsList className="bg-surface w-full justify-start overflow-x-auto">
            <TabsTrigger value="api"><Key className="h-4 w-4 mr-1.5" /> API Management</TabsTrigger>
            <TabsTrigger value="deposits"><DollarSign className="h-4 w-4 mr-1.5" /> Deposits</TabsTrigger>
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-1.5" /> Users</TabsTrigger>
            <TabsTrigger value="settings"><SettingsIcon className="h-4 w-4 mr-1.5" /> Site Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="api"><ApiManagement /></TabsContent>
          <TabsContent value="deposits"><DepositsAdmin /></TabsContent>
          <TabsContent value="users"><UsersAdmin /></TabsContent>
          <TabsContent value="settings"><SiteSettingsAdmin /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const NotAdmin = () => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container max-w-md py-10 px-4 text-center space-y-4">
        <Shield className="h-12 w-12 text-accent mx-auto" />
        <h1 className="text-xl font-bold text-foreground">Admin Access Required</h1>
        <p className="text-sm text-muted-foreground">
          Your account ({user?.email}) does not have admin privileges. To grant yourself admin access, an existing admin must add you to the admin role, or you can do it via the database from the backend dashboard.
        </p>
        <div className="bg-surface border border-border rounded-lg p-3 text-xs text-left text-muted-foreground">
          Run this SQL in the backend (replace with your user id):<br/>
          <code className="text-accent">INSERT INTO user_roles (user_id, role) VALUES ('{user?.id}', 'admin');</code>
        </div>
      </div>
    </div>
  );
};

const ApiManagement = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});

  useEffect(() => {
    supabase.from("api_keys").select("*").order("category").then(({ data, error }) => {
      if (error) toast.error(error.message);
      setKeys((data ?? []) as ApiKey[]);
    });
  }, []);

  function update(id: string, patch: Partial<ApiKey>) {
    setKeys((ks) => ks.map((k) => (k.id === id ? { ...k, ...patch } : k)));
  }

  async function save(k: ApiKey) {
    const { error } = await supabase.from("api_keys").update({
      provider: k.provider,
      api_key: k.api_key,
      secret_key: k.secret_key,
      endpoint: k.endpoint,
      enabled: k.enabled,
      notes: k.notes,
      updated_at: new Date().toISOString(),
    }).eq("id", k.id);
    if (error) toast.error(error.message);
    else toast.success(`${k.provider} saved`);
  }

  const grouped: Record<string, ApiKey[]> = {};
  keys.forEach((k) => { (grouped[k.category] ||= []).push(k); });

  const labels: Record<string, string> = {
    sports: "Sports Data API",
    casino: "Casino Game API",
    sms: "SMS Gateway API",
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 mt-4">
      {keys.map((k) => (
        <div key={k.id} className="bg-surface border border-border rounded-xl p-4 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Key className="h-4 w-4 text-accent" /> {labels[k.category] ?? k.category}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{k.enabled ? "Enabled" : "Disabled"}</span>
              <Switch checked={k.enabled} onCheckedChange={(v) => update(k.id, { enabled: v })} />
            </div>
          </div>

          <div>
            <Label>Provider</Label>
            <Input value={k.provider} onChange={(e) => update(k.id, { provider: e.target.value })} className="bg-input" />
          </div>
          <div>
            <Label>API Key</Label>
            <div className="flex gap-2">
              <Input
                type={reveal[k.id] ? "text" : "password"}
                value={k.api_key ?? ""}
                onChange={(e) => update(k.id, { api_key: e.target.value })}
                className="bg-input flex-1"
                placeholder="paste API key"
              />
              <Button variant="secondary" size="icon" onClick={() => setReveal((r) => ({ ...r, [k.id]: !r[k.id] }))}>
                {reveal[k.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div>
            <Label>Secret Key</Label>
            <Input
              type={reveal[k.id] ? "text" : "password"}
              value={k.secret_key ?? ""}
              onChange={(e) => update(k.id, { secret_key: e.target.value })}
              className="bg-input"
              placeholder="paste secret key"
            />
          </div>
          <div>
            <Label>Endpoint URL</Label>
            <Input value={k.endpoint ?? ""} onChange={(e) => update(k.id, { endpoint: e.target.value })} className="bg-input" placeholder="https://api.example.com" />
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={k.notes ?? ""} onChange={(e) => update(k.id, { notes: e.target.value })} className="bg-input" />
          </div>
          <Button variant="hero" className="w-full" onClick={() => save(k)}><Save className="h-4 w-4" /> Save {labels[k.category]}</Button>
        </div>
      ))}
      {keys.length === 0 && <p className="text-muted-foreground text-sm">Loading API key slots…</p>}
    </div>
  );
};

const DepositsAdmin = () => {
  const [rows, setRows] = useState<DepositRow[]>([]);
  async function load() {
    const { data } = await supabase.from("deposits").select("*").order("created_at", { ascending: false }).limit(100);
    setRows((data ?? []) as DepositRow[]);
  }
  useEffect(() => { load(); }, []);

  async function setStatus(d: DepositRow, status: "approved" | "rejected") {
    const { error } = await supabase.from("deposits").update({ status }).eq("id", d.id);
    if (error) return toast.error(error.message);
    if (status === "approved") {
      // Credit balance via select-then-update
      const { data: prof } = await supabase.from("profiles").select("balance").eq("id", d.user_id).maybeSingle();
      const newBal = Number(prof?.balance ?? 0) + Number(d.amount);
      await supabase.from("profiles").update({ balance: newBal }).eq("id", d.user_id);
    }
    toast.success(`Deposit ${status}`);
    load();
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-card mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground text-xs uppercase">
          <tr><th className="py-2 pr-3">Date</th><th className="pr-3">Method</th><th className="pr-3">Amount</th><th className="pr-3">Ref</th><th className="pr-3">Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="py-2 pr-3 text-xs">{new Date(r.created_at).toLocaleString()}</td>
              <td className="pr-3">{r.payment_method}</td>
              <td className="pr-3 font-bold">৳ {Number(r.amount).toFixed(2)}</td>
              <td className="pr-3 text-xs">{r.reference ?? "—"}</td>
              <td className="pr-3"><span className={`text-xs font-bold ${r.status === "approved" ? "text-success" : r.status === "rejected" ? "text-destructive" : "text-accent"}`}>{r.status}</span></td>
              <td className="space-x-1">
                {r.status === "pending" && (
                  <>
                    <Button size="sm" variant="hero" onClick={() => setStatus(r, "approved")}>Approve</Button>
                    <Button size="sm" variant="destructive" onClick={() => setStatus(r, "rejected")}>Reject</Button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">No deposits yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
};

const UsersAdmin = () => {
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});

  async function load() {
    const { data } = await supabase.from("profiles").select("id, username, balance, currency").order("username");
    setUsers((data ?? []) as ProfileRow[]);
  }
  useEffect(() => { load(); }, []);

  async function saveBalance(id: string) {
    const v = Number(edits[id]);
    if (Number.isNaN(v)) return toast.error("Invalid number");
    const { error } = await supabase.from("profiles").update({ balance: v }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Balance updated");
    load();
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-card mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground text-xs uppercase">
          <tr><th className="py-2 pr-3">Username</th><th className="pr-3">Currency</th><th className="pr-3">Balance</th><th>Set Balance</th></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-border">
              <td className="py-2 pr-3 font-semibold">{u.username}</td>
              <td className="pr-3">{u.currency}</td>
              <td className="pr-3 font-bold">৳ {Number(u.balance).toFixed(2)}</td>
              <td className="flex gap-1 py-2">
                <Input
                  value={edits[u.id] ?? ""}
                  onChange={(e) => setEdits((s) => ({ ...s, [u.id]: e.target.value }))}
                  className="bg-input h-8 w-28"
                  placeholder="amount"
                />
                <Button size="sm" variant="hero" onClick={() => saveBalance(u.id)}>Set</Button>
              </td>
            </tr>
          ))}
          {users.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">No users yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
};

const SiteSettingsAdmin = () => {
  const [items, setItems] = useState<{ key: string; value: string }[]>([]);
  async function load() {
    const { data } = await supabase.from("site_settings").select("*");
    setItems((data ?? []).map((d: any) => ({ key: d.key, value: typeof d.value === "string" ? d.value : JSON.stringify(d.value) })));
  }
  useEffect(() => { load(); }, []);

  async function save(key: string, value: string) {
    let parsed: any;
    try { parsed = JSON.parse(value); } catch { parsed = value; }
    const { error } = await supabase.from("site_settings").update({ value: parsed, updated_at: new Date().toISOString() }).eq("key", key);
    if (error) return toast.error(error.message);
    toast.success(`${key} updated`);
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-card mt-4 space-y-3">
      {items.map((it) => (
        <div key={it.key} className="grid sm:grid-cols-[200px_1fr_auto] gap-2 items-center">
          <Label className="text-foreground">{it.key}</Label>
          <Input value={it.value} onChange={(e) => setItems((s) => s.map((x) => x.key === it.key ? { ...x, value: e.target.value } : x))} className="bg-input" />
          <Button variant="hero" size="sm" onClick={() => save(it.key, it.value)}>Save</Button>
        </div>
      ))}
    </div>
  );
};

export default Admin;
