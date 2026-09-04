import type { IBlockItem, ITransactionItem, IExplorerBlockItem, IExplorerTransactionItem } from 'src/types/blockchain';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fSecondsSince } from 'src/utils/format-time';
import { fBlockData, fTransactionData } from 'src/utils/format-blockchain';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';
import { useGetLatestBlocks, useGetLatestTransactions } from 'src/actions/blockchain';

import { getBlockPlaceholderCards, getTransactionPlaceholderCards } from 'src/sections/overview/e-commerce/blockchain-realtime-columns';

import { ExplorerSearch } from '../../explorer-search';
import { BlockWidget } from '../../../overview/e-commerce/block-widget';
import { TransactionWidget } from '../../../overview/e-commerce/transaction-widget';

// ----------------------------------------------------------------------

export function ExplorerView() {
  const { latestBlocks } = useGetLatestBlocks();
  const { latestTransactions } = useGetLatestTransactions();
  const [blocks, setBlocks] = useState<IExplorerBlockItem[]>([]);
  const [transactions, setTransactions] = useState<IExplorerTransactionItem[]>([]);

  useEffect(() => {
    const initialBlocks = latestBlocks.slice(0, 10).map((block: IBlockItem) => fBlockData(block));
    setBlocks(initialBlocks);
  }, [latestBlocks]);

  useEffect(() => {
    const initialTransactions = latestTransactions.slice(0, 10).map((tx: ITransactionItem) => fTransactionData(tx));
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
        const newBlock = fBlockData(blockData);

        // Update the blocks array
        setBlocks((prevBlocks) => {
          // Update the `secondsSince` for existing blocks
          const updatedExistingBlocks = prevBlocks.map((updatedBlock) => ({
            ...updatedBlock,
            secondsSince: fSecondsSince(updatedBlock.timestamp),
          }));

          // Add the new block to the top and keep only the latest 18 blocks
          const updatedBlocks = [newBlock, ...updatedExistingBlocks];

          return updatedBlocks.slice(0, 10);
        });

        if (blockData.transactions.length > 0) {
          const newTransactions = blockData.transactions.map((tx: ITransactionItem) => fTransactionData(tx));

          setTransactions((prevTransactions) => {
            const updatedExistingTransactions = prevTransactions.map((updatedTransaction) => ({
              ...updatedTransaction,
              secondsSince: fSecondsSince(updatedTransaction.timestamp),
            }));

            const updatedTransactions = [...newTransactions, ...updatedExistingTransactions];

            return updatedTransactions.slice(0, 10);
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
        <Typography title={`Welcome to ${CONFIG.appName} Explorer 👋`} variant="h2" component="h1" sx={{ mb: 1 }}>
        {`Welcome to ${CONFIG.appName} Explorer`} 👋
        </Typography>
        <Typography
          sx={{ color: 'text.secondary' }}
        >🎉 Explore the Nimiq blockchain as it happens with NimiqCafe. 🎉</Typography>
      </Box>

      <ExplorerSearch sx={{ mb: 3 }} />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)' },
          gap: 3,
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' },
            gap: 3,
          }}
        >
          <Card>
            <CardHeader title={<Typography variant="h3">Latest Blocks</Typography>} sx={{ mb: 1 }} />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)' },
                gap: 3,
              }}
            >
              {blocks.length > 0 ? blocks
                .map((block) => (
                  <BlockWidget
                    key={block.number}
                    block={block}
                  />
                )) : getBlockPlaceholderCards(10)}
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(1, 1fr)' },
                gap: 3,
              }}
            >
              <Typography
                 variant="h4"
                 textAlign={{ xs: 'center' }}
                 sx={{ p: 2 }}
              >
              <Link 
                component={RouterLink}
                href={paths.blocks}
                underline="hover" 
                color="inherit"
              >
                View all blocks
              </Link>
              </Typography>
            </Box>
          </Card>

          <Card>
            <CardHeader title={<Typography variant="h3">Latest Transactions</Typography>} sx={{ mb: 1 }} />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)' },
                gap: 3,
              }}
            >
              {transactions.length > 0 ? transactions
                .map((transaction) => (
                  <TransactionWidget
                    key={transaction.hash}
                    tx={transaction}
                  />
                )) : getTransactionPlaceholderCards(10)}
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(1, 1fr)' },
                gap: 3,
              }}
            >
              <Typography
                 variant="h4"
                 textAlign={{ xs: 'center' }}
                 sx={{ p: 2 }}
              >
              <Link 
                component={RouterLink}
                href={paths.transactions}
                underline="hover" 
                color="inherit"
              >
                View all transactions
              </Link>
              </Typography>
            </Box>
          </Card>
        </Box>
      </Box>
    </DashboardContent>
  );
}
