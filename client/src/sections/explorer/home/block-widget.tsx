import type { CardProps } from '@mui/material/Card';
import type { IExplorerBlockItem } from 'src/types/blockchain';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Card from '@mui/material/Card';
import { Avatar } from '@mui/material';

import { RouterLink } from 'src/routes/components';

import { fNumber } from 'src/utils/format-number';
import { fCapitalizeString } from 'src/utils/format-blockchain';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = CardProps & {
  block: IExplorerBlockItem
};

export function BlockWidget({ block }: Props) {
  return (
    <Card
      sx={[
        () => ({
          p: 3,
          display: 'flex',
          zIndex: 'unset',
          overflow: 'unset',
          alignItems: 'center',
        }),
      ]}
    >
      <Box sx={{ flexGrow: 1 }}>
        <Box sx={{ gap: 0.5, display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <Iconify
            width={30}
            icon='mdi-cube-outline'
            sx={{ mr: 1.5 }}
          />
          <Box component="span" sx={{ typography: 'h5' }}>
            <Link 
              component={RouterLink}
              href={block.link} 
              underline="hover" 
              color="inherit"
            >
              {fNumber(block.number)}
            </Link>
          </Box>
          <Box component="span" sx={{ typography: 'h6', flexGrow: 1, textAlign: 'right' }}>
            {block.secondsSince}
            <Iconify
              width={15}
              icon='lucide-clock'
              sx={{ ml: 0.5 }}
            />
          </Box>
        </Box>
        {block.producer ? (
          <Link 
            component={RouterLink}
            href={block.producer.link} 
            underline="hover" 
            color="inherit"
          >
            <Box sx={{ gap: 0.5, display: 'flex', alignItems: 'center', typography: 'h6', mb: 1.5 }}>
              <Avatar alt={block.producer.name} src={block.producer.avatar} sx={{ width: 35, height: 35, mr: 1 }} />
              {block.producer.name}
            </Box>
          </Link>
          ) : (
            <Box sx={{ gap: 0.5, display: 'flex', alignItems: 'center', typography: 'h6', mb: 2 }}>
              <Avatar alt="Macro Block" src="#" sx={{ width: 30, height: 30, mr: 1 }} />
              Macro Block
            </Box>
          )
        }

        <Box sx={{ gap: 0.5, display: 'flex', alignItems: 'center' }}>
          <Iconify
            width={30}
            icon='lucide-arrow-left-right'
            sx={{ mr: 1.7 }}
          />

          <Box component="span" sx={{ typography: 'h6' }}>
            {`${block.tx} Txns`}
          </Box>
          <Box component="span" sx={{ typography: 'h6', flexGrow: 1, textAlign: 'right' }}>
            {`${fCapitalizeString(block.type)} Block`}
            <Iconify
              width={18}
              icon='lucide-boxes'
              sx={{ ml: 0.5 }}
            />
          </Box>
        </Box>
      </Box>
    </Card>
  );
}
