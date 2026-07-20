"use client";
import dynamic from "next/dynamic";

const OCRInteligente = dynamic(() => import("@/src/nota/index"), { ssr: false });

export default function NotaPage() {
  return <OCRInteligente />;
}
