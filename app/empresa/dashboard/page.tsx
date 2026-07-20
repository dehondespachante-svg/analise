"use client";
import dynamic from "next/dynamic";

const EmpresaDashboard = dynamic(() => import("@/src/empresa/EmpresaDashboard"), { ssr: false });

export default function EmpresaDashboardPage() {
  return <EmpresaDashboard />;
}
