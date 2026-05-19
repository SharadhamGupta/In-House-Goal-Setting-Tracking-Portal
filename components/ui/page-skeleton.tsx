import React from "react";

export default function PageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Page header area skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-1/4 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
        <div className="h-4 w-1/3 bg-slate-100 dark:bg-slate-900 rounded-lg animate-pulse" />
      </div>

      {/* Grid of KPI cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className="p-5 border border-slate-200/60 bg-white rounded-xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-5 w-5 bg-slate-100 dark:bg-slate-900 rounded-full animate-pulse" />
            </div>
            <div className="h-8 w-1/2 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-3.5 w-3/4 bg-slate-100 dark:bg-slate-900 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Large Content Card skeleton */}
      <div className="p-6 border border-slate-200/60 bg-white rounded-xl space-y-6">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div className="h-5 w-1/4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-9 w-24 bg-slate-100 dark:bg-slate-900 rounded-lg animate-pulse" />
        </div>
        <div className="space-y-4">
          <div className="h-10 w-full bg-slate-100 dark:bg-slate-900 rounded animate-pulse" />
          <div className="h-16 w-full bg-slate-50 dark:bg-slate-950/40 rounded-lg animate-pulse" />
          <div className="h-16 w-full bg-slate-50 dark:bg-slate-950/40 rounded-lg animate-pulse" />
          <div className="h-16 w-full bg-slate-50 dark:bg-slate-950/40 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}
