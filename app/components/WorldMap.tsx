import { useRef, useEffect, useState } from 'react';

interface WorldMapProps {
  onMapClick?: (lat: number, lng: number) => void;
  targetCity?: { lat: number; lng: number; name: string };
  guesses?: Array<{ lat: number; lng: number; playerName: string; isComputer: boolean }>;
  showTarget?: boolean;
}

export function WorldMap({ onMapClick, targetCity, guesses = [], showTarget = false }: WorldMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);

  // Load world map image
  useEffect(() => {
    const img = new Image();
    img.onload = () => setMapImage(img);
    img.onerror = () => console.error('Failed to load world map');
    // Use the downloaded world map SVG
    img.src = '/world-map.svg';
  }, []);

  // Convert lat/lng to canvas coordinates - calibrated for Wikipedia world map
  const latLngToCanvas = (lat: number, lng: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    // Standard longitude mapping
    const x = ((lng + 180) / 360) * canvas.width;
    
    // Adjusted latitude mapping for this specific world map
    // After testing, this map seems to use approximately equirectangular with some vertical scaling
    // Empirically adjusted for better accuracy
    const latRange = 85; // Most world maps cut off around 85 degrees
    const y = ((latRange - lat) / (2 * latRange)) * canvas.height * 0.95 + canvas.height * 0.025;
    
    return { x, y };
  };

  // Convert canvas coordinates to lat/lng
  const canvasToLatLng = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { lat: 0, lng: 0 };
    
    // Standard longitude inverse
    const lng = (x / canvas.width) * 360 - 180;
    
    // Inverse latitude mapping matching our forward projection
    const latRange = 85;
    const normalizedY = (y - canvas.height * 0.025) / (canvas.height * 0.95);
    const lat = latRange - (normalizedY * 2 * latRange);
    
    return { lat, lng };
  };

  // Draw the map
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (!canvas || !ctx || !mapImage) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw map
    ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);

    // Draw target city if shown
    if (showTarget && targetCity) {
      const { x, y } = latLngToCanvas(targetCity.lat, targetCity.lng);
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw guesses
    guesses.forEach((guess, index) => {
      const { x, y } = latLngToCanvas(guess.lat, guess.lng);
      ctx.fillStyle = guess.isComputer ? '#3B82F6' : '#10B981';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Draw player name
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.fillText(guess.playerName, x + 10, y + 4);
    });

  }, [mapImage, targetCity, guesses, showTarget]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onMapClick) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    // Scale the click coordinates to canvas coordinates
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = clickX * scaleX;
    const y = clickY * scaleY;
    
    const { lat, lng } = canvasToLatLng(x, y);
    onMapClick(lat, lng);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        className="w-full h-auto border border-gray-300 rounded-lg cursor-crosshair bg-blue-100"
        onClick={handleCanvasClick}
      />
      {targetCity && !showTarget && (
        <div className="mt-2 text-center text-gray-600">
          <p>Find: <span className="font-semibold">{targetCity.name}</span></p>
          <p className="text-sm">Click on the map to make your guess</p>
        </div>
      )}
    </div>
  );
}