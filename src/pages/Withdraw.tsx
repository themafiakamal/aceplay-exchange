import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";

interface PaymentMethod { id: string; code: string; name: string; enabled: boolean; }

const schema = z.object({
  amount: z.number().min(500, "Minimum withdrawal is 500").max(500000),
  payment_method: z.string().min(2),
  account_number: z.string().min(6, "Valid account number required").max(40),
  account_name: z.string().max(80).optional(),
});

const Withdraw = () => {
  const { user, profile, loading, refresh } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [method, setMethod] = useState("Nagad");
  const [amount, setAmount] = useState(1000);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.from("payment_methods").select("id,code,name,enabled").eq("enabled", true).order("sort_order").then(({ data }) => {
      const list = (data ?? []) as PaymentMethod[];
      setMethods(list);
      if (list.length) setMethod(list[0].code);
    });
  }, []);

  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/login" replace />;

  async function submit() {
    const parsed = schema.safeParse({ amount, payment_method: method, account_number: accountNumber, account_name: accountName });
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    if (Number(profile?.balance ?? 0) < amount) return toast.error("Insufficient balance");
    setSubmitting(true);
    const { error } = await supabase.from("withdrawals").insert({
      user_id: user!.id,
      amount,
      payment_method: method,
      account_number: accountNumber,
      account_name: accountName || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Withdrawal request submitted! Pending admin approval.");
    setAccountNumber("");
    setAccountName("");
    refresh();
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
            <Link to="/deposit" className="bg-surface-elevated text-foreground font-semibold py-2.5 rounded-md text-center">Deposit</Link>
            <button className="gradient-accent text-accent-foreground font-bold py-2.5 rounded-md">Withdraw</button>
          </div>

          <Label className="mb-2 block">Payment Method</Label>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {methods.map((m) => (
              <button key={m.id} onClick={() => setMethod(m.code)} className={`rounded-lg p-2 border-2 transition-smooth ${method === m.code ? "border-accent shadow-glow-accent" : "border-border"}`}>
                <p className="text-sm font-semibold text-center text-foreground">{m.name}</p>
              </button>
            ))}
          </div>

          <Label className="mb-2 block">Amount (BDT)</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="bg-input mb-4" />

          <Label className="mb-2 block">Your {method} Account Number *</Label>
          <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="01XXXXXXXXX" className="bg-input mb-4" />

          <Label className="mb-2 block">Account Holder Name (optional)</Label>
          <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} className="bg-input mb-4" />

          <Button variant="navy" className="w-full" onClick={submit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Withdrawal Request"}
          </Button>
        </div>

        <div className="bg-surface rounded-xl border border-border p-4 text-xs text-muted-foreground space-y-2">
          <p className="font-bold text-foreground">Important Notice</p>
          <p>1. Withdrawals are processed within 30 minutes after admin approval.</p>
          <p>2. Make sure your account number is correct — incorrect entries cannot be reversed.</p>
        </div>
      </div>
    </div>
  );
};

export default Withdraw;
