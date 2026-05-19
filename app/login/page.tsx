import { LoginForm } from "./login-form";
import { SmokeyBackground } from "@/components/ui/smokey-background";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#020817] flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden font-sans">

      {/* WebGL Smokey Animated Background */}
      <SmokeyBackground color="#0d2060" className="z-0" />

      {/* Dark base overlay */}
      <div className="absolute inset-0 bg-[#020817]/60 z-[1]" />

      {/* Ambient color blobs */}
      <div className="absolute inset-0 z-[2] pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[150px]" />
        <div className="absolute top-[40%] left-[50%] w-[40%] h-[40%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-900/10 blur-[120px]" />
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      {/* Main content */}
      <div className="z-10 w-full max-w-[440px] flex flex-col items-center">
        <div className="text-center mb-6 w-full">
          <div className="mb-2 flex justify-center">
            <span className="text-[2.25rem] sm:text-4xl font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
              AtomBerg GoalHub
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-medium tracking-tight text-slate-400">
            Enterprise goals that actually get done.
          </h1>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
