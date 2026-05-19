import { LoginForm } from "./login-form";

export default function LoginPage() {
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
        <div className="text-center mb-6 w-full">
          <div className="mb-4 flex justify-center">
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
