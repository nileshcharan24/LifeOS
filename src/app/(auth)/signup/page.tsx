"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpAction } from "@/app/(auth)/actions";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-xl border-border/60 shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl">Initialize LifeOS</CardTitle>
          <CardDescription>
            Create your operator profile to sync with the Oracle and XP systems.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              setError(null);
              const formData = new FormData(e.currentTarget);
              const email = formData.get("email") as string;
              const password = formData.get("password") as string;
              const full_name = formData.get("full-name") as string;
              const usernameInput = formData.get("username") as string;
              const username = usernameInput || email.split("@")[0];
              const result = await signUpAction({ email, password, full_name, username });
              if (result?.error) {
                setError(result.error);
                setLoading(false);
                return;
              }

              // Success: route to dashboard
              router.push("/dashboard");
            }}
            className="grid gap-4"
          >
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Signup failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <Label htmlFor="full-name">Full Name</Label>
              <Input
                id="full-name"
                name="full-name"
                type="text"
                placeholder="John Doe"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="john.doe"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={6}
                required
              />
            </div>
            <Button
              type="submit"
              className={cn("w-full h-11 text-base", loading && "opacity-80")}
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create account"}
            </Button>
            <div className="flex items-center justify-between pt-1 text-sm text-muted-foreground">
              <span>Already have an account?</span>
              <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
