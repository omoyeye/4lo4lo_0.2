"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

function LoginContent() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/auth");
  }, [router]);
  return null;
}



﻿export default function Page() {
  return <LoginContent />;
}

