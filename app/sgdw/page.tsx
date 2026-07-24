'use client';

import dynamic from 'next/dynamic';

const SgdwExplorer = dynamic(
  () => import('@/src/components/analise/sgdw-explorer'),
  { ssr: false }
);

const RELAY_CONFIG = { url: '', token: '' } as const;

export default function SgdwPage() {
  return <SgdwExplorer config={RELAY_CONFIG} />;
}
