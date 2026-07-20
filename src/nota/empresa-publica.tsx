import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/logic/firebase/config/app';
import { makeStyles, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress } from './mui-compat';

const useStyles = makeStyles((theme) => ({
  page: {
    minHeight: '100vh',
    padding: theme.spacing(3),
    background: '#f8fafc',
  },
  container: {
    maxWidth: 1000,
    margin: '0 auto',
  },
  tableContainer: {
    marginTop: theme.spacing(2),
    overflowX: 'auto',
  },
  paper: {
    padding: theme.spacing(2),
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 6px 18px rgba(16, 24, 40, 0.06)',
  },
}));

const EmpresaPublicaPage: React.FC = () => {
  const classes = useStyles();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!db) {
        setEntries([]);
        setLoading(false);
        return;
      }
      try {
        const colRef = collection(db, 'PlanilhasFinalizadas');
        const snapshot = await getDocs(colRef);
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setEntries(docs as any[]);
      } catch (err) {
        console.warn('Erro carregando finalizadas', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className={classes.page}>
      <Head>
        <title>Empresas Públicas - Planilhas Finalizadas</title>
      </Head>
      <div className={classes.container}>
        <Typography variant="h4" gutterBottom>
          Planilhas Finalizadas (Empresa Pública)
        </Typography>
        <Typography variant="body1" paragraph>
          Lista de planilhas concluídas com o código de acesso associado ao
          modelo/empresa. Use este código para consulta ou distribuição externa.
        </Typography>
        {loading ? (
          <CircularProgress />
        ) : (
          <Paper className={classes.paper}>
            <div className={classes.tableContainer}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Código</TableCell>
                    <TableCell>Modelo</TableCell>
                    <TableCell>Salvo por</TableCell>
                    <TableCell>Data</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{e.nome || e.modeloNome}</TableCell>
                      <TableCell>{e.modeloCodigo || '-'}</TableCell>
                      <TableCell>{e.modeloNome}</TableCell>
                      <TableCell>{e.salvoPor}</TableCell>
                      <TableCell>{e.salvoEm ? new Date(e.salvoEm).toLocaleString() : ''}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Paper>
        )}
      </div>
    </div>
  );
};

export default EmpresaPublicaPage;
