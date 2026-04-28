'use client';

import React, { useState, useEffect } from 'react';
import { Store, MapPin, TrendingUp, TrendingDown, X, ChevronRight, Activity, Target, BarChart3, LayoutGrid } from 'lucide-react';

interface AsoDetails {
    aso_id: string;
    aso_name: string;
}

interface StoreData {
    store_id: string;
    store_name: string;
    store_type: string;
    latitude: number;
    longitude: number;
    segmentation: string;
    totalSales: number;
    avg_monthly_order_value_inr: number;
    growth_rate_percentage: number;
    month_wise_sales: Record<string, number>;
    aso_details: AsoDetails;
    image?: string;
    unique_sku_count: number;
    sku_list: string[];
    route_name?: string;
}

interface FilterSelectProps {
    label: string;
    value: string;
    options: string[];
    onChange: (val: string) => void;
}

export default function StorePortfolio() {
    const [stores, setStores] = useState<StoreData[]>([]);
    const [filteredStores, setFilteredStores] = useState<StoreData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedStore, setSelectedStore] = useState<StoreData | null>(null);

    const [filterSegment, setFilterSegment] = useState('all');
    const [filterArea, setFilterArea] = useState('all');
    const [filterAso, setFilterAso] = useState('all');

    useEffect(() => {
        const fetchStores = async () => {
            try {
                const res = await fetch('/api/stores');
                const data = await res.json();
                if (data.stores) {
                    setStores(data.stores);
                    setFilteredStores(data.stores);
                }
            } catch (err) {
                console.error('Failed to load stores', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStores();
    }, []);

    useEffect(() => {
        let result = [...stores];
        if (filterSegment !== 'all') {
            result = result.filter(s => s?.segmentation === filterSegment);
        }
        if (filterArea !== 'all') {
            result = result.filter(s => s?.route_name === filterArea);
        }
        if (filterAso !== 'all') {
            result = result.filter(s => s?.aso_details?.aso_name === filterAso);
        }
        setFilteredStores(result);
    }, [filterSegment, filterArea, filterAso, stores]);

    const uniqueSegments = Array.from(new Set(stores.filter(s => s).map(s => s.segmentation).filter(Boolean))) as string[];
    const uniqueAreas = Array.from(new Set(stores.filter(s => s).map(s => s.route_name).filter(Boolean))) as string[];
    const uniqueAsos = Array.from(new Set(stores.filter(s => s).map(s => s.aso_details?.aso_name).filter(Boolean))) as string[];

    const formatCurrency = (val: number) => {
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Cataloging Portfolio...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6 md:p-10 font-sans">
            <div className="max-w-7xl mx-auto">
                {/* Header + Filters */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Store Portfolio</h1>
                        <p className="text-gray-500 mt-1 font-bold text-xs uppercase tracking-widest leading-none mb-6">Enterprise Outlet Network Management</p>
                        <div className="flex flex-wrap gap-4">
                            <FilterSelect label="Segment" value={filterSegment} options={uniqueSegments} onChange={setFilterSegment} />
                            <FilterSelect label="Area" value={filterArea} options={uniqueAreas} onChange={setFilterArea} />
                            <FilterSelect label="ASO" value={filterAso} options={uniqueAsos} onChange={setFilterAso} />
                            {(filterSegment !== 'all' || filterArea !== 'all' || filterAso !== 'all') && (
                                <button
                                    onClick={() => { setFilterSegment('all'); setFilterArea('all'); setFilterAso('all'); }}
                                    className="text-xs font-black text-red-600 uppercase tracking-widest hover:underline pt-5"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="bg-white border border-gray-100 px-6 py-4 rounded-xl shadow-sm flex flex-col items-end shrink-0">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Order Value</span>
                        <span className="text-2xl font-black text-red-600">{formatCurrency(filteredStores.reduce((acc, s) => acc + (s.totalSales || 0), 0))}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase mt-1">Showing {filteredStores.length} of {stores.length} Outlets</span>
                    </div>
                </div>

                {/* Store Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredStores.filter(s => s).map((store) => {
                        const isPositive = (store.growth_rate_percentage || 0) >= 0;
                        return (
                            <div
                                key={store.store_id}
                                className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg hover:translate-y-[-2px] transition-all group cursor-pointer flex flex-col h-full"
                                onClick={() => setSelectedStore(store)}
                            >
                                <div className="aspect-[5/3] bg-gray-100 relative overflow-hidden">
                                    <img
                                        src={store.image || `/api/image?type=${store.store_type}&index=${parseInt(store.store_id?.split('_')[1] || '0')}`}
                                        alt={store.store_name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        onError={(e) => {
                                            // Fallback if image fails to load
                                            (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&q=80&w=800';
                                        }}
                                    />
                                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-0.5 rounded-lg shadow-sm border border-white/50">
                                        <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">{store.segmentation}</span>
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>

                                <div className="p-5 flex flex-col flex-1">
                                    <h3 className="font-black text-gray-900 text-base leading-tight mb-0.5 group-hover:text-red-600 transition-colors uppercase truncate">{store.store_name}</h3>
                                    <div className="flex items-center gap-1 text-gray-400 font-bold text-[10px] uppercase tracking-wider mb-3">
                                        <LayoutGrid className="w-3 h-3 text-red-400" />
                                        {store.route_name}
                                    </div>

                                    <div className="mt-auto pt-3 border-t border-gray-50 space-y-3">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Total Sales</span>
                                                <span className="text-base font-black text-gray-900 leading-none">{formatCurrency(store.totalSales)}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-xs font-black flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                                                    {isPositive ? '+' : ''}{store.growth_rate_percentage}%
                                                    {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                </span>
                                            </div>
                                        </div>

                                        <button className="w-full text-gray-500 border border-gray-100 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50 hover:text-red-600 transition-all flex items-center justify-center gap-1.5">
                                            View Report <ChevronRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {filteredStores.length === 0 && (
                        <div className="col-span-full py-20 text-center">
                            <p className="text-gray-400 font-bold uppercase tracking-widest">No stores match the selected filters.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Store Report Modal */}
            {selectedStore && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setSelectedStore(null)}></div>
                    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl relative z-10 overflow-hidden text-gray-900">

                        {/* Modal Header */}
                        <div className="bg-gray-50 p-6 md:p-8 border-b border-gray-100 flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="bg-red-600 text-white text-[9px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-[0.15em]">{selectedStore.segmentation}</span>
                                    <span className="text-gray-400 font-bold text-xs">• {selectedStore.store_type}</span>
                                </div>
                                <h2 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight mb-1">{selectedStore.store_name}</h2>
                                <p className="text-gray-500 font-bold text-sm flex items-center gap-2">
                                    <LayoutGrid className="w-3.5 h-3.5 text-red-500" />
                                    {selectedStore.route_name} • {selectedStore.aso_details?.aso_name}
                                </p>
                            </div>
                            <button onClick={() => setSelectedStore(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 md:p-8 space-y-8 max-h-[65vh] overflow-y-auto">
                            {/* KPI Row */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 text-center">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Total Sales</span>
                                    <span className="text-xl font-black text-gray-900">{formatCurrency(selectedStore.totalSales)}</span>
                                </div>
                                <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 text-center">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Avg Monthly</span>
                                    <span className="text-xl font-black text-gray-900">{formatCurrency(selectedStore.avg_monthly_order_value_inr)}</span>
                                </div>
                                <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 text-center">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Growth Rate</span>
                                    <span className={`text-xl font-black ${selectedStore.growth_rate_percentage >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        {selectedStore.growth_rate_percentage >= 0 ? '+' : ''}{selectedStore.growth_rate_percentage}%
                                    </span>
                                </div>
                                <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 text-center">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Unique SKUs</span>
                                    <span className="text-xl font-black text-gray-900">{selectedStore.unique_sku_count}</span>
                                </div>
                            </div>

                            {/* MoM Chart */}
                            <div>
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-red-600" />
                                    Month-over-Month Sales Trend
                                </h3>
                                <div className="h-48 flex items-end gap-4 bg-gray-50 rounded-xl border border-gray-100 p-6">
                                    {selectedStore.month_wise_sales && Object.entries(selectedStore.month_wise_sales).map(([month, sales], i, arr) => {
                                        const values = Object.values(selectedStore.month_wise_sales);
                                        const max = Math.max(...values);
                                        const min = Math.min(...values);
                                        const range = max - min;

                                        // Scaling logic: If all same, show at 60% height. Otherwise scale between 30% and 100%
                                        const height = range === 0 ? 60 : 30 + ((sales - min) / range) * 70;

                                        return (
                                            <div key={month} className="flex-1 flex flex-col items-center gap-3 h-full justify-end group">
                                                <div className="relative w-full flex-1 flex items-end justify-center px-1">
                                                    {/* Bar with gradient */}
                                                    <div
                                                        className="w-full bg-gradient-to-t from-red-600 to-red-400 group-hover:from-red-700 group-hover:to-red-500 rounded-md transition-all shadow-sm"
                                                        style={{ height: `${height}%` }}
                                                    >
                                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-black px-2 py-1 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-all z-10 whitespace-nowrap">
                                                            {formatCurrency(sales)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-tight">{month.replace(' 2025', "'25").replace(' 2026', "'26")}</span>
                                            </div>
                                        );
                                    })}
                                    {(!selectedStore.month_wise_sales || Object.keys(selectedStore.month_wise_sales).length === 0) && (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs font-bold font-sans uppercase tracking-[0.2em]">No Intelligence Logged</div>
                                    )}
                                </div>
                            </div>

                            {/* Rating */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-center gap-4 bg-gray-50 p-5 rounded-xl border border-gray-100">
                                    <BarChart3 className="w-8 h-8 text-red-500" />
                                    <div>
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Performance Tier</span>
                                        <span className="text-lg font-black text-gray-900 uppercase">
                                            {selectedStore.growth_rate_percentage > 8 ? '🏆 Platinum' : selectedStore.growth_rate_percentage > 3 ? '⭐ Gold' : selectedStore.growth_rate_percentage >= 0 ? '🔵 Standard' : '⚠️ Needs Attention'}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-3 flex items-center gap-2">
                                        <Target className="w-3 h-3 text-red-500" /> SKU Portfolio
                                    </span>
                                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                                        {selectedStore.sku_list && selectedStore.sku_list.map((sku, idx) => (
                                            <span key={idx} className="bg-white px-2 py-0.5 rounded border border-gray-200 text-[10px] font-bold text-gray-600">
                                                {sku}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 cursor-pointer shadow-sm min-w-[130px] appearance-none"
            >
                <option value="all">All {label}s</option>
                {options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        </div>
    );
}
