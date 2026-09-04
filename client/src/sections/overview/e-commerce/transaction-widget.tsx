import type { CardProps } from '@mui/material/Card';
import type { IExplorerTransactionItem } from 'src/types/blockchain';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Card from '@mui/material/Card';
import { Avatar , useTheme, useMediaQuery } from '@mui/material';

import { RouterLink } from 'src/routes/components';

import { fShortenNumber } from 'src/utils/format-number';
import { fShortenString } from 'src/utils/format-blockchain';

import { Iconify } from 'src/components/iconify';


// ----------------------------------------------------------------------

type Props = CardProps & {
  tx: IExplorerTransactionItem
};

export function TransactionWidget({ tx }: Props) {
  const theme = useTheme();

  // Use breakpoints to detect screen sizes
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm')); // Small screens
  const isSmallMediumScreen = useMediaQuery(theme.breakpoints.between('sm', 'md')); // Small Medium  screens
  const isMediumLargeScreen = useMediaQuery(theme.breakpoints.between('md', 'lg')); // Large Large screens
  const isLargeExtraScreen = useMediaQuery(theme.breakpoints.between('lg', 'xl')); // Large Extra screens
  const isExtraLargeScreen = useMediaQuery(theme.breakpoints.up('xl')); // Extra Large screens

  // Dynamically set max length
  const maxLength = isSmallScreen && 6 || isSmallMediumScreen && 8 || isMediumLargeScreen && 6 || isLargeExtraScreen && 6 || isExtraLargeScreen && 12 || 6;

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
        <Box sx={{ gap: 0.5, display: 'flex', alignItems: 'center', mb: 2 }}>
          <Iconify
            width={25}
            icon='mdi-pound'
            sx={{ mr: 1 }}
          />
          <Box component="span" sx={{ typography: 'h6' }}>
            <Link 
              component={RouterLink}
              href={tx.link} 
              underline="hover" 
              color="inherit"
            >
              {fShortenString(tx.hash, maxLength)}
            </Link>
          </Box>
        </Box>

        <Box sx={{ gap: 0.5, display: 'flex', alignItems: 'center', typography: 'subtitle2', mb: 2 }}>
          <Link 
            component={RouterLink}
            href={tx.fromLink} 
            underline="hover" 
            color="inherit"
          >
            <Box sx={{ gap: 0.5, display: 'flex', alignItems: 'center' }}>
              <Avatar alt={tx.fromName} src={tx.fromAvatar} sx={{ width: 25, height: 25, mr: 1 }} />
            </Box>
          </Link>

          <Iconify 
            width={25} 
            icon="mdi-arrow-right" 
            sx={{ mr: 1 }} 
          />

          <Link 
            component={RouterLink}
            href={tx.toLink} 
            underline="hover" 
            color="inherit"
          >
            <Box sx={{ gap: 0.5, display: 'flex', alignItems: 'center' }}>
              <Avatar alt={tx.toName} src={tx.toAvatar} sx={{ width: 25, height: 25, mr: 1 }} />
            </Box>
          </Link>
        </Box>

        <Box sx={{ gap: 0.5, display: 'flex', alignItems: 'center' }}>
          <Iconify
            width={25}
            icon='lucide-arrow-left-right'
            sx={{ mr: 1 }}
          />

          <Box component="span" sx={{ typography: 'subtitle2' }}>
            {`${fShortenNumber(tx.value)} NIM`}
          </Box>
        </Box>
      </Box>
    </Card>
  );
}
