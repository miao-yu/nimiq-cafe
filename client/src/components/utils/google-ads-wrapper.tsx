import Box from "@mui/material/Box";

import GoogleAds from "./google-ads";

interface GoogleAdsWrapperProps {
	excludePaths?: string[];
	sx?: any;
}

const GoogleAdsWrapper = ({ excludePaths = [], sx }: GoogleAdsWrapperProps) => (
		<Box
			sx={{
				width: "100%",
				display: "flex",
				justifyContent: "center",
				my: 2,
				...sx,
			}}
		>
			<GoogleAds excludePaths={excludePaths} />
		</Box>
	);

export default GoogleAdsWrapper;
