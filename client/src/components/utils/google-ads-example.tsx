import GoogleAdsWrapper from "./google-ads-wrapper";

// Example 1: Basic usage - ads on all pages except specified ones
export const BasicAdsExample = () => (
		<GoogleAdsWrapper
			excludePaths={["/settings", "/auth"]} // Exclude settings and auth pages
		/>
	);

// Example 2: Custom styling
export const StyledAdsExample = () => (
		<GoogleAdsWrapper
			excludePaths={["/settings"]}
			sx={{
				maxWidth: "728px", // Standard banner width
				mx: "auto",
				my: 3,
				px: 2,
			}}
		/>
	);

// Example 3: Multiple ad units with different exclusions
export const MultipleAdsExample = () => (
		<>
			{/* Top banner - exclude settings and auth */}
			<GoogleAdsWrapper excludePaths={["/settings", "/auth"]} sx={{ mb: 2 }} />

			{/* Bottom banner - exclude settings, auth, and FAQ */}
			<GoogleAdsWrapper
				excludePaths={["/settings", "/auth", "/faq"]}
				sx={{ mt: 2 }}
			/>
		</>
	);

// Example 4: Page-specific exclusions
export const PageSpecificAdsExample = () => (
		<GoogleAdsWrapper
			excludePaths={[
				"/settings", // User settings
				"/auth", // Authentication pages
				"/faq", // FAQ page
				"/dashboard", // Dashboard page
			]}
		/>
	);
