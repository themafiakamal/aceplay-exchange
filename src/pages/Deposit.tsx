import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, Copy } from "lucide-react";

interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  account_number: string | null;
  account_type: string | null;
  logo_url: string | null;
  enabled: boolean;
}

const presetAmounts = [200, 500, 1000, 2000, 10000, 20000];

const colorMap: Record<string, string> = {
  Nagad: "from-orange-500 to-orange-700",
  Bkash: "from-pink-500 to-pink-700",
  Rocket: "from-purple-500 to-purple-700",
  Upay: "from-yellow-400 to-amber-600",
};

const schema = z.object({
  method: z.string().min(2),
  amount: z.number().min(100, "Minimum deposit is 100").max(500000),
  reference: z.string().min(4, "Transaction ID is required").max(80),
  bonus: z.string().max(40).optional(),
});

const Deposit = () => {
  const { user, profile, loading } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [method, setMethod] = useState("Nagad");
  const [amount, setAmount] = useState(500);
  const [reference, setReference] = useState("");
  const [bonus, setBonus] = useState("No Bonus");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.from("payment_methods").select("*").eq("enabled", true).order("sort_order").then(({ data }) => {
      const list = (data ?? []) as PaymentMethod[];
      setMethods(list);
      if (list.length && !list.find((m) => m.code === method)) setMethod(list[0].code);
    });
  }, []);

  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/login" replace />;

  const selected = methods.find((m) => m.code === method);

  async function submit() {
    const parsed = schema.safeParse({ method, amount, reference, bonus });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("deposits").insert({
      user_id: user!.id,
      amount,
      payment_method: method,
      reference,
      bonus,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deposit request submitted! Pending admin approval.");
    setReference("");
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <SiteHeader />
      <div className="container max-w-3xl py-5 px-4 space-y-4">
        <div className="rounded-xl gradient-primary p-4 shadow-card flex items-center justify-between">
          <div>
            <p className="text-xs text-white/70 uppercase">Main Wallet</p>
            <p className="text-2xl font-bold text-white">৳ {Number(profile?.balance ?? 0).toFixed(2)}</p>
          </div>
          <CreditCard className="h-8 w-8 text-accent" />
        </div>

        <div className="bg-surface rounded-xl border border-border p-4 shadow-card">
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button className="gradient-accent text-accent-foreground font-bold py-2.5 rounded-md">Deposit</button>
            <Link to="/withdraw" className="bg-surface-elevated text-foreground font-semibold py-2.5 rounded-md text-center">Withdraw</Link>
          </div>

          <Label className="mb-2 block">Payment Method</Label>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {methods.map((m) => (
              <button key={m.id} onClick={() => setMethod(m.code)} className={`relative rounded-lg p-2 border-2 transition-smooth ${method === m.code ? "border-accent shadow-glow-accent" : "border-border"}`}>
                <span className="absolute -top-1.5 -right-1 text-[9px] bg-success text-success-foreground font-bold px-1 py-0.5 rounded">+3.0%</span>
                {m.logo_url ? (
                  <img src={m.logo_url} alt={m.name} className="w-full aspect-square rounded object-cover" />
                ) : (
                  <div className={`w-full aspect-square rounded bg-gradient-to-br ${colorMap[m.code] ?? "from-slate-500 to-slate-700"} flex items-center justify-center text-white font-bold text-2xl`}>
                    {m.name.charAt(0)}
                  </div>
                )}
                <p className="text-[11px] font-semibold text-center mt-1 text-foreground">{m.name}</p>
              </button>
            ))}
          </div>

          {selected && (
            <div className="bg-surface-elevated border border-accent/40 rounded-lg p-3 mb-4">
              <p className="text-xs text-muted-foreground uppercase">Send money to this {selected.name} number</p>
              {selected.account_number ? (
                <div className="flex items-center justify-between mt-1">
                  <div>
                    <p className="text-lg font-bold text-foreground tracking-wide">{selected.account_number}</p>
                    <p className="text-xs text-muted-foreground">Account type: {selected.account_type ?? "Personal"}</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => copy(selected.account_number!)}>
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-destructive mt-1">Number not configured yet. Please contact support.</p>
              )}
            </div>
          )}

          <Label className="mb-2 block">Amount</Label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2">
            {presetAmounts.map((a) => (
              <button key={a} onClick={() => setAmount(a)} className={`py-2 rounded-md text-sm font-semibold border ${amount === a ? "gradient-primary text-primary-foreground border-primary-glow" : "bg-surface-elevated text-foreground border-border"}`}>
                {a}
              </button>
            ))}
          </div>
          <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="bg-input mb-4" />

          <Label className="mb-2 block">Bonus</Label>
          <Select value={bonus} onValueChange={setBonus}>
            <SelectTrigger className="bg-input mb-4"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="No Bonus">No Bonus</SelectItem>
              <SelectItem value="100% Welcome Bonus">100% Welcome Bonus</SelectItem>
              <SelectItem value="20% Reload Bonus">20% Reload Bonus</SelectItem>
            </SelectContent>
          </Select>

          <Label htmlFor="ref" className="mb-2 block">Transaction ID (TrxID) *</Label>
          <Input id="ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Enter the TrxID from your payment app" className="bg-input mb-4" />

          <Button variant="navy" className="w-full" onClick={submit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Deposit Request"}
          </Button>
        </div>

        <div className="bg-surface rounded-xl border border-border p-4 text-xs text-muted-foreground space-y-2">
          <p className="font-bold text-foreground">Important Notice</p>
          <p>1. Deposits typically credit within 10 minutes after admin approval. If not, contact 24/7 live chat.</p>
          <p>2. Use only your own personal mobile banking account to deposit.</p>
          <p>3. Always include the correct transaction reference (TrxID) for fast verification.</p>
        </div>
      </div>
    </div>
  );
};

export default Deposit;
