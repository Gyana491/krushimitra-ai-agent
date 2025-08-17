"use client"

import React, { useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useLocationDetection } from "@/hooks/use-location"

// Simple reusable button to auto-detect user location.
// On success it logs latitude, longitude, and human readable display name.
// You can extend this later to propagate the detected location up via props.

interface AutoDetectLocationButtonProps {
	onDetected?: (data: { display_name: string; lat: string; lon: string }) => void
	className?: string
}

export const AutoDetectLocationButton: React.FC<AutoDetectLocationButtonProps> = ({
	onDetected,
	className,
}) => {
	const { detectLocation, isDetecting, error } = useLocationDetection()

	const handleClick = useCallback(async () => {
		const loc = await detectLocation()
		if (loc) {
			console.log("Detected location:", loc.display_name)
			console.log("Latitude:", loc.lat)
			console.log("Longitude:", loc.lon)
			onDetected?.(loc)
		}
	}, [detectLocation, onDetected])

	return (
		<div className={className}>
			<Button type="button" variant="secondary" disabled={isDetecting} onClick={handleClick}>
				{isDetecting ? "Detecting..." : "Auto Detect Location"}
			</Button>
			{error && (
				<p className="mt-2 text-xs text-red-600" role="alert">
					{error}
				</p>
			)}
		</div>
	)
}

export default AutoDetectLocationButton

