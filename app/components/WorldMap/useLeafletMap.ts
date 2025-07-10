import { useState, useEffect } from "react";

interface UseLeafletMapProps {
  mapRef: React.RefObject<HTMLDivElement>;
  isClient: boolean;
  onProvisionalGuess?: (lat: number, lng: number) => void;
  isGuessDisabled?: boolean;
}

// Custom hook for Leaflet map logic
export default function useLeafletMap({
  mapRef,
  isClient,
  onProvisionalGuess,
  isGuessDisabled,
}: UseLeafletMapProps) {
  const [map, setMap] = useState<any>(null);
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    if (!isClient || !mapRef.current || map) return;

    import("leaflet").then((leaflet) => {
      const leafletLib = leaflet.default;
      setL(leafletLib);

      const leafletMap = leafletLib.map(mapRef.current!, {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 18,
        worldCopyJump: true,
        maxBounds: [
          [-90, -180],
          [90, 180],
        ],
        maxBoundsViscosity: 1.0,
        tapTolerance: 15,
        touchZoom: true,
        bounceAtZoomLimits: false,
        zoomSnap: 0.5,
        zoomDelta: 0.5,
      });

      leafletLib
        .tileLayer(
          "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png",
          {
            attribution: "© OpenStreetMap, © CARTO",
            noWrap: true,
            bounds: [
              [-90, -180],
              [90, 180],
            ],
          },
        )
        .addTo(leafletMap);

      const handleMapClick = (e: any) => {
        if (isGuessDisabled || !onProvisionalGuess) return;
        const coords = {
          lat: e.latlng.lat,
          lng: e.latlng.lng,
        };
        onProvisionalGuess(coords.lat, coords.lng);
      };
      leafletMap.on("click", handleMapClick);
      setMap(leafletMap);
    });

    return () => {
      if (map) {
        map.off();
        map.remove();
        setMap(null);
        setL(null);
      }
    };
  }, [isClient, mapRef, onProvisionalGuess, isGuessDisabled]);

  return { map, L };
}
