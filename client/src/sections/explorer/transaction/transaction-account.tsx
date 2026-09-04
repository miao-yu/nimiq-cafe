import type { CardProps } from '@mui/material/Card';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Avatar from '@mui/material/Avatar';
import { CardHeader } from '@mui/material';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import CopyToClipboard from 'src/components/utils/copy-to-clipboard';



// ----------------------------------------------------------------------

type Props = CardProps & {
  title: string;
  name: string;
  address: string;
  avatar: string;
  link: string;
};

export function TransactionAccount({ title, name, address, avatar, link, sx, ...other }: Props) {
  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} />
      <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
        <Link 
          component={RouterLink}
          href={link} 
          underline="hover" 
          color="inherit"
        >
          <Avatar src={avatar} alt={address} sx={{ width: 150, height: 150 }}>
            {name}
          </Avatar>
        </Link>

        <Typography title={address} variant="h4" noWrap sx={{ mt: 0.5, mb: 0.5 }}>
          <Link 
            component={RouterLink}
            href={link} 
            underline="hover" 
            color="inherit"
          >
            {name}
          </Link>
          <Box component="span">
            <CopyToClipboard title={`${title} Address`} text={address} />
          </Box>
        </Typography>
      </Box>
    </Card>
  );
}
