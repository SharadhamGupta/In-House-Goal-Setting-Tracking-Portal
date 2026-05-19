"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

const demoAccounts = [
  { role: "Employee", email: "employee@demo.com", password: "Employee123" },
  { role: "Manager", email: "manager@demo.com", password: "Manager123" },
  { role: "Admin", email: "admin@demo.com", password: "Admin123" },
];

export function LoginForm() {
  const [loginState, loginFormAction, isLoggingIn] = useActionState(loginAction, {});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  // Forgot password states
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const supabase = createClient();

  function handleDemoSelect(role: string) {
    const account = demoAccounts.find((a) => a.role === role);
    if (account) {
      setEmail(account.email);
      setPassword(account.password);
      setSelectedRole(role);
    }
  }

  async function handleSendResetLink() {
    if (!resetEmail) {
      setResetError("Please enter your email address.");
      return;
    }
    setIsSendingReset(true);
    setResetError(null);
    setResetSuccess(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setResetError(error.message);
      } else {
        setResetSuccess("Check your email for a reset link.");
      }
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsSendingReset(false);
    }
  }

  return (
    <Card className="w-full bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl rounded-2xl overflow-hidden">
      <CardContent className="pt-8 px-6 sm:px-8 pb-8">
        <form action={loginFormAction} className="grid gap-6">
          {!showReset ? (
            <>
              {/* Microsoft Login at the top */}
              <Button
                type="button"
                onClick={() =>
                  supabase.auth.signInWithOAuth({
                    provider: "azure",
                    options: {
                      redirectTo: `${window.location.origin}/auth/callback`
                    }
                  })
                }
                className="w-full bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 h-12 text-base font-medium transition-all flex items-center justify-center gap-3 rounded-xl"
              >
                <svg className="h-5 w-5" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 0H11V11H0V0Z" fill="#F25022" />
                  <path d="M12 0H23V11H12V0Z" fill="#7FBA00" />
                  <path d="M0 12H11V23H0V12Z" fill="#00A4EF" />
                  <path d="M12 12H23V23H12V12Z" fill="#FFB900" />
                </svg>
                Sign in with Microsoft
              </Button>

              <div className="flex items-center gap-3 my-2">
                <div className="h-px bg-white/10 flex-1"></div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Or</span>
                <div className="h-px bg-white/10 flex-1"></div>
              </div>

              <div className="grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-slate-300 font-medium">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setSelectedRole("");
                    }}
                    placeholder="name@company.com"
                    autoComplete="email"
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500 h-11 transition-colors"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-slate-300 font-medium">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setSelectedRole("");
                    }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="bg-white/5 border-white/10 text-white focus-visible:ring-indigo-500 h-11 transition-colors"
                  />
                </div>
              </div>

              <div className="grid gap-2 pt-2">
                <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Quick demo login (Hackathon only)</Label>
                <Select onValueChange={handleDemoSelect} value={selectedRole}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-slate-300 h-11 transition-colors hover:bg-white/10">
                    <SelectValue placeholder="Select a demo account" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                    {demoAccounts.map((account) => (
                      <SelectItem key={account.role} value={account.role} className="focus:bg-slate-800 focus:text-white cursor-pointer">
                        {account.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {loginState.error && (
                <p className="rounded-lg bg-red-950/50 border border-red-900/50 p-3 text-sm text-red-400">
                  {loginState.error}
                </p>
              )}

              <Button 
                type="submit" 
                disabled={isLoggingIn}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-0 h-12 text-base font-medium shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] transition-all mt-2"
              >
                {isLoggingIn ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                {selectedRole ? `Login as ${selectedRole}` : "Sign in"}
              </Button>

              <div className="flex justify-center mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowReset(true);
                    setResetError(null);
                    setResetSuccess(null);
                  }}
                  className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            </>
          ) : (
            <div className="grid gap-4 mt-2 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="grid gap-2">
                <Label htmlFor="resetEmail" className="text-slate-300 font-medium">Enter your email to receive a reset link</Label>
                <Input
                  id="resetEmail"
                  type="email"
                  value={resetEmail}
                  onChange={(event) => setResetEmail(event.target.value)}
                  placeholder="name@company.com"
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500 h-11 transition-colors"
                />
              </div>

              {resetError && (
                <p className="rounded-lg bg-red-950/50 border border-red-900/50 p-3 text-sm text-red-400">
                  {resetError}
                </p>
              )}

              {resetSuccess && (
                <p className="rounded-lg bg-emerald-950/50 border border-emerald-900/50 p-3 text-sm text-emerald-400">
                  {resetSuccess}
                </p>
              )}

              <Button
                type="button"
                disabled={isSendingReset}
                onClick={handleSendResetLink}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-0 h-12 text-base font-medium shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] transition-all"
              >
                {isSendingReset ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                Send Reset Link
              </Button>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowReset(false)}
                  className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  ← Back to login
                </button>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
