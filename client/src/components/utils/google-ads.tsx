import { useRef, useEffect } from "react";

import { usePathname } from "src/routes/hooks";

interface GoogleAdsProps {
	excludePaths?: string[];
}

const GoogleAds = ({ excludePaths = [] }: GoogleAdsProps) => {
	const adRef = useRef<HTMLDivElement>(null);
	const pathname = usePathname();

	// Check if current path should be excluded
	const shouldExclude = excludePaths.some((path) => pathname.startsWith(path));

	useEffect(() => {
		// Don't load ads if path is excluded. Returns undefined rather than
		// nothing because the other exit returns a cleanup function.
		if (shouldExclude) {
			return undefined;
		}

		const script = document.createElement("script");
		script.src =
			"https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1576826465581832";
		script.async = true;
		script.crossOrigin = "anonymous";
		document.head.appendChild(script);

		const timeout = setTimeout(() => {
			try {
				// Push adsbygoogle to render the ad
				if ((window as any).adsbygoogle && adRef.current) {
					(window as any).adsbygoogle = (window as any).adsbygoogle || [];
					(window as any).adsbygoogle.push({});
				}
			} catch (e) {
				console.error("Adsbygoogle error:", e);
			}
		}, 500);

		return () => {
			clearTimeout(timeout);
		};
	}, [shouldExclude]);

	// Don't render anything if path is excluded
	if (shouldExclude) {
		return null;
	}

	return (
		<ins
			className="adsbygoogle"
			style={{ display: "block" }}
			data-ad-client="ca-pub-1576826465581832"
			data-ad-slot="3575558753"
			data-ad-format="auto"
			data-full-width-responsive="true"
			ref={adRef as any}
		/>
	);
};

export default GoogleAds;
