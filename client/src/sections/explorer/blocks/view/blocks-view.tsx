import type { IBlockItem, IExplorerBlockItem } from 'src/types/blockchain';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { fSecondsSince } from 'src/utils/format-time';
import { fBlockData } from 'src/utils/format-blockchain';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';
import { useGetLatestBlocks } from 'src/actions/blockchain';

import { getBlockPlaceholderCards } from 'src/sections/overview/e-commerce/blockchain-realtime-columns';

import { ExplorerSearch } from '../../explorer-search';
import { BlockWidget } from '../../../overview/e-commerce/block-widget';

// ----------------------------------------------------------------------

export function BlocksView() {
  const { latestBlocks } = useGetLatestBlocks();
  const [blocks, setBlocks] = useState<IExplorerBlockItem[]>([]);

  useEffect(() => {
    const initialBlocks = latestBlocks.slice(0, 24).map((block: IBlockItem) => fBlockData(block));
    setBlocks(initialBlocks);
  }, [latestBlocks]);

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

          return updatedBlocks.slice(0, 24  );
        });
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
        <Typography title={`Blocks - ${CONFIG.appName} Explorer`} variant="h2" component="h1" sx={{ mb: 1 }}>
        {`Blocks - ${CONFIG.appName} Explorer`}
        </Typography>
        <Typography
          sx={{ color: 'text.secondary' }}
        >🎉 Explore detailed Nimiq blockchain block information with NimiqCafe. 🎉</Typography>
      </Box>

      <ExplorerSearch
        placeholder="Search by block number or block hash"
        sx={{ mb: 3 }}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 3,
        }}
      >
        {blocks.length > 0 ? blocks
          .map((block) => (
            <BlockWidget
              key={block.number}
              block={block}
            />
          )) : getBlockPlaceholderCards(24)}
      </Box>
    </DashboardContent>
  );
}
