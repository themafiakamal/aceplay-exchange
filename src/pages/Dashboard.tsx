import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, History, User, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Deposit {
  id: string;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
}

const Dashboard = () => {
  const { user, profile, isAdmin, loading } = useAuth();
  const [deposits, setDeposits] = useState<Deposit[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("deposits").select("*").order("created_at", { ascending: false }).limit(10).then(({ data }) => {
      setDeposits((data ?? []) as Deposit[]);
    });
  }, [user]);

  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background pb-10">
      <SiteHeader />
      <div className="container max-w-3xl py-5 px-4 space-y-4">
        {/* Wallet Card */}
        <div className="rounded-2xl gradient-primary p-5 shadow-elevated relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-accent/20 blur-2xl" />
          <p className="text-xs uppercase tracking-wider text-white/70 flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5" /> Main Wallet
          </p>
          <p className="text-4xl font-bold text-white mt-1">
            ৳ {Number(profile?.balance ?? 0).toFixed(2)}
          </p>
          <p className="text-xs text-white/70 mt-1">{profile?.currency ?? "BDT"} • {profile?.username}</p>
          <div className="grid grid-cols-2 gap-2 mt-4 relative">
            <Button variant="hero" asChild><Link to="/deposit"><ArrowDownToLine className="h-4 w-4" /> Deposit</Link></Button>
            <Button variant="outlineLight" asChild><Link to="/withdraw"><ArrowUpFromLine className="h-4 w-4" /> Withdraw</Link></Button>
          </div>
        </div>

        {/* Profile */}
        <div className="bg-surface rounded-xl border border-border p-4 shadow-card">
          <h2 className="font-bold text-foreground flex items-center gap-2 mb-3"><User className="h-4 w-4 text-accent" /> Profile</h2>
          <dl className="text-sm space-y-2">
            <Row label="Username" value={profile?.username ?? "—"} />
            <Row label="Phone" value={profile?.phone ?? "—"} />
            <Row label="Email" value={profile?.email ?? "—"} />
            <Row label="Currency" value={profile?.currency ?? "—"} />
            <Row label="Referral Code" value={profile?.referral_code ?? "—"} />
          </dl>
        </div>

        {isAdmin && (
          <Link to="/admin" className="block rounded-xl gradient-accent p-4 shadow-glow-accent">
            <p className="text-accent-foreground font-bold flex items-center gap-2"><Shield className="h-4 w-4" /> Open Admin Panel</p>
            <p className="text-accent-foreground/80 text-xs mt-1">Manage users, deposits, settings & API keys</p>
          </Link>
        )}

        {/* History */}
        <div className="bg-surface rounded-xl border border-border p-4 shadow-card">
          <h2 className="font-bold text-foreground flex items-center gap-2 mb-3"><History className="h-4 w-4 text-accent" /> Recent Deposits</h2>
          {deposits.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No deposits yet. Make your first deposit to claim the welcome bonus.</p>
          ) : (
            <ul className="divide-y divide-border">
              {deposits.map((d) => (
                <li key={d.id} className="py-2.5 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-foreground">৳ {Number(d.amount).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{d.payment_method} • {new Date(d.created_at).toLocaleString()}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    d.status === "approved" ? "bg-success/20 text-success" :
                    d.status === "rejected" ? "bg-destructive/20 text-destructive" :
                    "bg-accent/20 text-accent"
                  }`}>{d.status.toUpperCase()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-3">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="text-foreground font-medium text-right truncate">{value}</dd>
  </div>
);

export default Dashboard;
