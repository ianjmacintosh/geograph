import { useRef, useEffect, useState } from "react";
import MapMarkers from "./MapMarkers";
import TargetCityMarker from "./TargetCityMarker";
import ProvisionalMarker from "./ProvisionalMarker";
import USStatesBoundaries from "./USStatesBoundaries";
import useLeafletMap from "./useLeafletMap";
import type { City } from "../../types/game";

interface WorldMapContainerProps {
  onProvisionalGuess?: (lat: number, lng: number) => void;
  targetCity?: { lat: number; lng: number; name: string; country: string };
  guesses?: Array<{
    lat: number;
    lng: number;
    playerName: string;
    isComputer: boolean;
  }>;
  provisionalGuessLocation?: { lat: number; lng: number } | null;
  showTarget?: boolean;
  isGuessDisabled?: boolean;
  gameDifficulty?: City["difficulty"];
}

// Container for map setup, state, and context
export default function WorldMapContainer({
  onProvisionalGuess,
  targetCity,
  guesses = [],
  provisionalGuessLocation = null,
  showTarget = false,
  isGuessDisabled = false,
  gameDifficulty,
}: WorldMapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  // The following state and logic will be moved to useLeafletMap
  // const [map, setMap] = useState<any>(null);
  // const [L, setL] = useState<any>(null);
  // const [markers, setMarkers] = useState<any[]>([]);
  // const provisionalMarkerRef = useRef<any>(null);

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Custom hook to encapsulate Leaflet map logic (to be implemented)
  const { map, L } = useLeafletMap({
    mapRef,
    isClient,
    onProvisionalGuess,
    isGuessDisabled,
  });

  if (!isClient) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="w-full h-96 border border-gray-300 rounded-lg bg-gray-100 flex items-center justify-center">
          <div className="text-gray-500">Loading map...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <div
        ref={mapRef}
        className="w-full h-full border border-gray-300 rounded-lg touch-manipulation"
      />
      {/* Markers and overlays will be handled by subcomponents */}
      <MapMarkers map={map} L={L} guesses={guesses} showTarget={showTarget} />
      <TargetCityMarker
        map={map}
        L={L}
        targetCity={targetCity}
        showTarget={showTarget}
      />
      <ProvisionalMarker
        map={map}
        L={L}
        provisionalGuessLocation={provisionalGuessLocation}
      />
      {/* US States boundaries for us_states mode */}
      {gameDifficulty === "us_states" && (
        <USStatesBoundaries
          map={map}
          L={L}
          onStateClick={onProvisionalGuess}
          isGuessDisabled={isGuessDisabled}
          targetCity={targetCity}
        />
      )}
      {/* Provisional marker and other overlays can be added here as separate components */}
    </div>
  );
}
