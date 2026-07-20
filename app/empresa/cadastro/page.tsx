"use client";
import dynamic from "next/dynamic";

const EmpresaCadastro = dynamic(() => import("@/src/empresa/EmpresaCadastro"), { ssr: false });

export default function EmpresaCadastroPage() {
  return <EmpresaCadastro />;
}
