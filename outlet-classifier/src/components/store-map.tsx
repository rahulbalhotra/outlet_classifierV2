'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface StoreLocation {
    name: string;
    lat: number;
    lng: number;
    segmentation: string;
}

interface StoreMapProps {
    locations: StoreLocation[];
    center?: [number, number];
}

const SEGMENT_COLORS: Record<string, string> = {
    'diamond': '#7f1d1d', // Deep Red
    'gold': '#dc2626',    // Bright Red
    'platinum': '#f87171', // Rose/Light Red
    'silver': '#94a3b8',   // Slate/Gray
    'unknown': '#d1d5db'   // Light Gray
};

export default function StoreMap({ locations, center }: StoreMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const leafletMap = useRef<L.Map | null>(null);

    // Initial Map Setup
    useEffect(() => {
        if (!mapRef.current || locations.length === 0) return;

        if (leafletMap.current) {
            leafletMap.current.remove();
        }

        const map = L.map(mapRef.current, {
            zoomControl: true,
            scrollWheelZoom: false,
            attributionControl: false,
        });

        leafletMap.current = map;

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
        }).addTo(map);

        const markers: L.Marker[] = [];

        locations.forEach((loc) => {
            const seg = (loc.segmentation || 'unknown').toLowerCase();
            const color = SEGMENT_COLORS[seg] || SEGMENT_COLORS['unknown'];

            const icon = L.divIcon({
                className: '',
                html: `<div style="
                    width: 12px; height: 12px;
                    background: ${color};
                    border: 2px solid white;
                    border-radius: 50%;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.3);
                "></div>`,
                iconSize: [12, 12],
                iconAnchor: [6, 6],
            });

            const marker = L.marker([loc.lat, loc.lng], { icon })
                .bindTooltip(`<b>${loc.name}</b><br/><span style="color: ${color}; text-transform: uppercase; font-size: 9px; font-weight: 900;">${loc.segmentation}</span>`, {
                    className: 'leaflet-tooltip-custom',
                    direction: 'top',
                    offset: [0, -8],
                })
                .addTo(map);

            markers.push(marker);
        });

        if (markers.length > 0) {
            const group = L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.15));
        }

        return () => {
            if (leafletMap.current) {
                leafletMap.current.remove();
                leafletMap.current = null;
            }
        };
    }, [locations]);

    // Handle Centering/Zooming on prop change
    useEffect(() => {
        if (leafletMap.current && center) {
            leafletMap.current.setView(center, 15, {
                animate: true,
                duration: 1.5
            });
        }
    }, [center]);

    return (
        <div className="relative w-full h-full group">
            <style jsx global>{`
                .leaflet-tooltip-custom {
                    font-family: inherit;
                    font-size: 11px;
                    font-weight: 700;
                    padding: 6px 10px;
                    border-radius: 8px;
                    border: 1px solid #e5e7eb;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    background: white;
                }
            `}</style>

            {/* Map Container */}
            <div ref={mapRef} className="w-full h-full rounded-2xl" />

            {/* In-Map Legend Overlay */}
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm border border-gray-100 p-3 rounded-xl shadow-xl z-[1000] space-y-2.5 min-w-[110px]">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-1.5 mb-2">Legend</p>
                {Object.entries(SEGMENT_COLORS).filter(([k]) => k !== 'unknown').map(([segment, color]) => (
                    <div key={segment} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: color }} />
                        <span className="text-[10px] font-black text-gray-700 capitalize tracking-tight">{segment}</span>
                    </div>
                ))}
            </div>

            {/* Map Interaction Hint */}
            <div className="absolute top-4 right-4 bg-gray-900/80 text-white text-[9px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-[1000] pointer-events-none backdrop-blur-sm">
                SCROLL TO ZOOM DISABLED
            </div>
        </div>
    );
}
