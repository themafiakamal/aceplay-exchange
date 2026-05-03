import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Shield, Key, Users, DollarSign, Settings as SettingsIcon, Save, Eye, EyeOff, Trash2, ArrowUpFromLine } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
            <TabsTrigger value="withdrawals"><ArrowUpFromLine className="h-4 w-4 mr-1.5" /> Withdraw Requests</TabsTrigger>
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-1.5" /> Users</TabsTrigger>
            <TabsTrigger value="settings"><SettingsIcon className="h-4 w-4 mr-1.5" /> Site Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="api"><ApiManagement /></TabsContent>
          <TabsContent value="deposits"><DepositsAdmin /></TabsContent>
          <TabsContent value="withdrawals"><WithdrawalsAdmin /></TabsContent>
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
  const [pendingDelete, setPendingDelete] = useState<ProfileRow | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  async function confirmDelete() {
    if (!pendingDelete) return;
    const targetId = pendingDelete.id;
    const targetName = pendingDelete.username;
    if (!targetId) {
      toast.error("Missing user id");
      return;
    }
    setDeleting(true);
    try {
      await supabase.from("withdrawals").delete().eq("user_id", targetId);
      await supabase.from("deposits").delete().eq("user_id", targetId);
      await supabase.from("user_roles").delete().eq("user_id", targetId);
      const { error } = await supabase.from("profiles").delete().eq("id", targetId);
      if (error) {
        toast.error(error.message);
        return;
      }
      // Optimistically remove just this row, then refresh from server
      setUsers((prev) => prev.filter((p) => p.id !== targetId));
      toast.success(`Deleted ${targetName}`);
      setPendingDelete(null);
      await load();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-card mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground text-xs uppercase">
          <tr><th className="py-2 pr-3">Username</th><th className="pr-3">Currency</th><th className="pr-3">Balance</th><th className="pr-3">Set Balance</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-border">
              <td className="py-2 pr-3 font-semibold">{u.username}</td>
              <td className="pr-3">{u.currency}</td>
              <td className="pr-3 font-bold">৳ {Number(u.balance).toFixed(2)}</td>
              <td className="py-2 pr-3">
                <div className="flex gap-1">
                  <Input
                    value={edits[u.id] ?? ""}
                    onChange={(e) => setEdits((s) => ({ ...s, [u.id]: e.target.value }))}
                    className="bg-input h-8 w-24"
                    placeholder="amount"
                  />
                  <Button size="sm" variant="hero" onClick={() => saveBalance(u.id)}>Set</Button>
                </div>
              </td>
              <td>
                <Button size="sm" variant="destructive" onClick={() => setPendingDelete(u)}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </td>
            </tr>
          ))}
          {users.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">No users yet.</td></tr>}
        </tbody>
      </table>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-semibold text-foreground">{pendingDelete?.username}</span> and remove their profile, role, deposits and withdrawals. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    <div className="space-y-4 mt-4">
      <div className="bg-surface border border-border rounded-xl p-4 shadow-card space-y-3">
        <h3 className="font-bold text-foreground flex items-center gap-2"><SettingsIcon className="h-4 w-4 text-accent" /> General</h3>
        {items.map((it) => (
          <div key={it.key} className="grid sm:grid-cols-[200px_1fr_auto] gap-2 items-center">
            <Label className="text-foreground">{it.key}</Label>
            <Input value={it.value} onChange={(e) => setItems((s) => s.map((x) => x.key === it.key ? { ...x, value: e.target.value } : x))} className="bg-input" />
            <Button variant="hero" size="sm" onClick={() => save(it.key, it.value)}>Save</Button>
          </div>
        ))}
      </div>
      <PaymentMethodsAdmin />
    </div>
  );
};

interface PaymentMethodRow {
  id: string;
  code: string;
  name: string;
  account_number: string | null;
  account_type: string | null;
  logo_url: string | null;
  enabled: boolean;
}

