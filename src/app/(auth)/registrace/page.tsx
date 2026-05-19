"use client";

import dynamic from "next/dynamic";

const RegistraceForm = dynamic(() => import("./form"), { ssr: false });

export default function RegistracePage() {
  return <RegistraceForm />;
}
