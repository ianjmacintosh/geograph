import { useEffect, useRef } from "react";

interface USStatesBoundariesProps {
  map: any;
  L: any;
  onStateClick?: (lat: number, lng: number, stateName: string) => void;
  isGuessDisabled?: boolean;
  targetCity?: { lat: number; lng: number; name: string; country: string };
}

export default function USStatesBoundaries({
  map,
  L,
  onStateClick,
  isGuessDisabled = false,
  targetCity,
}: USStatesBoundariesProps) {
  const geoJsonLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !L) return;

    // Fetch US states GeoJSON data
    fetch(
      "https://eric.clst.org/assets/wiki/uploads/Stuff/gz_2010_us_040_00_5m.json",
    )
      .then((response) => response.json())
      .then((statesData) => {
        // Style function for the states
        const style = (_feature: any) => ({
          fillColor: "#3b82f6",
          weight: 2,
          opacity: 1,
          color: "#1e40af",
          dashArray: "3",
          fillOpacity: 0.2,
        });

        // Highlight feature on hover
        const highlightFeature = (e: any) => {
          if (isGuessDisabled) return;

          const layer = e.target;
          layer.setStyle({
            weight: 3,
            color: "#1e40af",
            dashArray: "",
            fillOpacity: 0.4,
            fillColor: "#60a5fa",
          });

          // Bring to front so border doesn't clash with nearby states
          layer.bringToFront();
        };

        // Reset highlight
        const resetHighlight = (e: any) => {
          if (!geoJsonLayerRef.current) return;
          geoJsonLayerRef.current.resetStyle(e.target);
        };

        // Handle state click
        const clickFeature = (e: any) => {
          if (isGuessDisabled || !onStateClick) return;

          const feature = e.target.feature;
          const stateName = feature.properties.NAME;
          
          // For state guessing, pass the click coordinates and state name
          // The game logic will handle whether this is the correct state
          const clickLatLng = e.latlng;
          onStateClick(clickLatLng.lat, clickLatLng.lng, stateName);
        };

        // Function to bind events to each feature
        const onEachFeature = (feature: any, layer: any) => {
          layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: clickFeature,
          });
        };

        // Create GeoJSON layer with the fetched data
        const geoJsonLayer = L.geoJSON(statesData, {
          style: style,
          onEachFeature: onEachFeature,
        });

        // Add to map
        geoJsonLayer.addTo(map);
        geoJsonLayerRef.current = geoJsonLayer;

        // Fit map bounds to continental US (exclude Alaska and Hawaii for better view)
        const continentalBounds = L.latLngBounds(
          [24.396308, -125.0], // Southwest corner
          [49.384358, -66.93457], // Northeast corner
        );
        map.fitBounds(continentalBounds, { padding: [20, 20] });
      })
      .catch((error) => {
        console.error("Failed to load US states data:", error);
      });

    // Cleanup function
    return () => {
      if (geoJsonLayerRef.current && map) {
        map.removeLayer(geoJsonLayerRef.current);
        geoJsonLayerRef.current = null;
      }
    };
  }, [map, L, onStateClick, isGuessDisabled, targetCity]);

  return null; // This component renders directly to the map
}
