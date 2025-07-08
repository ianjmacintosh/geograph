import { useRef, useEffect, useState } from 'react';

interface WorldMapProps {
  onProvisionalGuess?: (lat: number, lng: number) => void; // Renamed for clarity
  targetCity?: { lat: number; lng: number; name: string };
  guesses?: Array<{ lat: number; lng: number; playerName: string; isComputer: boolean }>;
  provisionalGuessLocation?: { lat: number; lng: number } | null; // New: To show temp marker
  showTarget?: boolean;
  isGuessDisabled?: boolean; // To disable map clicks when not appropriate
}

export function WorldMap({
  onProvisionalGuess,
  targetCity,
  guesses = [],
  provisionalGuessLocation = null,
  showTarget = false,
  isGuessDisabled = false
}: WorldMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [L, setL] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const provisionalMarkerRef = useRef<any>(null); // Ref for the provisional marker

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize Leaflet map (only on client side)
  useEffect(() => {
    if (!isClient || !mapRef.current || map) return;

    import('leaflet').then((leaflet) => {
      const leafletLib = leaflet.default;
      setL(leafletLib);

      const leafletMap = leafletLib.map(mapRef.current!, {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 18,
        worldCopyJump: true,
        maxBounds: [[-90, -180], [90, 180]],
        maxBoundsViscosity: 1.0,
        tap: true,
        tapTolerance: 15,
        touchZoom: true,
        bounceAtZoomLimits: false,
        zoomSnap: 0.5,
        zoomDelta: 0.5
      });

      leafletLib.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap, © CARTO',
        noWrap: true,
        bounds: [[-90, -180], [90, 180]]
      }).addTo(leafletMap);

      const handleMapClick = (e: any) => {
        if (isGuessDisabled || !onProvisionalGuess) return; // Don't do anything if guessing is disabled or no handler

        const coords = {
          lat: e.latlng.lat,
          lng: e.latlng.lng
        };
        onProvisionalGuess(coords.lat, coords.lng);
      };
      
      leafletMap.on('click', handleMapClick);
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
  }, [isClient, onProvisionalGuess, isGuessDisabled]); // Added isGuessDisabled and onProvisionalGuess

  // Update markers when guesses, target, or provisionalGuessLocation changes
  useEffect(() => {
    if (!map || !L) return;

    // Clear existing non-provisional markers
    markers.forEach(marker => map.removeLayer(marker));
    const newMarkers: any[] = [];

    // Add guess markers (finalized guesses)
    guesses.forEach((guess) => {
      let marker;
      if (showTarget) {
        // New bubble style for showing results
        const bubbleHtml = `
          <div class="flex flex-col items-center">
            <div class="bg-white shadow-lg rounded-md px-2 py-0.5 text-xs font-semibold text-gray-700 whitespace-nowrap">
              ${guess.playerName}
            </div>
            <div class="w-0.5 h-1.5 bg-gray-600"></div> <!-- Simple tail/connector -->
            <div class="w-3 h-3 rounded-full border-2 border-white ${
              guess.isComputer ? 'bg-blue-500' : 'bg-green-500'
            }"></div>
          </div>
        `;
        // Estimate size: playerName avg 8 chars ~ 50px. Padding 16px. Total width ~66px.
        // Height: Bubble (text ~12px + padding ~4px = 16px) + tail (6px) + dot (12px) = 34px.
        // Icon size needs to be large enough for typical names.
        // Using a fixed width for simplicity, text can overflow or be truncated by Leaflet if too long.
        // Let's use Tailwind's `whitespace-nowrap` to prevent wrapping and allow it to overflow if necessary,
        // or rely on Leaflet's clipping.
        marker = L.marker([guess.lat, guess.lng], {
          icon: L.divIcon({
            className: 'custom-guess-bubble-marker', // New class for potential global styling
            html: bubbleHtml,
            iconSize: [80, 38], // Approx width 80px, height 34px + some buffer for shadow = 38px
            iconAnchor: [40, 32], // Anchor X: center of 80px. Anchor Y: center of the dot (38px height - 6px (half dot height))
          })
        });
      } else {
        // Original simple marker for when results are not shown (though typically not displayed anyway)
        marker = L.marker([guess.lat, guess.lng], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: `<div class="w-4 h-4 rounded-full border-2 border-white ${
              guess.isComputer ? 'bg-blue-500' : 'bg-green-500'
            }"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          })
        }).bindTooltip(guess.playerName, {
          permanent: false,
          direction: 'top',
          offset: [0, -10]
        });
      }

      marker.addTo(map);
      newMarkers.push(marker);
    });

    // Add or update provisional guess marker
    if (provisionalMarkerRef.current) {
      map.removeLayer(provisionalMarkerRef.current); // Remove old provisional marker
      provisionalMarkerRef.current = null;
    }

    if (provisionalGuessLocation) {
      const tempMarker = L.marker([provisionalGuessLocation.lat, provisionalGuessLocation.lng], {
        icon: L.divIcon({
          className: 'custom-marker provisional-marker',
          html: `<div class="w-8 h-8 rounded-full border-4 border-yellow-400 animate-pulse"></div>`, // Pulsing yellow RING
          iconSize: [32, 32], // w-8 h-8 -> 2rem x 2rem -> 32x32px
          iconAnchor: [16, 16]  // Center of the 32x32 icon
        })
      }).bindTooltip("Your guess (click map to change, or confirm)", {
        permanent: true,
        direction: 'top',
        offset: [0, -12],
        className: 'font-semibold provisional-tooltip'
      });

      tempMarker.addTo(map);
      provisionalMarkerRef.current = tempMarker; // Store reference to new provisional marker
    }

    // Add target marker if showing results
    if (showTarget && targetCity) {
      // If there's a provisional marker for the current player and it's their turn to see results,
      // it should ideally be cleared by the parent component before `showTarget` becomes true.
      // However, if it's still here, we'll ensure the target is distinct.
      const targetMarker = L.marker([targetCity.lat, targetCity.lng], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: `<div class="w-6 h-6 rounded-full border-2 border-white bg-red-500"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).bindTooltip(`🎯 ${targetCity.name}`, {
        permanent: true,
        direction: 'top',
        offset: [0, -15],
        className: 'font-semibold'
      });
      
      targetMarker.addTo(map);
      newMarkers.push(targetMarker);
    }

    setMarkers(newMarkers); // Store only non-provisional markers for easier clearing next time
  }, [map, L, guesses, targetCity, showTarget, provisionalGuessLocation]);

  // Show loading state on server side or before client hydration
  if (!isClient) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="w-full h-96 border border-gray-300 rounded-lg bg-gray-100 flex items-center justify-center">
          <div className="text-gray-500">Loading map...</div>
        </div>
        {targetCity && !showTarget && (
          <div className="mt-2 text-center text-gray-600">
            <p>Find: <span className="font-semibold">{targetCity.name}</span></p>
            <p className="text-sm">Click on the map to make your guess</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <div
        ref={mapRef}
        className="w-full h-full border border-gray-300 rounded-lg touch-manipulation"
      />
      {targetCity && !showTarget && (
        <div className="absolute top-2 left-2 right-2 bg-white bg-opacity-90 rounded-lg p-2 text-center text-gray-700 shadow-sm z-10">
          <p className="text-sm sm:text-base">Find: <span className="font-semibold">{targetCity.name}</span></p>
          <p className="text-xs sm:text-sm">Tap on the map to make your guess</p>
        </div>
      )}
    </div>
  );
}