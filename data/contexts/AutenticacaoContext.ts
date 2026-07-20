import { createContext } from 'react';

interface AutenticacaoContextType {
  usuario?: { email?: string | null; nome?: string | null } | null;
}

const AutenticacaoContext = createContext<AutenticacaoContextType>({});

export default AutenticacaoContext;
