"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let active = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    async function checkSession() {
      // First, get the current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      
      if (session) {
        setIsVerifying(false);
      }

      // Listen to auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!active) return;
          if (event === "PASSWORD_RECOVERY" || session) {
            setIsVerifying(false);
          }
        }
      );
      authSubscription = subscription;

      // Fallback: if session didn't hydrate instantly, give it a tiny timeout
      if (!session) {
        setTimeout(async () => {
          if (!active) return;
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession) {
            setIsVerifying(false);
          } else {
            // Allow them to see the form anyway in case session load was delayed
            setIsVerifying(false);
          }
        }, 1500);
      }
    }

    void checkSession();

    return () => {
      active = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [supabase]);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      setError("Please enter a new password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
      } else {
        setSuccess("Password updated. Redirecting to login...");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#020817] flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden font-sans">
      {/* Premium ambient background effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[150px]" />
        <div className="absolute top-[40%] left-[50%] w-[40%] h-[40%] translate-x-[-50%] translate-y-[-50%] rounded-full bg-cyan-900/10 blur-[120px]" />
        {/* Subtle grid pattern for "tech" feel */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <div className="z-10 w-full max-w-[440px] flex flex-col items-center">
        <div className="text-center mb-10 w-full">
          <div className="mb-6 flex justify-center">
            <span className="text-2xl font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
              AtomBerg GoalHub
            </span>
          </div>
          <h1 className="text-[2.25rem] leading-tight font-semibold tracking-tight text-white mb-3">
            Reset Your Password
          </h1>
          <p className="text-slate-400 text-base font-medium">
            Enter your new secure password below.
          </p>
        </div>

        <Card className="w-full bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl rounded-2xl overflow-hidden">
          <CardContent className="pt-8 px-6 sm:px-8 pb-8">
            {isVerifying ? (
              <div className="flex flex-col items-center justify-center py-6 gap-3 text-slate-300">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm font-medium">Verifying reset session...</p>
              </div>
            ) : (
              <form onSubmit={handleUpdatePassword} className="grid gap-6">
                <div className="grid gap-5">
                  <div className="grid gap-2">
                    <Label htmlFor="password" className="text-slate-300 font-medium">New Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="bg-white/5 border-white/10 text-white focus-visible:ring-indigo-500 h-11 transition-colors animate-none"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirmPassword" className="text-slate-300 font-medium">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="bg-white/5 border-white/10 text-white focus-visible:ring-indigo-500 h-11 transition-colors animate-none"
                    />
                  </div>
                </div>

                {error && (
                  <p className="rounded-lg bg-red-950/50 border border-red-900/50 p-3 text-sm text-red-400">
                    {error}
                  </p>
                )}

                {success && (
                  <p className="rounded-lg bg-emerald-950/50 border border-emerald-900/50 p-3 text-sm text-emerald-400">
                    {success}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={isUpdating}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-0 h-12 text-base font-medium shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] transition-all mt-2"
                >
                  {isUpdating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                  Update Password
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
