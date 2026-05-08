import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();

  // getUser() validates the token server-side; getSession() only reads cookies
  // and will not detect a stale/invalid refresh token until the server rejects it.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    // Stale or invalid session — clear cookies so the error doesn't recur
    await supabase.auth.signOut();
  } else if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow flex items-center justify-center">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
              LifeOS: The Personal Growth Engine.
            </h1>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
              Industrial-grade habit tracking, gamified XP, and your AI Oracle
              companion.
            </p>
            <div className="space-x-4">
              <Button asChild>
                <Link href="/signup">Initialize System</Link>
              </Button>
              <Link
                href="/login"
                className="inline-flex h-10 items-center justify-center rounded-md border border-gray-200 bg-white px-8 text-sm font-medium shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-800 dark:hover:text-gray-50 dark:focus-visible:ring-gray-300"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
