import { useEffect } from "react";

interface TargetCityMarkerProps {
  map: any;
  L: any;
  targetCity?: { lat: number; lng: number; name: string };
  showTarget: boolean;
}

// Renders the target city marker
export default function TargetCityMarker({
  map,
  L,
  targetCity,
  showTarget,
}: TargetCityMarkerProps) {
  useEffect(() => {
    if (!map || !L || !showTarget || !targetCity) return;
    const targetMarker = L.marker([targetCity.lat, targetCity.lng], {
      icon: L.divIcon({
        className: "custom-marker",
        html: `<div class="w-6 h-6 rounded-full border-2 border-white bg-red-500"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
    }).bindTooltip(`🎯 ${targetCity.name}`, {
      permanent: true,
      direction: "top",
      offset: [0, -15],
      className: "font-semibold",
    });
    targetMarker.addTo(map);
    return () => {
      map.removeLayer(targetMarker);
    };
  }, [map, L, targetCity, showTarget]);
  return null;
}
