import React from 'react';

import { Tooltip, IconButton } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import { toast } from 'src/components/snackbar';

const CopyToClipboard: React.FC<{ title: string, text: string }> = ({ title, text }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast.success(`${title} copied to clipboard!`);
      },
      (err) => {
        console.error('Could not copy text: ', err);
      }
    );
  };

  return (
    <Tooltip title={`Copy ${title} to clipboard`}  sx={{ pt: 0 }}>
      <IconButton onClick={handleCopy}>
        <ContentCopyIcon />
      </IconButton>
    </Tooltip>
  );
};

export default CopyToClipboard;
