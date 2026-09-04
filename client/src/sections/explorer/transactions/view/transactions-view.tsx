import type { ITransactionItem, IExplorerTransactionItem } from 'src/types/blockchain';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { fSecondsSince } from 'src/utils/format-time';
import { fTransactionData } from 'src/utils/format-blockchain';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';
import { useGetLatestTransactions } from 'src/actions/blockchain';

import { getTransactionPlaceholderCards } from 'src/sections/overview/e-commerce/blockchain-realtime-columns';

import { ExplorerSearch } from '../../explorer-search';
import { TransactionWidget } from '../../../overview/e-commerce/transaction-widget';

// ----------------------------------------------------------------------

export function TransactionsView() {
  const { latestTransactions } = useGetLatestTransactions();
  const [transactions, setTransactions] = useState<IExplorerTransactionItem[]>([]);

  useEffect(() => {
    const initialTransactions = latestTransactions.slice(0, 24).map((tx: ITransactionItem) => fTransactionData(tx));
    setTransactions(initialTransactions);
  }, [latestTransactions]);

  // Listen to WebSocket for new blocks
  useEffect(() => {
    const ws = new WebSocket(CONFIG.wsServerUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.event === 'newBlock') { 
        const blockData = message.data;

        if (blockData.transactions.length > 0) {
          const newTransactions = blockData.transactions.map((tx: ITransactionItem) => fTransactionData(tx));

          setTransactions((prevTransactions) => {
            const updatedExistingTransactions = prevTransactions.map((updatedTransaction) => ({
              ...updatedTransaction,
              secondsSince: fSecondsSince(updatedTransaction.timestamp),
            }));

            const updatedTransactions = [...newTransactions, ...updatedExistingTransactions];

            return updatedTransactions.slice(0, 24);
          });
        }
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <DashboardContent maxWidth="xl">
      <Box sx={{ mb: 2 }}>
        <Typography title={`Transactions - ${CONFIG.appName} Explorer`} variant="h2" component="h1" sx={{ mb: 1 }}>
        {`Transactions - ${CONFIG.appName} Explorer`}
        </Typography>
        <Typography
          sx={{ color: 'text.secondary' }}
        >🎉 Explore detailed Nimiq blockchain transaction information with NimiqCafe. 🎉</Typography>
      </Box>

      <ExplorerSearch
        placeholder="Search by transaction hash"
        sx={{ mb: 3 }}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 3,
        }}
      >
        {transactions.length > 0 ? transactions
          .map((transaction) => (
            <TransactionWidget
              key={transaction.hash}
              tx={transaction}
            />
          )) : getTransactionPlaceholderCards(24)}
      </Box>
    </DashboardContent>
  );
}
