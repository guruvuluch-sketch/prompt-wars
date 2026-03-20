import React from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

interface MapViewProps {
  coords: { lat: number; lng: number } | null;
  apiKey: string;
}

export const MapView: React.FC<MapViewProps> = ({ coords, apiKey }) => {
  if (!apiKey || !coords) return null;

  return (
    <div className="h-64 w-full rounded-2xl overflow-hidden border border-white/10 mt-4 shadow-inner">
      <APIProvider apiKey={apiKey} version="weekly">
        <Map
          defaultCenter={coords}
          defaultZoom={15}
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
        >
          <AdvancedMarker position={coords}>
            <Pin background="#3b82f6" glyphColor="#fff" borderColor="#1e3a8a" />
          </AdvancedMarker>
        </Map>
      </APIProvider>
    </div>
  );
};
