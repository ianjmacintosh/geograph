import { useEffect } from "react";

interface MapMarkersProps {
  map: any;
  L: any;
  guesses: Array<{
    lat: number;
    lng: number;
    playerName: string;
    isComputer: boolean;
  }>;
  showTarget: boolean;
}

// Renders all player and provisional markers
export default function MapMarkers({
  map,
  L,
  guesses,
  showTarget,
}: MapMarkersProps) {
  useEffect(() => {
    if (!map || !L) return;

    // Store markers locally for cleanup
    const markers: any[] = [];

    guesses.forEach((guess) => {
      let marker;
      if (showTarget) {
        const bubbleHtml = `
          <div class="flex flex-col items-center">
            <div class="bg-white shadow-lg rounded-md px-2 py-0.5 text-xs font-semibold text-gray-700 whitespace-nowrap">
              ${guess.playerName}
            </div>
            <div class="w-0.5 h-1.5 bg-gray-600"></div>
            <div class="w-3 h-3 rounded-full border-2 border-white ${
              guess.isComputer ? "bg-blue-500" : "bg-green-500"
            }"></div>
          </div>
        `;
        marker = L.marker([guess.lat, guess.lng], {
          icon: L.divIcon({
            className: "custom-guess-bubble-marker",
            html: bubbleHtml,
            iconSize: [80, 38],
            iconAnchor: [40, 32],
          }),
        });
      } else {
        marker = L.marker([guess.lat, guess.lng], {
          icon: L.divIcon({
            className: "custom-marker",
            html: `<div class="w-4 h-4 rounded-full border-2 border-white ${
              guess.isComputer ? "bg-blue-500" : "bg-green-500"
            }"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
        }).bindTooltip(guess.playerName, {
          permanent: false,
          direction: "top",
          offset: [0, -10],
        });
      }
      marker.addTo(map);
      markers.push(marker);
    });

    return () => {
      markers.forEach((marker) => map.removeLayer(marker));
    };
  }, [map, L, guesses, showTarget]);

  return null;
}
