"use client";

import { LogOut, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/AuthProvider";

interface LogoutButtonProps {
  className?: string;
}

export function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();
  const { signOut, session } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!session) return null;

  const handleLogout = async () => {
    setLoading(true);
    const { error } = await signOut();
    if (!error) {
      router.replace("/login");
    }
    setLoading(false);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={handleLogout}
      disabled={loading}
      type="button"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      Logout
    </Button>
  );
}
