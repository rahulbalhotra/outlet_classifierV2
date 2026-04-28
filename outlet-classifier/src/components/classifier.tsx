'use client';

import React, { useState } from 'react';
import { Store, MapPin, Upload, Search, Activity, CheckCircle2, ChevronRight, LayoutGrid, AlertCircle, Plus, ArrowLeft, Key, RefreshCw, X } from 'lucide-react';

interface StoreData {
    store_id: string;
    store_name: string;
    store_type: string;
    location: string;
    segmentation: string;
    totalSales: number;
    avg_monthly_order_value_inr: number;
    growth_rate_percentage: number;
    month_wise_sales: Record<string, number>;
    image?: string;
}

export default function OutletClassifier() {
    const [step, setStep] = useState<'form' | 'thinking' | 'result'>('form');
    const [formData, setFormData] = useState({
        aso_name: '',
        store_name: '',
        store_type: 'Supermarket',
        route_name: '',
        avg_monthly_order_value_inr: '',
        estimated_sku_count: '',
        sku_tags: ''
    });
    const [asoList, setAsoList] = useState<any[]>([]);
    const [image, setImage] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [result, setResult] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [toastError, setToastError] = useState<string | null>(null);
    const [models, setModels] = useState<{ id: string, name: string }[]>([
        { id: 'gemma-4-26b-a4b-it', name: 'Gemma 4 (26B-IT) (Default)' }
    ]);
    const [activeModel, setActiveModel] = useState(models[0].id);
    const [isFetchingModels, setIsFetchingModels] = useState(false);
    const [allSkus, setAllSkus] = useState<string[]>([]);
    const [skuSearch, setSkuSearch] = useState('');
    const [skuSuggestions, setSkuSuggestions] = useState<string[]>([]);
    const [selectedSkus, setSelectedSkus] = useState<string[]>([]);

    const storeTypes = [
        'Modern Kirana Store',
        'Small Kirana Store',
        'Supermarket',
        'ShoperMart'
    ];

    React.useEffect(() => {
        const fetchAsos = async () => {
            try {
                const res = await fetch('/api/asos');
                const data = await res.json();
                if (data.asos) setAsoList(data.asos);
            } catch (err) {
                console.error('Failed to fetch ASOs', err);
            }
        };
        fetchAsos();

        const fetchSkus = async () => {
            try {
                const res = await fetch('/api/skus');
                const data = await res.json();
                if (data.skus) setAllSkus(data.skus);
            } catch (err) {
                console.error('Failed to fetch SKUs', err);
            }
        };
        fetchSkus();
    }, []);

    const fetchModels = async () => {
        if (!apiKey) {
            alert("Please enter API key to fetch models");
            return;
        }

        setIsFetchingModels(true);
        try {
            const response = await fetch('/api/models', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            if (data.models && data.models.length > 0) {
                setModels(data.models);
                setActiveModel(data.models[0].id);
            }
        } catch (err: any) {
            console.error('Fetch Models Error:', err.message);
            alert('Failed to load live models. Ensure API Key is correct.');
        } finally {
            setIsFetchingModels(false);
        }
    };

    const handleSkuSearch = (val: string) => {
        setSkuSearch(val);
        if (val.length > 1) {
            const filtered = allSkus.filter(s =>
                s.toLowerCase().includes(val.toLowerCase()) && !selectedSkus.includes(s)
            ).slice(0, 8);
            setSkuSuggestions(filtered);
        } else {
            setSkuSuggestions([]);
        }
    };

    const addSkuTag = (sku: string) => {
        if (!selectedSkus.includes(sku)) {
            const newSkus = [...selectedSkus, sku];
            setSelectedSkus(newSkus);
            setFormData({ ...formData, sku_tags: newSkus.join(', ') });
        }
        setSkuSearch('');
        setSkuSuggestions([]);
    };

    const removeSkuTag = (sku: string) => {
        const newSkus = selectedSkus.filter(s => s !== sku);
        setSelectedSkus(newSkus);
        setFormData({ ...formData, sku_tags: newSkus.join(', ') });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleClassify = async (e: React.FormEvent) => {
        e.preventDefault();
        setStep('thinking');

        try {
            const response = await fetch('/api/classify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    avg_monthly_order_value_inr: parseFloat(formData.avg_monthly_order_value_inr),
                    estimated_sku_count: parseInt(formData.estimated_sku_count) || undefined,
                    sku_tags: formData.sku_tags,
                    route_name: formData.route_name,
                    image,
                    apiKey,
                    modelName: activeModel
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Classification failed on server');
            }

            const data = await response.json();
            setResult(data);
            if (data.aiError) {
                setToastError(data.aiError);
                setTimeout(() => setToastError(null), 5000);
            }
            setStep('result');
        } catch (error) {
            console.error('Classification failed', error);
            setStep('form');
            alert('Failed to classify store. Please try again.');
        }
    };

    const handleSaveStore = async () => {
        setIsSaving(true);
        try {
            const selectedAso = asoList.find(a => a.name === formData.aso_name);
            const storeToAdd = {
                store_name: result.classification.store_name,
                store_type: result.classification.store_type,
                location: result.classification.location,
                route_name: result.classification.route_name || formData.route_name,
                avg_monthly_order_value_inr: result.classification.avg_monthly_order_value_inr,
                segmentation: result.classification.segmentation,
                aso_details: {
                    aso_id: selectedAso?.id || 'ASO_99',
                    aso_name: formData.aso_name
                },
                image_id: `IMG_${Math.floor(Math.random() * 1000)}`,
                image: image || undefined
            };

            const response = await fetch('/api/stores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(storeToAdd)
            });

            if (response.ok) {
                setSaveSuccess(true);
                setTimeout(() => {
                    setSaveSuccess(false);
                    setStep('form');
                    setFormData({
                        aso_name: '',
                        store_name: '',
                        store_type: 'Supermarket',
                        route_name: '',
                        avg_monthly_order_value_inr: '',
                        estimated_sku_count: '',
                        sku_tags: ''
                    });
                    setSelectedSkus([]);
                    setImage(null);
                }, 2000);
            }
        } catch (error) {
            console.error('Save failed', error);
        } finally {
            setIsSaving(false);
        }
    };

    const formatCurrency = (val: number) => {
        if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
    };

    if (step === 'thinking') {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-white p-6 font-sans">
                <div className="max-w-md w-full text-center space-y-8">
                    <div className="relative">
                        <div className="w-24 h-24 border-4 border-red-500/20 border-t-red-600 rounded-full animate-spin mx-auto"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Activity className="w-8 h-8 text-red-600 animate-pulse" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Gemini is Thinking...</h2>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-[0.2em] animate-pulse">Running Geolocation Analysis & Peer Data Matching</p>
                    </div>

                    <div className="bg-red-50/50 rounded-2xl p-6 border border-red-100 text-left space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-red-600 rounded-full animate-ping"></div>
                            <span className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Identifying Store Morphology</span>
                        </div>
                        <div className="flex items-center gap-3 opacity-60">
                            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Fetching Area benchmarks for {formData.route_name}</span>
                        </div>
                        <div className="flex items-center gap-3 opacity-40">
                            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Cross-referencing {formData.aso_name}'s portfolio</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'result' && result && result.classification) {
        return (
            <div className="flex-1 overflow-y-auto bg-gray-50 p-6 md:p-10 font-sans">
                <div className="max-w-6xl mx-auto space-y-10">

                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <button
                                onClick={() => setStep('form')}
                                className="flex items-center gap-2 text-gray-500 font-bold text-xs uppercase tracking-widest hover:text-red-600 transition-colors mb-4"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back to Input
                            </button>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Intelligence Result</h1>
                            <p className="text-gray-500 mt-1 font-bold text-xs uppercase tracking-widest">AI Classification & Market Benchmarking</p>
                        </div>
                        <div className="bg-green-50 text-green-700 px-4 py-2 rounded-xl border border-green-100 flex items-center gap-2 shadow-sm">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-xs font-black uppercase tracking-widest">Analysis Complete</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Main Classification Card */}
                        <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-gray-100 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-full -mr-32 -mt-32 opacity-50"></div>

                            <div className="relative z-10 space-y-8">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div>
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className="bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest shadow-lg shadow-red-200">
                                                {result.classification?.segmentation}
                                            </span>
                                            <span className="text-gray-400 font-bold text-xs uppercase tracking-widest">• {result.classification?.store_type}</span>
                                        </div>
                                        <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-2">{result.classification?.store_name}</h2>
                                        <div className="flex flex-wrap gap-4 mt-2">
                                            {result.classification?.route_name && (
                                                <p className="flex items-center gap-2 text-gray-500 font-bold text-sm">
                                                    <LayoutGrid className="w-4 h-4 text-red-500" /> Route: {result.classification.route_name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-center md:min-w-[200px]">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Recommended Order Value</span>
                                        <span className="text-2xl font-black text-gray-900">{formatCurrency(result.classification?.avg_monthly_order_value_inr || 0)}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-red-50/30 p-6 rounded-2xl border border-red-100/50">
                                        <h3 className="text-xs font-black text-red-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Activity className="w-4 h-4" /> Market Insight
                                        </h3>
                                        <p className="text-sm font-bold text-gray-700 leading-relaxed">
                                            {result.classification.morphology_analysis}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col justify-center">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">ASO Ownership</span>
                                            <span className="text-xs font-black text-gray-900">{result.classification.aso_name}</span>
                                        </div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Confidence Score</span>
                                            <span className="text-xs font-black text-green-600">{result.classification.confidence_score}%</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Assumed SKU Count</span>
                                            <span className="text-xs font-black text-red-600">{result.classification.assumed_sku_count}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* SKU Tags */}
                                {result.classification.assumed_sku_list && (
                                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                        <h3 className="text-[10px] font-black text-gray-400 border-b border-gray-200 pb-2 mb-4 uppercase tracking-widest">Assumed SKU Portfolio</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {result.classification.assumed_sku_list.map((sku: string, idx: number) => (
                                                <span key={idx} className="bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-[10px] font-bold text-gray-600 uppercase">
                                                    {sku}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleSaveStore}
                                    disabled={isSaving || saveSuccess}
                                    className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest transition-all shadow-lg ${saveSuccess
                                        ? 'bg-green-500 text-white'
                                        : 'bg-red-600 text-white hover:bg-red-700 shadow-red-200 active:scale-95 disabled:opacity-50'
                                        }`}
                                >
                                    {isSaving ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : saveSuccess ? (
                                        <><CheckCircle2 className="w-6 h-6" /> Entry Added to Database</>
                                    ) : (
                                        <><Plus className="w-6 h-6" /> Commit to Store Database</>
                                    )}
                                </button>

                                <div className="text-center pt-2">
                                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.3em]">
                                        Intelligence Source: {result.classification.source}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Image Preview Card */}
                        <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-lg flex flex-col h-full">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Analyzed Visual</span>
                            <div className="flex-1 rounded-2xl overflow-hidden bg-gray-100 relative">
                                {image ? (
                                    <img src={image} alt="Analyzed Store" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Store className="w-12 h-12 text-gray-300" />
                                    </div>
                                )}
                                <div className="absolute bottom-4 left-4 right-4 bg-white/80 backdrop-blur-md p-3 rounded-xl border border-white/50 text-[10px] font-bold text-gray-800">
                                    Morphological features extracted for classification.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Similar Stores - Tile Format */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
                                <LayoutGrid className="w-6 h-6 text-red-600" /> Similar Benchmarks in Area
                            </h3>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{result.similar_stores.length} Reference Stores</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {result.similar_stores.map((store: any) => (
                                <div key={store.store_id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                                    <div className="aspect-[16/9] bg-gray-100 overflow-hidden relative">
                                        <img
                                            src={store.image || `/api/image?type=${store.store_type}&index=${parseInt(store.store_id?.split('_')[1] || '0')}`}
                                            alt={store.store_name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            onError={(e) => {
                                                (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800';
                                            }}
                                        />
                                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/50 shadow-sm">
                                            <span className="text-[8px] font-black text-red-600 uppercase tracking-widest">{store.segmentation}</span>
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <h4 className="font-black text-gray-900 text-sm uppercase truncate">{store.store_name}</h4>
                                        <div className="flex justify-between items-end border-t border-gray-50 pt-2">
                                            <div>
                                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Avg Monthly Order</span>
                                                <span className="text-xs font-black text-gray-900">{formatCurrency(store.avg_monthly_order_value_inr)}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-[8px] font-black text-green-600 bg-green-50 px-1.5 py-0.5 rounded uppercase">
                                                +{store.growth_rate_percentage}%
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-white font-sans">
            {/* Top bar */}
            <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600 font-medium">
                        <button
                            onClick={fetchModels}
                            title="Fetch Live Models"
                            disabled={isFetchingModels || !apiKey}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-red-600 disabled:text-gray-300"
                        >
                            <RefreshCw className={`w-4 h-4 ${isFetchingModels ? 'animate-spin' : ''}`} />
                        </button>
                        <select
                            value={activeModel}
                            onChange={(e) => setActiveModel(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 cursor-pointer focus:border-red-400 outline-none max-w-[220px] truncate leading-tight font-semibold text-gray-700"
                        >
                            {models.map(model => (
                                <option key={model.id} value={model.id}>{model.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group flex items-center">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Key className="h-4 w-4 text-gray-400 group-focus-within:text-red-500" />
                        </div>
                        <input
                            type="password"
                            placeholder="Gemini API Key"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            onBlur={fetchModels}
                            className="bg-gray-50 border border-gray-200 text-sm rounded-xl focus:ring-1 focus:ring-red-500 focus:border-red-500 block w-48 lg:w-64 pl-9 p-2 outline-none transition-all font-medium placeholder:font-normal"
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50 p-6 md:p-10">
                <div className="max-w-5xl mx-auto">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden flex flex-col md:flex-row">

                        {/* Form Side */}
                        <div className="flex-1 p-8 md:p-12 space-y-10 border-r border-gray-100">
                            <div>
                                <h1 className="text-4xl font-black text-gray-900 tracking-tighter leading-none mb-3 uppercase">Outlet Classifier</h1>
                                <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-red-500" /> AI-Powered Intelligent Onboarding
                                </p>
                            </div>

                            <form onSubmit={handleClassify} className="space-y-6">
                                {/* ASO Selection */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assigned ASO</label>
                                    <select
                                        required
                                        value={formData.aso_name}
                                        onChange={(e) => setFormData({ ...formData, aso_name: e.target.value })}
                                        className="w-full bg-gray-50 border-2 border-gray-50 focus:border-red-500 focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold text-gray-800 outline-none transition-all"
                                    >
                                        <option value="" disabled>Select Area Sales Officer</option>
                                        {asoList.map(aso => <option key={aso.id} value={aso.name}>{aso.name}</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Store Name</label>
                                        <input
                                            required
                                            placeholder="e.g. Modern Retailers"
                                            value={formData.store_name}
                                            onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                                            className="w-full bg-gray-50 border-2 border-gray-50 focus:border-red-500 focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold text-gray-800 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Format Type</label>
                                        <select
                                            required
                                            value={formData.store_type}
                                            onChange={(e) => setFormData({ ...formData, store_type: e.target.value })}
                                            className="w-full bg-gray-50 border-2 border-gray-50 focus:border-red-500 focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold text-gray-800 outline-none transition-all"
                                        >
                                            {storeTypes.map(type => <option key={type} value={type}>{type}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assigned Route</label>
                                        <div className="relative">
                                            <LayoutGrid className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                required
                                                placeholder="e.g. Route A-12"
                                                value={formData.route_name}
                                                onChange={(e) => setFormData({ ...formData, route_name: e.target.value })}
                                                className="w-full bg-gray-50 border-2 border-gray-50 focus:border-red-500 focus:bg-white rounded-2xl pl-14 pr-6 py-4 text-sm font-bold text-gray-800 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Est. Monthly Order (INR)</label>
                                        <div className="relative">
                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-gray-400">₹</span>
                                            <input
                                                required
                                                type="number"
                                                placeholder="50,000"
                                                value={formData.avg_monthly_order_value_inr}
                                                onChange={(e) => setFormData({ ...formData, avg_monthly_order_value_inr: e.target.value })}
                                                className="w-full bg-gray-50 border-2 border-gray-50 focus:border-red-500 focus:bg-white rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-gray-800 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Est. Unique SKU Count</label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 50"
                                            value={formData.estimated_sku_count}
                                            onChange={(e) => setFormData({ ...formData, estimated_sku_count: e.target.value })}
                                            className="w-full bg-gray-50 border-2 border-gray-50 focus:border-red-500 focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold text-gray-800 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 relative">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Typical SKU Tags</label>
                                    <div className="w-full bg-gray-50 border-2 border-gray-50 focus-within:border-red-500 focus-within:bg-white rounded-2xl px-4 py-2 flex flex-wrap gap-2 transition-all min-h-[56px]">
                                        {selectedSkus.map(sku => (
                                            <span key={sku} className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-md flex items-center gap-1 uppercase tracking-tight">
                                                {sku}
                                                <button type="button" onClick={() => removeSkuTag(sku)} className="hover:text-gray-200"><X className="w-3 h-3" /></button>
                                            </span>
                                        ))}
                                        <input
                                            placeholder={selectedSkus.length === 0 ? "Search & Add SKUs..." : ""}
                                            value={skuSearch}
                                            onChange={(e) => handleSkuSearch(e.target.value)}
                                            className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-gray-800 p-2 min-w-[120px]"
                                        />
                                    </div>
                                    {skuSuggestions.length > 0 && (
                                        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden">
                                            {skuSuggestions.map(sku => (
                                                <button
                                                    key={sku}
                                                    type="button"
                                                    onClick={() => addSkuTag(sku)}
                                                    className="w-full text-left px-6 py-3 text-xs font-bold text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors border-b border-gray-50 last:border-0"
                                                >
                                                    {sku}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-gray-900 text-white hover:bg-red-600 py-5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 group"
                                >
                                    <Search className="w-5 h-5 group-hover:scale-125 transition-transform" /> Start AI Analysis
                                </button>
                            </form>
                        </div>

                        {/* Image Upload Side */}
                        <div className="md:w-[320px] bg-gray-50 p-8 flex flex-col items-center justify-center gap-6">
                            <div className="w-full aspect-[4/5] bg-white rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-4 relative group hover:border-red-400 transition-colors cursor-pointer overflow-hidden">
                                {image ? (
                                    <div className="absolute inset-0">
                                        <img src={image} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Upload className="w-10 h-10 text-white" />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4"><Upload className="w-8 h-8 text-red-600" /></div>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Upload Storefront Image</span>
                                    </>
                                )}
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-gray-100 w-full space-y-3">
                                <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" /> System Guidelines
                                </h4>
                                <ul className="space-y-2">
                                    <li className="text-[9px] font-bold text-gray-500 leading-tight">• Ensure store front and signage are visible.</li>
                                    <li className="text-[9px] font-bold text-gray-500 leading-tight">• Benchmarking is localized to area.</li>
                                    <li className="text-[9px] font-bold text-gray-500 leading-tight">• Verification depends on ASO history.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Toast */}
            {toastError && (
                <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-right-full">
                    <div className="bg-gray-900 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-sm">
                        <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center shrink-0">
                            <AlertCircle className="w-6 h-6 text-red-500" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-0.5">System Alert</p>
                            <p className="text-xs font-bold text-gray-200 leading-tight">{toastError}</p>
                        </div>
                        <button onClick={() => setToastError(null)} className="p-1 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
