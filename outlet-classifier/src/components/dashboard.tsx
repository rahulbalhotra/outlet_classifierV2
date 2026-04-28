'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
    TrendingUp, BarChart3, Users, Store, ArrowUpRight,
    IndianRupee, PieChart, Map as MapIcon, Target,
    Activity, ChevronRight, Filter, ChevronDown, Tags
} from 'lucide-react';

// Dynamically import StoreMap to avoid SSR issues with Leaflet
const StoreMap = dynamic(() => import('./store-map'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-gray-50 rounded-2xl animate-pulse flex items-center justify-center text-[10px] font-black text-gray-300 uppercase tracking-widest">Initialising Spatial Intelligence...</div>
});

interface FilterOptions {
    categories: string[];
    subcategories: string[];
    regions: string[];
    segments: string[];
    asos: string[];
}

interface AnalyticsData {
    kpis: {
        total_sales: number;
        total_volume: number;
        total_outlets: number;
        avg_sales_per_outlet: number;
        total_skus: number;
    };
    trend: Array<{ month: string, sales: number }>;
    categoryDist: Array<{ category: string, sales: number, percentage: number }>;
    locations: Array<{ Outlet_ID: string, Latitude: number, Longitude: number, 'Sales in Rs.': number, Segment_Name: string, Outlet_Location: string }>;
    segmentation: Array<{ segment: string, sales: number, unique_outlets: number }>;
    topSkus: Array<{ sku: string, sales: number }>;
    topDistributors: Array<{ distributor: string, sales: number }>;
}

