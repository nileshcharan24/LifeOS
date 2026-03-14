import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName =
    user.user_metadata?.full_name || user.user_metadata?.username || user.email || "User";

  return (
    <div className="flex min-h-screen">
          <aside className="w-64 flex-shrink-0 border-r border-border/40 bg-background/95 p-6">
            <h2 className="text-lg font-semibold tracking-tight">Navigation</h2>
            <div className="mt-4 space-y-2">
              <a href="#" className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50">Dashboard</a>
              <a href="#" className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50">Quests</a>
              <a href="#" className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50">Journal</a>
              <a href="#" className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50">Settings</a>
            </div>
          </aside>
          <main className="flex-1 p-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">LifeOS Control</p>
                <h1 className="text-3xl font-semibold">System Online</h1>
              </div>
              <form action="/auth/signout" method="post">
                <Button variant="outline">Sign out</Button>
              </form>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/40 p-6">
              <p className="text-lg text-muted-foreground">Welcome,</p>
              <p className="text-2xl font-medium">{displayName}</p>
            </div>
          </main>
        </div>
  );
}
