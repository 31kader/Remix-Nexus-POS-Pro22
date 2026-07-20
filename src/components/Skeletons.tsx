import React from 'react';
import { Card } from './ui';
import { Skeleton } from './ui/Skeleton';

export function StatCardSkeleton() {
  return (
    <Card className="p-6 sm:p-8 flex items-center gap-6 sm:gap-8 bg-white/5 border-white/5 rounded-[2.5rem]">
      <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl shrink-0 bg-white/10" />
      <div className="min-w-0 space-y-3 flex-1">
        <Skeleton className="h-3 w-24 bg-white/5" />
        <Skeleton className="h-8 w-32 bg-white/10" />
        <Skeleton className="h-4 w-20 bg-white/5" />
      </div>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-10 animate-in fade-in duration-700 p-2">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <Card className="p-8 space-y-6 bg-white/5 border-white/5 rounded-[3rem]">
          <Skeleton className="h-4 w-64 bg-white/5" />
          <Skeleton className="h-[350px] w-full rounded-[2rem] bg-white/10" />
        </Card>

        <Card className="p-8 space-y-8 bg-white/5 border-white/5 rounded-[3rem]">
          <Skeleton className="h-4 w-48 bg-white/5" />
          <div className="space-y-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-xl bg-white/10" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40 bg-white/10" />
                    <Skeleton className="h-3 w-24 bg-white/5" />
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <Skeleton className="h-5 w-20 ml-auto bg-white/10" />
                  <Skeleton className="h-3 w-16 ml-auto bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function InventorySkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700 p-2">
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex-1 w-full md:max-w-xl">
          <Skeleton className="h-16 w-full rounded-3xl bg-white/5 border border-white/10" />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <Skeleton className="h-16 w-32 rounded-2xl bg-white/5 border border-white/10" />
          <Skeleton className="h-16 w-40 rounded-2xl bg-indigo-600/20 border border-indigo-500/20" />
        </div>
      </div>

      <Card className="overflow-hidden bg-white/5 border-white/5 rounded-[3rem]">
        <div className="p-6 border-b border-white/5 flex gap-4 bg-black/20">
          <Skeleton className="h-10 w-32 rounded-xl bg-white/10" />
          <Skeleton className="h-10 w-32 rounded-xl bg-white/5" />
          <Skeleton className="h-10 w-32 rounded-xl bg-white/5" />
        </div>
        <div className="p-8 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-6 p-6 bg-white/5 rounded-[2rem] border border-white/5">
              <Skeleton className="w-16 h-16 rounded-2xl shrink-0 bg-white/10" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-5 w-64 bg-white/10" />
                <Skeleton className="h-3 w-40 bg-white/5" />
              </div>
              <Skeleton className="h-6 w-24 hidden md:block bg-white/10" />
              <Skeleton className="h-6 w-32 hidden md:block bg-white/10" />
              <Skeleton className="h-12 w-48 rounded-2xl bg-white/5 border border-white/5" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function CheckoutSkeleton() {
    return (
        <div className="flex flex-col h-full animate-in fade-in duration-700 p-2">
            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-4 gap-8 p-6">
                <div className="lg:col-span-3 space-y-8">
                    <div className="flex gap-4">
                        <Skeleton className="h-16 flex-1 rounded-[1.5rem] bg-white/5 border border-white/10" />
                        <Skeleton className="h-16 w-16 rounded-2xl bg-white/5 border border-white/10" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-6">
                        {[...Array(10)].map((_, i) => (
                            <Card key={i} className="p-6 space-y-4 bg-white/5 border-white/5 rounded-[2rem]">
                                <Skeleton className="aspect-square w-full rounded-[1.5rem] bg-white/10" />
                                <Skeleton className="h-4 w-3/4 bg-white/10" />
                                <Skeleton className="h-6 w-1/2 bg-indigo-500/20" />
                            </Card>
                        ))}
                    </div>
                </div>
                <div className="space-y-8">
                     <Card className="p-8 space-y-8 flex flex-col h-full bg-white/5 border-white/5 rounded-[3rem]">
                        <Skeleton className="h-6 w-full bg-white/10" />
                        <div className="flex-1 space-y-6">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex justify-between items-center bg-black/20 p-4 rounded-2xl border border-white/5">
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32 bg-white/10" />
                                        <Skeleton className="h-3 w-20 bg-white/5" />
                                    </div>
                                    <Skeleton className="h-8 w-16 bg-white/10" />
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-white/5 pt-8 space-y-6">
                            <div className="flex justify-between">
                                <Skeleton className="h-4 w-20 bg-white/5" />
                                <Skeleton className="h-4 w-24 bg-white/10" />
                            </div>
                            <div className="flex justify-between">
                                <Skeleton className="h-6 w-24 bg-white/10" />
                                <Skeleton className="h-10 w-40 bg-emerald-500/20" />
                            </div>
                            <Skeleton className="h-16 w-full rounded-[1.75rem] bg-emerald-600/20 border border-emerald-500/20" />
                        </div>
                     </Card>
                </div>
            </div>
        </div>
    )
}
