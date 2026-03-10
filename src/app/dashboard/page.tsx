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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-border/50 bg-card/60 p-10 shadow-xl backdrop-blur">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">LifeOS Control</p>
            <h1 className="text-3xl font-semibold">System Online</h1>
          </div>
          <form action="/auth/signout" method="post">
            <Button variant="outline" formAction="/auth/signout">Sign out</Button>
          </form>
        </div>
        <div className="rounded-xl border border-border/40 bg-muted/40 p-6">
          <p className="text-lg text-muted-foreground">Welcome,</p>
          <p className="text-2xl font-medium">{displayName}</p>
        </div>
      </div>
    </div>
  );
}
