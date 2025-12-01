import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { ClimbEntry, Location } from '../types';

interface ClimbMapProps {
  climbs: ClimbEntry[];
  onLocationSelect?: (loc: Location) => void;
  isSelecting?: boolean;
  center?: { lat: number; lng: number };
  zoom?: number;
}

const ClimbMap: React.FC<ClimbMapProps> = ({ climbs, onLocationSelect, isSelecting, center, zoom }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([20, 0], 2);

    mapInstanceRef.current = map;

    // Add zoom control
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Add Attribution
    L.control.attribution({ position: 'bottomright', prefix: false }).addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>').addTo(map);

    // Use CartoDB Voyager tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Fix for default markers
    const DefaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
    });
    L.Marker.prototype.options.icon = DefaultIcon;

    // CRITICAL FIX: ResizeObserver to handle container size changes dynamically
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle external center/zoom updates
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setView([center.lat, center.lng], zoom || 12, { animate: true });
    }
  }, [center, zoom]);

  // Handle Markers & Selection Updates
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add climb markers
    if (!isSelecting) {
      const bounds = L.latLngBounds([]);
      let hasPoints = false;

      climbs.forEach(climb => {
        if (climb.location && typeof climb.location.lat === 'number' && typeof climb.location.lng === 'number') {
          // Skip uninitialized locations
          if (climb.location.lat === 0 && climb.location.lng === 0 && !climb.location.name) return;

          const statusColor = climb.sent ? 'text-green-600' : 'text-amber-600';
          const statusBg = climb.sent ? 'bg-green-50' : 'bg-amber-50';
          const statusBorder = climb.sent ? 'border-green-200' : 'border-amber-200';
          const statusIcon = climb.sent ? '✓' : '○';
          const statusLabel = climb.sent ? 'Sent' : 'Project';

          const marker = L.marker([climb.location.lat, climb.location.lng])
            .bindPopup(`
              <div class="font-sans min-w-[150px]">
                <h3 class="font-bold text-slate-800 text-sm mb-0.5">${climb.name}</h3>
                <div class="text-xs text-slate-500 font-medium mb-1">${climb.grade} • ${climb.type}</div>
                <div class="text-xs text-slate-400 mb-2">${new Date(climb.date).toLocaleDateString()}</div>
                <div class="flex items-center ${statusColor} ${statusBg} ${statusBorder} border rounded px-2 py-1 w-fit text-xs font-bold">
                  <span class="mr-1.5">${statusIcon}</span> ${statusLabel}
                </div>
              </div>
            `);
          
          marker.addTo(map);
          markersRef.current.push(marker);
          bounds.extend([climb.location.lat, climb.location.lng]);
          hasPoints = true;
        }
      });

      // Only fit bounds if we aren't manually centering (to avoid fighting with the center prop)
      if (hasPoints && !center) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      }
    } else {
      // Logic for selection mode markers
      if (center) {
        // If we have a center provided (e.g. from search), show a marker there
        const marker = L.marker([center.lat, center.lng]).addTo(map);
        markersRef.current.push(marker);
      }
    }

    // Click Handler for Selection Mode
    const onMapClick = (e: L.LeafletMouseEvent) => {
      if (isSelecting && onLocationSelect) {
        onLocationSelect({
          lat: e.latlng.lat,
          lng: e.latlng.lng,
          name: "Selected Location"
        });
        
        // Remove old selection markers
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];
        
        // Add new selection marker
        const marker = L.marker(e.latlng).addTo(map);
        markersRef.current.push(marker);
        
        L.popup()
          .setLatLng(e.latlng)
          .setContent('<div class="text-xs font-bold text-green-600 px-1">Location Set</div>')
          .openOn(map);
      }
    };

    if (isSelecting) {
      map.on('click', onMapClick);
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.off('click', onMapClick);
      map.getContainer().style.cursor = 'grab';
    }

    return () => {
      map.off('click', onMapClick);
    };
  }, [climbs, isSelecting, onLocationSelect, center]); // Added center dependency to re-render markers if needed

  return (
    <div className="h-full w-full relative isolate bg-slate-100 rounded-lg overflow-hidden">
       {/* 
         CRITICAL FIX: Override Tailwind's img max-width for Leaflet containers.
         Tailwind sets 'img { max-width: 100% }' which breaks map tiles and markers.
       */}
       <style>{`
         .leaflet-container img.leaflet-marker-icon,
         .leaflet-container img.leaflet-tile,
         .leaflet-container img.leaflet-image-layer {
           max-width: none !important;
         }
         .leaflet-popup-content-wrapper {
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
         }
         .leaflet-popup-content {
            margin: 12px;
         }
       `}</style>
       
       <div ref={mapContainerRef} className="h-full w-full outline-none z-0" style={{ minHeight: '100%' }} />
       
       {isSelecting && (
         <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-slate-900/90 text-white px-4 py-2 rounded-full shadow-lg z-[400] text-xs font-semibold pointer-events-none backdrop-blur-sm animate-bounce">
           Tap map to place pin
         </div>
       )}
    </div>
  );
};

export default ClimbMap;