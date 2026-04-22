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
            const isPremium = loc.segmentation === 'Premium';
            const color = isPremium ? '#dc2626' : '#f87171';

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
                .bindTooltip(`<b>${loc.name}</b><br/>${loc.segmentation}`, {
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
        <>
            <style jsx global>{`
                .leaflet-tooltip-custom {
                    font-family: system-ui, -apple-system, sans-serif;
                    font-size: 11px;
                    font-weight: 700;
                    padding: 6px 10px;
                    border-radius: 8px;
                    border: 1px solid #e5e7eb;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
            `}</style>
            <div ref={mapRef} className="w-full h-full rounded-2xl" />
        </>
    );
}
