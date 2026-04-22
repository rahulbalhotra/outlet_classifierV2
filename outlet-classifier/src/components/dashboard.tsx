'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { TrendingUp, BarChart3, Users, Store, ArrowUpRight, IndianRupee, PieChart, Map as MapIcon, Target, Bot, Activity, HelpCircle } from 'lucide-react';

const StoreMap = dynamic(() => import('./store-map'), { ssr: false, loading: () => <div className="w-full h-full bg-gray-100 rounded-2xl animate-pulse" /> });

interface StatsData {
    kpis: {
        totalStores: number;
        totalSales: number;
        avgGrowth: string;
        avgSalesPerStore: string;
    };
    breakdowns: {
        segments: Record<string, number>;
        storeTypes: Record<string, number>;
        topStores: Array<{ name: string, sales: number, location: string, type: string }>;
        locations: Record<string, number>;
        storeLocations: Array<{ name: string, lat: number, lng: number, segmentation: string, location: string }>;
        monthlySalesTrend: Record<string, number>;
    };
}

interface StatCardProps {
    title: string;
    value: string;
    label: string;
    icon: React.ElementType;
    color: string;
}

export default function Dashboard({ onNavigate }: { onNavigate: (tab: 'dashboard' | 'portfolio' | 'assistant') => void }) {
    const [stats, setStats] = useState<StatsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [asos, setAsos] = useState<{ id: string, name: string }[]>([]);
    const [selectedAso, setSelectedAso] = useState<string>('all');
    const [mapFocus, setMapFocus] = useState<[number, number] | undefined>(undefined);

    useEffect(() => {
        const fetchAsos = async () => {
            try {
                const res = await fetch('/api/asos');
                const data = await res.json();
                if (data.asos) setAsos(data.asos);
            } catch (err) {
                console.error('Failed to load ASOs', err);
            }
        };
        fetchAsos();
    }, []);

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            try {
                const url = selectedAso === 'all' ? '/api/stats' : `/api/stats?aso_id=${selectedAso}`;
                const res = await fetch(url);
                const data = await res.json();
                setStats(data);
            } catch (err) {
                console.error('Failed to load stats', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, [selectedAso]);

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Syncing Market Data...</p>
                </div>
            </div>
        );
    }

    if (!stats) return <div className="p-8">Error loading intelligence data.</div>;

    const formatCurrency = (val: number) => {
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
    };

    const mapLocations = stats.breakdowns.storeLocations || [];

    // MoM trend
    const trendEntries = Object.entries(stats.breakdowns.monthlySalesTrend || {});
    const trendValues = trendEntries.map(([, v]) => v);
    const trendMax = trendValues.length ? Math.max(...trendValues) : 1;
    const trendMin = trendValues.length ? Math.min(...trendValues) * 0.95 : 0;
    const trendRange = trendMax - trendMin || 1;

    return (
        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 md:p-8 font-sans scroll-smooth">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Market Intelligence</h1>
                        <p className="text-gray-500 mt-1 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                            <Target className="w-4 h-4 text-red-500" />
                            {selectedAso === 'all' ? 'Consolidated Data Pipeline' : `Region: ${asos.find(a => a.id === selectedAso)?.name}`}
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 p-2 rounded-lg focus-within:ring-2 focus-within:ring-red-100">
                            <Users className="w-4 h-4 text-gray-400 ml-2" />
                            <select value={selectedAso} onChange={(e) => setSelectedAso(e.target.value)} className="bg-transparent text-sm font-black text-gray-800 outline-none pr-4 cursor-pointer">
                                <option value="all">Global (All ASOs)</option>
                                {asos.map(aso => (<option key={aso.id} value={aso.id}>{aso.name}</option>))}
                            </select>
                        </div>
                        <div className="h-10 w-[1px] bg-gray-100 hidden sm:block"></div>
                        <div className="flex items-center gap-2 text-xs bg-red-50 text-red-700 px-4 py-2.5 rounded-lg font-black border border-red-100 uppercase tracking-tighter">
                            <span className="w-2 h-2 bg-red-600 rounded-full animate-ping"></span>
                            Live Feed
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Active Outlets" value={stats.kpis.totalStores.toString()} icon={Store} color="red" label="Total Footprint" />
                    <StatCard title="Total Revenue" value={formatCurrency(stats.kpis.totalSales)} icon={IndianRupee} color="red" label="Gross Sales" />
                    <StatCard title="MoM Growth Rate" value={`${stats.kpis.avgGrowth}%`} icon={TrendingUp} color="red" label="Latest Trend" />
                    <StatCard title="Average Sales per Store" value={formatCurrency(Number(stats.kpis.avgSalesPerStore))} icon={Target} color="red" label="Avg Per Store" />
                </div>

                {/* Row: Segmentation + Map */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Donut */}
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-black text-gray-900 flex items-center gap-3">
                                <PieChart className="w-5 h-5 text-red-600" /> Segmentation
                            </h3>
                            <div className="relative group">
                                <HelpCircle className="w-4 h-4 text-gray-400 hover:text-red-500 cursor-help transition-colors" />
                                <div className="absolute right-0 top-6 w-64 bg-gray-900 text-white p-4 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none border border-gray-800">
                                    <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3">Targeting Logic</h4>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-white mb-0.5">Premium</p>
                                            <p className="text-[9px] font-medium text-gray-400 leading-tight">High-end formats (Hyper/Super) in prime locations. Top 20% of regional order value.</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-white mb-0.5">Value</p>
                                            <p className="text-[9px] font-medium text-gray-400 leading-tight">Consistent mid-range performance. Primarily residential Supermarkets and Mid-Size stores.</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-white mb-0.5">Mass Market</p>
                                            <p className="text-[9px] font-medium text-gray-400 leading-tight">High-frequency traditional retail (Kirana) with stable, high-volume recurring orders.</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-white mb-0.5">Discount</p>
                                            <p className="text-[9px] font-medium text-gray-400 leading-tight">Wholesale/High-volume models focusing on low-margin clearance and bulk velocity.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="relative w-36 h-36 mx-auto mb-6">
                            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                {renderDonutSlices(stats.breakdowns.segments, stats.kpis.totalStores)}
                                {/* Hollow Center */}
                                <circle cx="50" cy="50" r="28" fill="white" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-gray-900 leading-none">{stats.kpis.totalStores}</span>
                                <span className="text-[9px] font-bold text-gray-400 uppercase">Stores</span>
                            </div>
                        </div>
                        <div className="space-y-2 mt-auto">
                            {Object.entries(stats.breakdowns.segments).map(([name, count], i) => (
                                <div key={name} className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${['bg-red-600', 'bg-red-400', 'bg-red-200', 'bg-red-800'][i % 4]}`} />
                                        <span className="text-xs font-bold text-gray-600">{name}</span>
                                    </div>
                                    <span className="text-xs font-black text-gray-900">{((count / stats.kpis.totalStores) * 100).toFixed(0)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Real Map */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-black text-gray-900 flex items-center gap-3">
                                <MapIcon className="w-5 h-5 text-red-600" /> Store Locations
                            </h3>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{mapLocations.length} Outlets</span>
                        </div>
                        <div className="w-full h-[240px] rounded-lg overflow-hidden border border-gray-100">
                            <StoreMap locations={mapLocations} center={mapFocus} />
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4">
                            {Object.entries(stats.breakdowns.locations).map(([loc, count]) => (
                                <button
                                    key={loc}
                                    onClick={() => {
                                        const store = mapLocations.find(s => s.location === loc);
                                        if (store) setMapFocus([store.lat, store.lng]);
                                    }}
                                    className="bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 flex items-center gap-2 hover:bg-red-50 hover:border-red-200 transition-all cursor-pointer group"
                                >
                                    <span className="text-[10px] font-black text-gray-500 uppercase group-hover:text-red-600">{loc}</span>
                                    <span className="text-[11px] font-black text-red-600 bg-white px-1.5 rounded-md shadow-sm">{count}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Row: MoM Trend + Top Stores */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* MoM Sales Trend */}
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-black text-gray-900 flex items-center gap-3">
                                <Activity className="w-5 h-5 text-red-600" /> Sales Trend (MoM)
                            </h3>
                        </div>

                        {/* Bar + Line Chart */}
                        {trendEntries.length >= 2 ? (
                            <div className="flex-1">
                                <div className="flex items-end gap-3 h-[180px]">
                                    {trendEntries.map(([month, value], i) => {
                                        const barHeight = ((value - trendMin) / trendRange) * 100;
                                        const prevVal = i > 0 ? trendValues[i - 1] : null;
                                        const change = prevVal ? ((value - prevVal) / prevVal * 100).toFixed(1) : null;
                                        const isUp = prevVal ? value >= prevVal : true;
                                        return (
                                            <div key={month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                                                {/* Value label */}
                                                <div className="text-center mb-1">
                                                    <span className="text-[11px] font-black text-gray-900 block">{formatCurrency(value)}</span>
                                                    {change !== null && (
                                                        <span className={`text-[9px] font-black ${isUp ? 'text-green-600' : 'text-red-500'}`}>
                                                            {isUp ? '↑' : '↓'} {Math.abs(Number(change))}%
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Bar */}
                                                <div
                                                    className="w-full rounded-lg bg-gradient-to-t from-red-600 to-red-400 group-hover:from-red-700 group-hover:to-red-500 transition-all relative"
                                                    style={{ height: `${Math.max(barHeight, 8)}%` }}
                                                >
                                                    <div className="absolute inset-0 bg-white/10 rounded-lg"></div>
                                                </div>
                                                {/* Month label */}
                                                <span className="text-[10px] font-black text-gray-400 uppercase whitespace-nowrap">{month.replace('2025', "'25").replace('2026', "'26")}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="h-[180px] flex items-center justify-center text-gray-300 text-sm font-bold">No trend data</div>
                        )}
                    </div>

                    {/* Top Performing Outlets */}
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-black text-gray-900 flex items-center gap-3">
                                <BarChart3 className="w-5 h-5 text-red-600" /> Top-Performing Outlets
                            </h3>
                        </div>
                        <div className="space-y-4">
                            {stats.breakdowns.topStores.map((store, i) => (
                                <div
                                    key={store.name}
                                    className="flex items-center gap-4 group cursor-pointer"
                                    onClick={() => {
                                        const locData = mapLocations.find(l => l.name === store.name);
                                        if (locData) setMapFocus([locData.lat, locData.lng]);
                                    }}
                                >
                                    <div className="w-10 h-10 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center font-black text-red-600 transition-all group-hover:bg-red-600 group-hover:text-white shrink-0">
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-gray-900 leading-tight truncate group-hover:text-red-600 transition-colors">{store.name}</h4>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{store.location} • {store.type}</p>
                                            </div>
                                            <span className="text-sm font-black text-gray-900 shrink-0 ml-2">{formatCurrency(store.sales)}</span>
                                        </div>
                                        <div className="w-full bg-gray-50 h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-red-500 h-full rounded-full transition-all duration-1000" style={{ width: `${(store.sales / stats.breakdowns.topStores[0].sales) * 100}%` }} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* AI Banner */}
                <div className="bg-black rounded-2xl p-10 text-white relative overflow-hidden shadow-2xl shadow-red-200 group">
                    <div className="relative z-10 lg:w-2/3">
                        <div className="flex items-center gap-2 text-red-500 font-black text-xs uppercase tracking-[0.2em] mb-4">
                            <span className="w-3 h-[2px] bg-red-500"></span> AI Intelligence
                        </div>
                        <h3 className="text-3xl font-black mb-4 leading-tight">Projected Inventory deficit in <span className="text-red-500">{Object.keys(stats.breakdowns.locations)[0]}</span></h3>
                        <p className="text-gray-400 font-medium mb-8 leading-relaxed max-w-xl">
                            Visual audit analysis indicates sub-optimal shelf placement for <span className="text-white italic">&quot;Kachchi Ghani Mustard Oil&quot;</span>. Corrective action recommended.
                        </p>
                        <button onClick={() => onNavigate('assistant')} className="bg-red-600 text-white px-8 py-4 rounded-xl font-black text-sm hover:bg-red-700 transition-all flex items-center gap-3 active:scale-95 shadow-lg shadow-red-900/20">
                            Deep Dive with AI <ArrowUpRight className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="absolute top-0 right-0 h-full w-1/3 opacity-20 pointer-events-none hidden lg:block overflow-hidden transition-all group-hover:scale-105">
                        <Bot className="w-full h-full -rotate-12 translate-x-1/4 scale-150" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function renderDonutSlices(segments: Record<string, number>, total: number) {
    let currentAngle = 0;
    const colors = ['#dc2626', '#f87171', '#fecaca', '#991b1b'];
    return Object.entries(segments).map(([name, count], i) => {
        const angle = (count / total) * 360;
        const startAngle = currentAngle;
        currentAngle += angle;
        const x1 = 50 + 40 * Math.cos((Math.PI * startAngle) / 180);
        const y1 = 50 + 40 * Math.sin((Math.PI * startAngle) / 180);
        const x2 = 50 + 40 * Math.cos((Math.PI * (startAngle + angle)) / 180);
        const y2 = 50 + 40 * Math.sin((Math.PI * (startAngle + angle)) / 180);
        return (
            <path key={name} d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${angle > 180 ? 1 : 0} 1 ${x2} ${y2} Z`} fill={colors[i % colors.length]} className="transition-all duration-500 hover:opacity-80 cursor-pointer">
                <title>{name}: {count} stores</title>
            </path>
        );
    });
}

function StatCard({ title, value, label, icon: Icon }: StatCardProps) {
    return (
        <div className="bg-white p-4 rounded-xl border border-gray-100 group hover:border-red-500 transition-all shadow-sm flex flex-col justify-between h-32">
            {/* Top Row */}
            <div className="flex justify-between items-start">
                <div className="p-2 bg-red-50 rounded-lg group-hover:bg-red-600 transition-colors">
                    <Icon className="w-5 h-5 text-red-600 group-hover:text-white" />
                </div>
                <p className="text-xs font-black text-gray-500 text-right uppercase tracking-wider">{title}</p>
            </div>

            {/* Middle Section (Right Aligned Value) */}
            <div className="flex justify-end items-center -mt-1">
                <h2 className="text-4xl font-black text-gray-900 tracking-tight leading-none">{value}</h2>
            </div>

            {/* Bottom Row (Left Aligned Label) */}
            <div className="flex justify-start items-end">
                <div className="flex items-center gap-1.5 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    {label}
                </div>
            </div>
        </div>
    );
}
