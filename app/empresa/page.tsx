"use client";
import dynamic from "next/dynamic";

const EmpresaLogin = dynamic(() => import("@/src/empresa/EmpresaLogin"), { ssr: false });

export default function EmpresaPage() {
  return <EmpresaLogin />;
}