const PaymentMethodsAdmin = () => {
  const [rows, setRows] = useState<PaymentMethodRow[]>([]);

  async function load() {
    const { data } = await supabase.from("payment_methods").select("*").order("sort_order");
    setRows((data ?? []) as PaymentMethodRow[]);
  }
  useEffect(() => { load(); }, []);

  function update(id: string, patch: Partial<PaymentMethodRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function save(r: PaymentMethodRow) {
    const { error } = await supabase.from("payment_methods").update({
      name: r.name,
      account_number: r.account_number,
      account_type: r.account_type,
      logo_url: r.logo_url,
      enabled: r.enabled,
      updated_at: new Date().toISOString(),
    }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success(`${r.name} updated`);
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-card space-y-4">
      <h3 className="font-bold text-foreground flex items-center gap-2"><DollarSign className="h-4 w-4 text-accent" /> Payment Methods (Mobile Numbers & Logos)</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((r) => (
          <div key={r.id} className="border border-border rounded-lg p-3 bg-surface-elevated space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {r.logo_url ? (
                  <img src={r.logo_url} alt={r.name} className="w-10 h-10 rounded object-cover border border-border" />
                ) : (
                  <div className="w-10 h-10 rounded bg-primary/30 flex items-center justify-center text-foreground font-bold">{r.name.charAt(0)}</div>
                )}
                <Input value={r.name} onChange={(e) => update(r.id, { name: e.target.value })} className="bg-input h-8" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{r.enabled ? "On" : "Off"}</span>
                <Switch checked={r.enabled} onCheckedChange={(v) => update(r.id, { enabled: v })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Mobile Number</Label>
              <Input value={r.account_number ?? ""} onChange={(e) => update(r.id, { account_number: e.target.value })} placeholder="01XXXXXXXXX" className="bg-input h-9" />
            </div>
            <div>
              <Label className="text-xs">Account Type</Label>
              <Input value={r.account_type ?? ""} onChange={(e) => update(r.id, { account_type: e.target.value })} placeholder="Personal / Agent / Merchant" className="bg-input h-9" />
            </div>
            <div>
              <Label className="text-xs">Logo URL</Label>
              <Input value={r.logo_url ?? ""} onChange={(e) => update(r.id, { logo_url: e.target.value })} placeholder="https://.../logo.png" className="bg-input h-9" />
            </div>
            <Button variant="hero" size="sm" className="w-full" onClick={() => save(r)}><Save className="h-3.5 w-3.5" /> Save {r.name}</Button>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Loading payment methods…</p>}
      </div>
    </div>
  );
};

interface WithdrawalRow {
  id: string;
  user_id: string;
  amount: number;
  payment_method: string;
  account_number: string;
  account_name: string | null;
  status: string;
  created_at: string;
}

const WithdrawalsAdmin = () => {
  const [rows, setRows] = useState<WithdrawalRow[]>([]);

  async function load() {
    const { data } = await supabase.from("withdrawals").select("*").order("created_at", { ascending: false }).limit(200);
    setRows((data ?? []) as WithdrawalRow[]);
  }
  useEffect(() => { load(); }, []);

  async function setStatus(w: WithdrawalRow, status: "approved" | "rejected") {
    if (status === "approved") {
      const { data: prof } = await supabase.from("profiles").select("balance").eq("id", w.user_id).maybeSingle();
      const current = Number(prof?.balance ?? 0);
      if (current < Number(w.amount)) return toast.error("User balance insufficient");
      await supabase.from("profiles").update({ balance: current - Number(w.amount) }).eq("id", w.user_id);
    }
    const { error } = await supabase.from("withdrawals").update({ status }).eq("id", w.id);
    if (error) return toast.error(error.message);
    toast.success(`Withdrawal ${status}`);
    load();
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-card mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground text-xs uppercase">
          <tr>
            <th className="py-2 pr-3">Date</th>
            <th className="pr-3">Method</th>
            <th className="pr-3">Account</th>
            <th className="pr-3">Amount</th>
            <th className="pr-3">Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="py-2 pr-3 text-xs">{new Date(r.created_at).toLocaleString()}</td>
              <td className="pr-3">{r.payment_method}</td>
              <td className="pr-3 text-xs">
                <div className="font-semibold text-foreground">{r.account_number}</div>
                {r.account_name && <div className="text-muted-foreground">{r.account_name}</div>}
              </td>
              <td className="pr-3 font-bold">৳ {Number(r.amount).toFixed(2)}</td>
              <td className="pr-3">
                <span className={`text-xs font-bold ${r.status === "approved" ? "text-success" : r.status === "rejected" ? "text-destructive" : "text-accent"}`}>{r.status}</span>
              </td>
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
          {rows.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">No withdrawal requests yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
};

export default Admin;
