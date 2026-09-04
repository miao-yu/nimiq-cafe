import type { CardProps } from '@mui/material/Card';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import CopyToClipboard from 'src/components/utils/copy-to-clipboard';



// ----------------------------------------------------------------------

type Props = CardProps & {
  name: string;
  address?: string;
  avatar?: string;
};

export function CourseMyAccount({ name, address, avatar, sx, ...other }: Props) {
  const renderAvatar = () => (
    <Avatar src={avatar} alt={address} sx={{ width: 96, height: 96 }}>
      {name}
    </Avatar>
  );

  return (
    <Card sx={sx} {...other}>
      <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
        {renderAvatar()}

        <Typography title={address} variant="h4" noWrap sx={{ mt: 0.5, mb: 0.5 }}>
          <Link 
            component={RouterLink}
            href={`/wallet/${address}`} 
            underline="hover" 
            color="inherit"
          >
            {name}
          </Link>
        </Typography>
        <Box component="span">
          <CopyToClipboard title="Address" text={address || name} />
        </Box>
      </Box>
    </Card>
  );
}
