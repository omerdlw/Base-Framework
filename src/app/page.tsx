"use client";

import type { JSX } from "react";
import Link from "next/link";
import { usePage } from "@omerdlw/base-framework/kernel";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { useAuth, createSignInSurfaceEntry } from "@/features/auth";
import { Button, Badge, Icon } from "@/features/shell";
import { project } from "@config";

export default function HomePage(): JSX.Element {
  usePage({
    title: project.name,
  });

  const { isAuthenticated, user, signOut } = useAuth();
  const { openSurface } = useDockActions();
  const toast = useToast();

  const handleSignIn = () => {
    void openSurface(createSignInSurfaceEntry({ next: "/" }));
  };

  const handleTestToast = () => {
    toast("Welcome to Base Framework! Interactive notifications are ready.");
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 md:p-12 pb-32">
      <div className="w-full max-w-4xl flex flex-col items-center text-center space-y-8">
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <Badge className="px-3 py-1 text-xs font-mono uppercase tracking-wider text-white/70 border border-white/10 bg-white/5 backdrop-blur-md">
            Template Ready • Next.js 16 • React 19
          </Badge>
        </div>

        {/* Hero Section */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white font-zuume">
            {project.name}
          </h1>
          <p className="max-w-2xl text-base sm:text-lg text-white/60 leading-relaxed font-sans mx-auto">
            {project.description}
          </p>
        </div>

        {/* Quick Actions Card */}
        <div className="w-full max-w-xl p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-full bg-white/10 center text-white/80">
                <Icon
                  icon={
                    isAuthenticated
                      ? "solar:user-check-bold"
                      : "solar:user-circle-bold"
                  }
                  size={22}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  {isAuthenticated
                    ? (user?.email ?? "Authenticated User")
                    : "Guest User"}
                </p>
                <p className="text-xs text-white/40">
                  {isAuthenticated
                    ? "Supabase session active"
                    : "Passwordless OTP & Passkeys ready"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <Link href="/account">
                    <Button className="text-xs px-3 py-1.5 h-8">
                      <Icon icon="solar:user-bold" className="mr-1.5" size={16} />
                      Account
                    </Button>
                  </Link>
                  <Button
                    onClick={() => signOut()}
                    className="text-xs px-3 py-1.5 h-8 border border-white/10 hover:bg-white/10"
                  >
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Button onClick={handleSignIn} className="text-xs px-4 py-2 h-9">
                  <Icon icon="solar:login-2-bold" className="mr-1.5" size={16} />
                  Sign In
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-white/50">Test UI Modules:</span>
            <Button
              onClick={handleTestToast}
              className="text-xs px-3 py-1.5 h-8 border border-white/10 hover:bg-white/10 text-white/80"
            >
              <Icon icon="solar:bell-bold" className="mr-1.5" size={16} />
              Trigger Toast
            </Button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
          <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-md">
            <div className="w-8 h-8 rounded-lg bg-white/5 center text-white mb-3">
              <Icon icon="solar:box-minimalistic-bold" size={18} />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">
              Microkernel Engine
            </h3>
            <p className="text-xs text-white/50 leading-normal">
              Powered by @omerdlw/base-framework. Dock, modals, toasts and
              ambient modules completely decoupled.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-md">
            <div className="w-8 h-8 rounded-lg bg-white/5 center text-white mb-3">
              <Icon icon="solar:shield-keyhole-bold" size={18} />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">
              Passwordless Auth
            </h3>
            <p className="text-xs text-white/50 leading-normal">
              Supabase Auth SSR with Email OTP, WebAuthn Passkeys and OAuth
              sessions pre-configured.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-md">
            <div className="w-8 h-8 rounded-lg bg-white/5 center text-white mb-3">
              <Icon icon="solar:rocket-2-bold" size={18} />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">
              1-Command Scaffold
            </h3>
            <p className="text-xs text-white/50 leading-normal">
              Run <code className="text-white/80 font-mono">npm run project:scaffold</code>{" "}
              to rebrand into a new product in seconds.
            </p>
          </div>
        </div>

        {/* Quickstart Command Banner */}
        <div className="w-full max-w-xl py-3 px-4 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-white/70 flex items-center justify-between">
          <span className="text-white/40 select-none">$</span>
          <span className="flex-1 text-center text-white/90">
            npm run project:scaffold &quot;My SaaS&quot; mysaas.com
          </span>
          <span className="text-white/30 text-[10px] uppercase tracking-wider">
            Scaffold
          </span>
        </div>
      </div>
    </main>
  );
}
