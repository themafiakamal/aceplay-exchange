import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const step1Schema = z.object({
  username: z.string().trim().min(3, "Username must be at least 3 characters").max(20).regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, underscore only"),
  phone: z.string().trim().min(8, "Enter a valid phone number").max(15),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

const step2Schema = z.object({
  otp: z.string().length(4, "Enter the 4-digit code"),
  expectedOtp: z.string(),
  currency: z.string().min(2),
  countryCode: z.string(),
  phone: z.string().min(8),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  referral: z.string().max(40).optional(),
  agreed: z.boolean().refine((v) => v, "You must accept the terms"),
}).refine((d) => d.otp === d.expectedOtp, { message: "Verification code doesn't match", path: ["otp"] });

const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const generatedOtp = useMemo(() => Math.floor(1000 + Math.random() * 9000).toString(), []);
  const [otpCode, setOtpCode] = useState(generatedOtp);

  const [form, setForm] = useState({
    username: "",
    phone: "",
    password: "",
    otp: "",
    currency: "BDT",
    countryCode: "+880",
    email: "",
    referral: "",
    agreed: false,
  });

  function next() {
    const parsed = step1Schema.safeParse({ username: form.username, phone: form.phone, password: form.password });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setStep(2);
  }

  function regenerateOtp() {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setOtpCode(code);
    setForm((f) => ({ ...f, otp: "" }));
    toast.info(`Demo OTP regenerated: ${code}`);
  }

  async function submit() {
    const parsed = step2Schema.safeParse({
      otp: form.otp,
      expectedOtp: otpCode,
      currency: form.currency,
      countryCode: form.countryCode,
      phone: form.phone,
      email: form.email,
      referral: form.referral,
      agreed: form.agreed,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    setLoading(true);
    const email = form.email && form.email.includes("@") ? form.email : `${form.username.toLowerCase()}@rex9.user`;
    const { error } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          username: form.username,
          phone: `${form.countryCode}${form.phone}`,
          currency: form.currency,
          referral_code: form.referral || null,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSuccess(true);
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container max-w-md py-6 px-4">
        <div className="bg-surface rounded-xl border border-border shadow-card overflow-hidden">
          <div className="gradient-accent px-4 py-3 flex items-center justify-between">
            <h1 className="font-bold text-accent-foreground">Register</h1>
            <span className="text-xs text-accent-foreground/90">Step {step} of 2</span>
          </div>

          {step === 1 && (
            <div className="p-5 space-y-4 animate-fade-in">
              <div>
                <Label htmlFor="u">Username <span className="text-accent">*</span></Label>
                <Input id="u" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="bg-input" placeholder="yourname" />
              </div>
              <div>
                <Label htmlFor="ph">Mobile Number <span className="text-accent">*</span></Label>
                <div className="flex gap-2">
                  <Select value={form.countryCode} onValueChange={(v) => setForm({ ...form, countryCode: v })}>
                    <SelectTrigger className="w-24 bg-input"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+880">+880</SelectItem>
                      <SelectItem value="+91">+91</SelectItem>
                      <SelectItem value="+92">+92</SelectItem>
                      <SelectItem value="+1">+1</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input id="ph" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-input flex-1" placeholder="1XXXXXXXXX" />
                </div>
              </div>
              <div>
                <Label htmlFor="pw">Confirm Password <span className="text-accent">*</span></Label>
                <Input id="pw" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="bg-input" />
              </div>
              <Button variant="navy" className="w-full" onClick={next}>Next →</Button>
              <p className="text-xs text-muted-foreground text-center">
                Already a member? <Link to="/login" className="text-accent font-semibold">Login</Link>
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="p-5 space-y-4 animate-fade-in">
              <div>
                <Label>Verification Code <span className="text-accent">*</span></Label>
                <div className="flex gap-2">
                  <Input value={form.otp} onChange={(e) => setForm({ ...form, otp: e.target.value })} maxLength={4} className="bg-input" placeholder="4-digit code" />
                  <div className="flex items-center gap-1.5 px-3 rounded-md bg-primary text-primary-foreground font-mono font-bold text-lg select-none">
                    {otpCode}
                    <button type="button" onClick={regenerateOtp} aria-label="Regenerate"><RefreshCw className="h-4 w-4" /></button>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Enter the code shown above (demo)</p>
              </div>
              <div>
                <Label>Currency <span className="text-accent">*</span></Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger className="bg-input"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BDT">৳ BDT - Bangladeshi Taka</SelectItem>
                    <SelectItem value="INR">₹ INR - Indian Rupee</SelectItem>
                    <SelectItem value="USD">$ USD - US Dollar</SelectItem>
                    <SelectItem value="PKR">₨ PKR - Pakistani Rupee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mobile Number <span className="text-accent">*</span></Label>
                <Input value={`${form.countryCode} ${form.phone}`} disabled className="bg-input opacity-70" />
              </div>
              <div>
                <Label>Email (optional)</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-input" placeholder="you@example.com" />
              </div>
              <div>
                <Label>Referral Code</Label>
                <Input value={form.referral} onChange={(e) => setForm({ ...form, referral: e.target.value })} className="bg-input" />
              </div>
              <label className="flex items-start gap-2 text-xs text-foreground/90">
                <Checkbox checked={form.agreed} onCheckedChange={(v) => setForm({ ...form, agreed: !!v })} className="mt-0.5" />
                <span>I confirm I am 18+ and accept the Terms & Conditions and Privacy Policy.</span>
              </label>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setStep(1)}>← Back</Button>
                <Button variant="hero" className="flex-1" onClick={submit} disabled={loading}>
                  {loading ? "Creating..." : "Complete ✓"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={success} onOpenChange={(v) => { if (!v) navigate("/dashboard"); }}>
        <DialogContent className="bg-surface border-border max-w-sm">
          <DialogTitle className="sr-only">Registration Successful</DialogTitle>
          <div className="text-center py-2">
            <div className="mx-auto w-14 h-14 rounded-full gradient-accent flex items-center justify-center shadow-glow-accent mb-3">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Registration Successful</h2>
            <p className="text-sm text-muted-foreground mb-2">
              Welcome to Rex9 — South Asia's most trusted online cricket exchange and casino platform.
            </p>
            <div className="flex justify-center gap-2 my-3">
              <span className="w-7 h-7 rounded-full bg-success text-success-foreground text-xs flex items-center justify-center font-bold">1</span>
              <span className="w-7 h-7 rounded-full bg-success text-success-foreground text-xs flex items-center justify-center font-bold">2</span>
              <span className="w-7 h-7 rounded-full bg-success text-success-foreground text-xs flex items-center justify-center font-bold"><CheckCircle2 className="h-4 w-4" /></span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Make your first deposit now and claim your 100% Welcome Bonus.
            </p>
            <Button variant="navy" className="w-full" onClick={() => navigate("/deposit")}>Deposit Now</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Register;
