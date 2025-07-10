import { useEffect, useRef } from "react";

interface ProvisionalMarkerProps {
  map: any;
  L: any;
  provisionalGuessLocation?: { lat: number; lng: number } | null;
}

export default function ProvisionalMarker({
  map,
  L,
  provisionalGuessLocation,
}: ProvisionalMarkerProps) {
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !L) return;
    // Remove old provisional marker if it exists
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    if (provisionalGuessLocation) {
      const tempMarker = L.marker(
        [provisionalGuessLocation.lat, provisionalGuessLocation.lng],
        {
          icon: L.divIcon({
            className: "custom-marker provisional-marker",
            html: `<div class=\"w-8 h-8 rounded-full border-4 border-yellow-400 animate-pulse\"></div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          }),
        },
      ).bindTooltip("Confirm your guess", {
        permanent: true,
        direction: "top",
        offset: [0, -12],
        className: "font-semibold provisional-tooltip",
      });
      tempMarker.addTo(map);
      markerRef.current = tempMarker;
    }
    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [map, L, provisionalGuessLocation]);
  return null;
}
