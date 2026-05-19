"use client";

import { motion } from "motion/react";
import { Menu, Target, BarChart3, Users, Shield } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

export function GoalHubHero() {
  return (
    <div className="container max-w-5xl mx-auto">
      <header className="relative pt-4">
        <nav className="flex items-center justify-between rounded-xl bg-background py-2 px-4 shadow-lg border">
          <div className="flex items-center space-x-6">
            <a href="#" className="text-base font-semibold flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <Target className="h-3.5 w-3.5 text-white" />
              </div>
              AtomBerg GoalHub
            </a>
            <div className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-sm text-muted-foreground/60 hover:text-foreground/80 transition-colors">
                Features
              </a>
              <a href="#roles" className="text-sm text-muted-foreground/60 hover:text-foreground/80 transition-colors">
                Roles
              </a>
              <a href="#how-it-works" className="text-sm text-muted-foreground/60 hover:text-foreground/80 transition-colors">
                How it works
              </a>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Separator orientation="vertical" className="h-6" />
            <Link href="/login">
              <Button
                variant="ghost"
                className="hidden md:inline-flex h-7 px-2 text-sm font-normal text-muted-foreground/60 hover:text-foreground/80"
              >
                Sign in
              </Button>
            </Link>
            <Link href="/login">
              <Button className="hidden md:inline-flex h-7 rounded-full bg-foreground px-3 text-sm font-normal text-background hover:bg-foreground/90">
                Get started
              </Button>
            </Link>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 md:hidden">
                  <Menu className="h-[15px] w-[15px]" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[240px] sm:w-[300px] p-6">
                <nav className="flex flex-col space-y-4 mt-6">
                  <a href="#features" className="text-sm text-muted-foreground/60 hover:text-foreground/80 transition-colors">Features</a>
                  <a href="#roles" className="text-sm text-muted-foreground/60 hover:text-foreground/80 transition-colors">Roles</a>
                  <a href="#how-it-works" className="text-sm text-muted-foreground/60 hover:text-foreground/80 transition-colors">How it works</a>
                  <Link href="/login">
                    <Button variant="ghost" className="justify-start h-7 px-2 text-sm font-normal text-muted-foreground/60 hover:text-foreground/80 w-full">
                      Sign in
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button className="h-7 rounded-full bg-foreground px-3 text-sm font-normal text-background hover:bg-foreground/90 w-full">
                      Get started
                    </Button>
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </header>

      <main className="relative container px-2 mx-auto">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-36">
          <motion.div
            className="flex flex-col items-center space-y-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground"
            >
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Built for AtomQuest Hackathon 1.0
            </motion.div>

            <motion.h1
              className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              Enterprise Goals,{" "}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Actually Done
              </span>
            </motion.h1>

            <motion.p
              className="mx-auto max-w-xl text-md sm:text-xl text-muted-foreground"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              A role-based goal setting &amp; tracking portal for enterprise teams.{" "}
              <span className="font-semibold text-foreground">Set goals, get approvals,</span>{" "}
              and track{" "}
              <span className="font-semibold text-foreground">quarterly progress</span>{" "}
              — all in one place.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <Link href="/login">
                <Button className="rounded-xl bg-foreground text-background hover:bg-foreground/90 px-6">
                  Open Portal
                  <Target className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Button variant="outline" className="rounded-xl px-6">
                <BarChart3 className="mr-2 h-4 w-4" />
                View Demo
              </Button>
            </motion.div>

            {/* Role pills */}
            <motion.div
              className="flex flex-col items-center space-y-3 pb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <div className="flex items-center flex-wrap justify-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                  <Users className="h-3.5 w-3.5" /> Employees
                </span>
                <span className="text-muted-foreground/40">•</span>
                <span className="flex items-center gap-1.5 text-indigo-600 font-medium">
                  <BarChart3 className="h-3.5 w-3.5" /> Managers
                </span>
                <span className="text-muted-foreground/40">•</span>
                <span className="flex items-center gap-1.5 text-violet-600 font-medium">
                  <Shield className="h-3.5 w-3.5" /> Admin / HR
                </span>
              </div>
              <p className="text-sm text-muted-foreground/60">
                Role-based portals with goal approval, check-in workflows, and analytics
              </p>
            </motion.div>

            {/* Dashboard preview */}
            <motion.div
              className="w-full border p-2 rounded-3xl"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              <div className="relative w-full">
                <div className="relative w-full rounded-3xl overflow-hidden border shadow-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://ui.shadcn.com/examples/dashboard-dark.png"
                    alt="AtomBerg GoalHub Dashboard Preview"
                    className="w-full h-full object-center rounded-3xl"
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-background to-transparent" />
              </div>
            </motion.div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
