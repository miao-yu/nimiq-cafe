import type { CardProps } from '@mui/material/Card';
import type { IExplorerBlockItem } from 'src/types/blockchain';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Card from '@mui/material/Card';
import { Avatar , useTheme, useMediaQuery } from '@mui/material';

import { RouterLink } from 'src/routes/components';

import { fNumber } from 'src/utils/format-number';
import { fShortenName, fShortenString, fIdentifyHashOrAddress } from 'src/utils/format-blockchain';

import { Iconify } from 'src/components/iconify';


// ----------------------------------------------------------------------

type Props = CardProps & {
  block: IExplorerBlockItem
};

export function BlockWidget({ block }: Props) {
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
            icon='mdi-cube-outline'
            sx={{ mr: 1 }}
          />
          <Box component="span" sx={{ typography: 'subtitle1' }}>
            <Link 
              component={RouterLink}
              href={block.link} 
              underline="hover" 
              color="inherit"
            >
              {fNumber(block.number)}
            </Link>
          </Box>
        </Box>
        {block.producer ? (
          <Link 
            component={RouterLink}
            href={block.producer.link} 
            underline="hover" 
            color="inherit"
          >
            <Box sx={{ gap: 0.5, display: 'flex', alignItems: 'center', typography: 'subtitle1', mb: 2 }}>
              <Avatar alt={block.producer.name} src={block.producer.avatar} sx={{ width: 25, height: 25, mr: 1 }} />
              {fIdentifyHashOrAddress(block.producer.name) ? fShortenString(block.producer.name, maxLength) : fShortenName(block.producer.name, maxLength)}
            </Box>
          </Link>
          ) : (
            <Box sx={{ gap: 0.5, display: 'flex', alignItems: 'center', typography: 'subtitle1', mb: 2 }}>
              <Avatar alt="Macro Block" src="#" sx={{ width: 25, height: 25, mr: 1 }} />
              Macro
            </Box>
          )
        }
        <Box sx={{ gap: 0.5, display: 'flex', alignItems: 'center' }}>
          <Iconify
            width={25}
            icon='lucide-arrow-left-right'
            sx={{ mr: 1 }}
          />

          <Box component="span" sx={{ typography: 'subtitle1' }}>
            {`${block.tx} Txns`}
          </Box>
        </Box>
      </Box>
    </Card>
  );
}
