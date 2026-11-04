
"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { useRouter } from "next/navigation";
import { db } from "@/lib/supabase";
import SplashScreen from "@/components/SplashScreen";


export default function Guard({
  children,
}: {
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function check() {
      try {
        const { data, error } =
          await db().auth.getUser();

        if (!active) return;

        if (error || !data.user) {
          router.replace("/login");
          return;
        }

        setReady(true);
      } catch {
        if (active) {
          router.replace("/login");
        }
      }
    }

    void check();

    return () => {
      active = false;
    };
  }, [router]);

  if (!ready) {
    return 
      return <SplashScreen />;
    
  }

  return <>{children}</>;
}
