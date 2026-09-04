import type { CardProps } from '@mui/material/Card';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Avatar from '@mui/material/Avatar';
import { CardHeader } from '@mui/material';
import Typography from '@mui/material/Typography';

import CopyToClipboard from 'src/components/utils/copy-to-clipboard';



// ----------------------------------------------------------------------

type Props = CardProps & {
  name: string;
  address: string;
  avatar: string;
  link: string;
};

export function WalletAccount({ name, address, avatar, link, sx, ...other }: Props) {
  return (
    <Card sx={sx} {...other}>
      <CardHeader />
      <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
        <Link 
          href={link} 
          underline="hover" 
          color="inherit"
        >
          <Avatar src={avatar} alt={address} sx={{ width: 150, height: 150 }}>
            {name}
          </Avatar>
        </Link>

        <Link 
          href={link} 
          underline="hover" 
          color="inherit"
        >
          <Typography title={address} variant="h3" noWrap sx={{ mt: 0.5, mb: 0.5 }}>
            {name}
          </Typography>
        </Link>

        <Box component="span">
          <CopyToClipboard title='Wallet Address' text={address} />
        </Box>

      </Box>
    </Card>
  );
}