export default function Dashboard({ onNavigate }: { onNavigate: (tab: any) => void }) {
    const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
    const [filters, setFilters] = useState({
        category: '',
        subcategory: '',
        segment: '',
        aso: ''
    });
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const res = await fetch('/api/stats/filters');
                const options = await res.json();
                setFilterOptions(options);
            } catch (err) {
                console.error('Failed to load filters', err);
            }
        };
        fetchFilters();
    }, []);

    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoading(true);
            try {
                const query = new URLSearchParams(filters).toString();
                const res = await fetch(`/api/stats?${query}`);
                const allData = await res.json();

                if (allData.error) {
                    throw new Error(allData.error);
                }

                setData({
                    kpis: allData.kpis,
                    trend: allData.trend,
                    categoryDist: allData.categoryDist,
                    locations: allData.locations,
                    segmentation: allData.segmentation,
                    topSkus: allData.topSkus,
                    topDistributors: allData.topDistributors
                });
            } catch (err) {
                console.error('Failed to load analytics', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllData();
    }, [filters]);

    const formatCurrency = (val: number) => {
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lac`;
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
    };

    const formatNumber = (val: number) => new Intl.NumberFormat('en-IN').format(val);

    if (isLoading && !data) {
        return (
            <div className="flex-1 flex items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Processing Spatial Data Layers...</p>
                </div>
            </div>
        );
    }

    const mapMarkers = (data?.locations || []).map(l => ({
        name: l.Outlet_ID,
        lat: l.Latitude,
        lng: l.Longitude,
        segmentation: l.Segment_Name
    }));

    return (
        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative z-10">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Market Intelligence</h1>
                        <p className="text-gray-500 mt-1 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                            <Target className="w-3.5 h-3.5 text-red-600" />
                            Unified Segmentation and Classifier Engine
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs bg-red-50 text-red-700 px-4 py-2.5 rounded-xl font-black border border-red-100 uppercase tracking-tight">
                        <span className="w-2 h-2 bg-red-600 rounded-full animate-ping"></span>
                        Live Feed
                    </div>
                </div>

                {/* Filters Row - Forced horizontal and high z-index handling */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative z-50">
                    <div className="flex flex-row flex-wrap lg:flex-nowrap items-end gap-6">
                        <div className="flex-1 min-w-[200px]">
                            <FilterSelect label="Category" value={filters.category} options={filterOptions?.categories || []} onChange={(v) => setFilters({ ...filters, category: v })} />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <FilterSelect label="Product Category" value={filters.subcategory} options={filterOptions?.subcategories || []} onChange={(v) => setFilters({ ...filters, subcategory: v })} />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <FilterSelect label="Segment" value={filters.segment} options={filterOptions?.segments || []} onChange={(v) => setFilters({ ...filters, segment: v })} />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <FilterSelect label="ASO" value={filters.aso} options={filterOptions?.asos || []} onChange={(v) => setFilters({ ...filters, aso: v })} />
                        </div>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                    <StatCard title="Total Revenue" value={formatCurrency(data?.kpis.total_sales || 0)} icon={IndianRupee} label="Segmented Sales" />
                    <StatCard title="Avg. Order Value" value={formatCurrency(data?.kpis.avg_sales_per_outlet || 0)} label="Per Store" icon={Target} />
                    <StatCard title="Market Breadth" value={formatNumber(data?.kpis.total_outlets || 0)} label="Unique Outlets" icon={Store} />
                    <StatCard title="SKU Penetration" value={formatNumber(data?.kpis.total_skus || 0)} label="Product Mix" icon={Tags} />
                </div>

                {/* Row 1: MoM Sales Trend Bar Chart & Donut */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
                    <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-black text-gray-900 flex items-center gap-3">
                                <BarChart3 className="w-5 h-5 text-red-600" /> MoM Sales Trend
                            </h3>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{data?.trend.length || 0} Months</span>
                        </div>
                        <div className="h-[240px] flex items-end gap-4 px-4">
                            {data?.trend.map((t, i) => {
                                const max = Math.max(...data.trend.map(x => x.sales));
                                const min = Math.min(...data.trend.map(x => x.sales));
                                const range = max - min;
                                const height = range === 0 ? 70 : 20 + ((t.sales - min) / range) * 75;
                                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                const [y, m] = t.month.split('-');
                                const label = `${monthNames[parseInt(m) - 1]} '${y.slice(2)}`;
                                return (
                                    <div key={t.month} className="flex-1 flex flex-col items-center gap-3 group h-full justify-end relative">
                                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-3 py-1.5 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all z-20 whitespace-nowrap font-black">
                                            {formatCurrency(t.sales)}
                                        </div>
                                        <div
                                            className="w-full bg-gradient-to-t from-red-600 to-red-400 rounded-t-xl group-hover:from-red-700 group-hover:to-red-500 transition-all duration-300 shadow-sm relative"
                                            style={{ height: `${height}%` }}
                                        >
                                            <div className="absolute inset-x-0 top-2 text-center text-[9px] font-black text-white/80">{formatCurrency(t.sales)}</div>
                                        </div>
                                        <span className="text-[11px] font-black text-gray-500 uppercase tracking-tight">{label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-3 mb-6">
                            <PieChart className="w-5 h-5 text-red-600" /> Portfolio Mix
                        </h3>
                        <DonutChart data={data?.categoryDist.slice(0, 6) || []} formatCurrency={formatCurrency} />
                    </div>
                </div>

                {/* Map Row: Geospatial Intelligence & Tier Recognition */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col min-h-[450px]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-black text-gray-900 flex items-center gap-3">
                                <MapIcon className="w-5 h-5 text-red-600" /> Spatial Distribution
                            </h3>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{formatNumber(mapMarkers.length)} Plotted Points</span>
                        </div>
                        <div className="flex-1 w-full rounded-xl overflow-hidden border border-gray-100 shadow-inner min-h-[350px]">
                            <StoreMap locations={mapMarkers} />
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-3 mb-8">
                            <Users className="w-5 h-5 text-red-600" /> Tier Recognition
                        </h3>
                        <div className="space-y-6">
                            {data?.segmentation.map(s => (
                                <div key={s.segment} className="flex items-center gap-6">
                                    <div className="flex flex-col items-center justify-center bg-red-50 border border-red-100/50 rounded-2xl px-4 py-2 shrink-0 min-w-[75px]">
                                        <span className="text-[11px] font-black text-red-600 leading-none">{formatNumber(s.unique_outlets)}</span>
                                        <span className="text-[8px] font-bold text-red-400 uppercase tracking-widest mt-0.5">Stores</span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <h4 className="font-extrabold text-gray-800 text-sm tracking-tight capitalize">{s.segment}</h4>
                                            <span className="font-black text-gray-900 text-xs">{formatCurrency(s.sales)}</span>
                                        </div>
                                        <div className="w-full bg-gray-50 h-1.5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-red-600 rounded-full"
                                                style={{ width: `${(s.sales / Math.max(...data.segmentation.map(x => x.sales))) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Top Lists */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-3 mb-6">
                            <TrendingUp className="w-5 h-5 text-red-600" /> High-Velocity SKUs
                        </h3>
                        <div className="space-y-2">
                            {data?.topSkus.map((sku, i) => (
                                <div key={sku.sku} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-red-600 text-white rounded-md text-[10px] font-black">{i + 1}</span>
                                        <span className="text-xs font-bold text-gray-700 truncate">{sku.sku}</span>
                                    </div>
                                    <span className="font-black text-gray-900 text-xs pl-4">{formatCurrency(sku.sales)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-3 mb-6">
                            <ChevronRight className="w-5 h-5 text-red-600" /> Strategic Partners
                        </h3>
                        <div className="space-y-2">
                            {data?.topDistributors.map((d, i) => (
                                <div key={d.distributor} className="flex items-center justify-between p-3 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-red-600 transition-colors">
                                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white" />
                                        </div>
                                        <span className="text-xs font-bold text-gray-700">{d.distributor}</span>
                                    </div>
                                    <span className="font-black text-red-600 text-xs">{formatCurrency(d.sales)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FilterSelect({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (v: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const pluralize = (str: string) => {
        if (str.toLowerCase().endsWith('category')) return str.replace(/category$/i, 'Categories');
        return `${str}s`;
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className={`flex flex-col gap-1.5 relative ${isOpen ? 'z-[100]' : 'z-auto'}`} ref={dropdownRef}>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] px-1">{label}</span>
            <div
                className={`bg-white border ${isOpen ? 'border-red-500 shadow-md' : 'border-gray-100'} p-3 rounded-xl flex items-center justify-between cursor-pointer hover:border-red-300 transition-all shadow-sm`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="text-xs font-bold text-gray-800 truncate pr-2">{value || `All ${pluralize(label)}`}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            {isOpen && (
                <div className="absolute top-full left-0 w-full min-w-[240px] bg-white border border-gray-100 mt-2 rounded-xl shadow-2xl z-[100] max-h-[250px] overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div
                        className="p-3 text-xs font-black text-gray-400 hover:bg-red-50 hover:text-red-600 cursor-pointer border-b border-gray-50 flex items-center gap-2"
                        onClick={() => { onChange(''); setIsOpen(false); }}
                    >
                        <Filter className="w-3 h-3" /> All {pluralize(label)}
                    </div>
                    {options.map(opt => (
                        <div
                            key={opt}
                            className={`p-3 text-xs font-bold transition-all cursor-pointer border-b border-gray-50 last:border-0 ${value === opt ? 'bg-red-600 text-white' : 'hover:bg-red-50 text-gray-600'} flex items-center justify-between`}
                            onClick={() => { onChange(opt); setIsOpen(false); }}
                        >
                            <span className="truncate">{opt}</span>
                            {value === opt && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function StatCard({ title, value, label, icon: Icon }: { title: string, value: string, label: string, icon: any }) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 group hover:border-red-500 transition-all shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-red-50 rounded-xl group-hover:bg-red-600 transition-all">
                    <Icon className="w-5 h-5 text-red-600 group-hover:text-white" />
                </div>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">{title}</p>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2 truncate">{value}</h2>
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                {label}
            </div>
        </div>
    );
}

const DONUT_COLORS = ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2'];

function DonutChart({ data, formatCurrency }: { data: Array<{ category: string, sales: number, percentage: number }>, formatCurrency: (v: number) => string }) {
    const total = data.reduce((a, c) => a + c.sales, 0);
    const size = 160;
    const strokeWidth = 28;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    let cumulativeOffset = 0;

    return (
        <div className="flex-1 flex flex-col items-center justify-center gap-5">
            <div className="relative">
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
                    {/* Background ring */}
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
                    {/* Data segments */}
                    {data.map((c, i) => {
                        const segmentLength = (c.percentage / 100) * circumference;
                        const offset = cumulativeOffset;
                        cumulativeOffset += segmentLength;
                        return (
                            <circle
                                key={c.category}
                                cx={size / 2} cy={size / 2} r={radius}
                                fill="none"
                                stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
                                strokeWidth={strokeWidth}
                                strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                                strokeDashoffset={-offset}
                                className="transition-all duration-700"
                                strokeLinecap="butt"
                            />
                        );
                    })}
                </svg>
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total</span>
                    <span className="text-sm font-black text-gray-900">{formatCurrency(total)}</span>
                </div>
            </div>
            {/* Legend */}
            <div className="w-full space-y-2">
                {data.map((c, i) => (
                    <div key={c.category} className="flex items-center gap-2.5 group">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                        <span className="text-[10px] font-bold text-gray-600 flex-1 truncate uppercase tracking-tight">{c.category}</span>
                        <span className="text-[10px] font-black text-gray-900">{c.percentage}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
