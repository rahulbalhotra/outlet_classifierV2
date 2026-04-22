'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Key, Send, Loader2, Database, ImageIcon, FileText, ChevronDown, Bot, User, RefreshCw, Plus, MessageSquare, History, Trash2 } from 'lucide-react';

interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    date: number;
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    image?: string;
    documentName?: string;
}

const PERSONAS = [
    { id: 'aso', name: 'Area Sales Officer', icon: User, desc: 'On-ground performance & market insights' },
];

const SUGGESTIONS = [
    "How many outlets in sarabha nagar market?",
    "What type of outlets dominate in this market?",
    "Average monthly order value in Premium outlets?",
];

export default function Chat() {
    const [apiKey, setApiKey] = useState('');
    const [description, setDescription] = useState('');
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingModels, setIsFetchingModels] = useState(false);

    // Initial load from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('onground_chats');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setSessions(parsed);
                if (parsed.length > 0) {
                    setActiveSessionId(parsed[0].id);
                    setMessages(parsed[0].messages);
                }
            } catch (e) {
                console.error('Failed to load sessions', e);
            }
        }
    }, []);

    // Save sessions to localStorage whenever they change
    useEffect(() => {
        if (sessions.length > 0) {
            localStorage.setItem('onground_chats', JSON.stringify(sessions));
        }
    }, [sessions]);

    // Update current session messages when they change
    useEffect(() => {
        if (activeSessionId) {
            setSessions(prev => prev.map(s =>
                s.id === activeSessionId ? { ...s, messages } : s
            ));
        }
    }, [messages]);

    const startNewChat = () => {
        const newId = Date.now().toString();
        const newSession: ChatSession = {
            id: newId,
            title: 'New Conversation',
            messages: [],
            date: Date.now()
        };
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newId);
        setMessages([]);
    };

    const switchSession = (id: string) => {
        const session = sessions.find(s => s.id === id);
        if (session) {
            setActiveSessionId(id);
            setMessages(session.messages);
        }
    };

    const deleteSession = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const newSessions = sessions.filter(s => s.id !== id);
        setSessions(newSessions);
        if (activeSessionId === id) {
            if (newSessions.length > 0) {
                switchSession(newSessions[0].id);
            } else {
                setActiveSessionId(null);
                setMessages([]);
            }
        }
    };

    const [image, setImage] = useState<string | null>(null);
    const [documentName, setDocumentName] = useState<string | null>(null);
    const [documentContent, setDocumentContent] = useState<string | null>(null);

    const [activePersona, setActivePersona] = useState(PERSONAS[0]);
    const [asos, setAsos] = useState<{ id: string, name: string }[]>([]);
    const [selectedAso, setSelectedAso] = useState<string>('all');
    const [models, setModels] = useState<{ id: string, name: string }[]>([
        { id: 'gemma-4-26b-a4b-it', name: 'Gemma 4 (26B-IT) (Default)' }
    ]);
    const [activeModel, setActiveModel] = useState(models[0].id);
    const [showUploadMenu, setShowUploadMenu] = useState(false);

    useEffect(() => {
        const loadAsos = async () => {
            try {
                const res = await fetch('/api/asos');
                const data = await res.json();
                if (data.asos) setAsos(data.asos);
            } catch (err) {
                console.error('Failed to load ASOs', err);
            }
        };
        loadAsos();
    }, []);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);

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

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setDocumentName(file.name);
            const reader = new FileReader();
            reader.onloadend = () => setDocumentContent(reader.result as string);
            reader.readAsText(file);
        }
    };

    const clearAttachments = () => {
        setImage(null);
        setDocumentName(null);
        setDocumentContent(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (docInputRef.current) docInputRef.current.value = '';
    }

    const handleAnalyze = async () => {
        if (!apiKey) {
            alert('Please enter your API Key first.');
            return;
        }
        if (!description.trim() && !image && !documentContent) {
            return;
        }

        // Auto-create session if none active
        let currentId = activeSessionId;
        if (!currentId) {
            const newId = Date.now().toString();
            const newSession: ChatSession = {
                id: newId,
                title: 'New Conversation',
                messages: [],
                date: Date.now()
            };
            setSessions(prev => [newSession, ...prev]);
            setActiveSessionId(newId);
            currentId = newId;
        }

        const newUserMsg: ChatMessage = {
            role: 'user',
            content: description || 'Attached file for context.',
            image: image || undefined,
            documentName: documentName || undefined,
        };

        // Update title if first message
        if (messages.length === 0) {
            setSessions(prev => prev.map(s =>
                s.id === currentId ? { ...s, title: newUserMsg.content.slice(0, 30) + (newUserMsg.content.length > 30 ? '...' : '') } : s
            ));
        }

        setMessages((prev) => [...prev, newUserMsg]);
        setIsLoading(true);
        setDescription('');
        clearAttachments();

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey,
                    description,
                    image,
                    documentContent,
                    history: messages,
                    aso_id: selectedAso === 'all' ? undefined : selectedAso,
                    aso_name: selectedAso === 'all' ? undefined : asos.find(a => a.id === selectedAso)?.name,
                    persona: activePersona.name,
                    modelName: activeModel
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to analyze query');
            }

            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: data.result,
                },
            ]);
        } catch (err: any) {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: `**Error:** ${err.message}`,
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-full w-full bg-white text-gray-900 font-sans overflow-hidden">

            {/* Sidebar */}
            <div className="w-72 bg-gray-50 border-r border-gray-200 flex flex-col hidden lg:flex">
                {/* New Chat Button */}
                <div className="p-4 border-b border-gray-200">
                    <button
                        onClick={startNewChat}
                        className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-red-100"
                    >
                        <Plus className="w-5 h-5" />
                        <span>New Chat</span>
                    </button>
                </div>

                {/* History Section */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    <div className="flex items-center gap-2 mb-4 px-2 text-gray-400">
                        <History className="w-4 h-4" />
                        <h3 className="text-xs font-bold uppercase tracking-wider">History</h3>
                    </div>

                    {sessions.length === 0 ? (
                        <p className="text-xs text-gray-400 italic px-2">No conversations yet</p>
                    ) : (
                        sessions.map(session => (
                            <div
                                key={session.id}
                                onClick={() => switchSession(session.id)}
                                className={`group relative flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all ${activeSessionId === session.id ? 'bg-red-50 text-red-700 font-bold ring-1 ring-red-100 shadow-sm' : 'hover:bg-gray-100 text-gray-600'
                                    }`}
                            >
                                <MessageSquare className={`w-4 h-4 flex-shrink-0 ${activeSessionId === session.id ? 'text-red-500' : 'text-gray-400'}`} />
                                <span className="text-sm truncate pr-6">{session.title}</span>
                                <button
                                    onClick={(e) => deleteSession(e, session.id)}
                                    className="absolute right-2 opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* AI Context Section */}
                <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="bg-gray-50 rounded-2xl p-4 space-y-4 border border-gray-100">
                        <div>
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Region Filter</h3>
                            <select
                                value={selectedAso}
                                onChange={(e) => setSelectedAso(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 font-bold text-gray-700"
                            >
                                <option value="all">All Regions</option>
                                {asos.map((aso) => (
                                    <option key={aso.id} value={aso.id}>{aso.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Active Persona</h3>
                            <div className="space-y-1.5">
                                {PERSONAS.map((persona) => {
                                    const Icon = persona.icon;
                                    const isActive = activePersona.id === persona.id;
                                    return (
                                        <button
                                            key={persona.id}
                                            onClick={() => setActivePersona(persona)}
                                            className={`w-full flex items-center text-left gap-2.5 px-3 py-2.5 rounded-xl transition-all ${isActive ? 'bg-white text-red-700 font-bold shadow-sm ring-1 ring-red-100' : 'hover:bg-gray-100 text-gray-500'
                                                }`}
                                        >
                                            <Icon className={`w-4 h-4 ${isActive ? 'text-red-600' : 'text-gray-400'}`} />
                                            <span className="text-xs">{persona.name}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Content */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">

                {/* Top bar */}
                <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 cursor-pointer text-gray-800 font-bold lg:hidden">
                            <Bot className="w-5 h-5 text-red-600" />
                            <span>{activePersona.name}</span>
                        </div>

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
                                id="model-select"
                                value={activeModel}
                                onChange={(e) => setActiveModel(e.target.value)}
                                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 cursor-pointer focus:border-red-400 outline-none max-w-[200px] truncate leading-tight font-semibold text-gray-700"
                            >
                                {models.map(model => (
                                    <option key={model.id} value={model.id}>
                                        {model.name}
                                    </option>
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
                                className="bg-gray-50 border border-gray-200 text-sm rounded-xl focus:ring-1 focus:ring-red-500 focus:border-red-500 block w-48 lg:w-64 pl-9 p-2 outline-none transition-all font-medium"
                            />
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 lg:px-24 scroll-smooth">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center max-w-4xl mx-auto space-y-6">
                            <div className="w-24 h-24 bg-red-50 rounded-3xl flex items-center justify-center mb-2 shadow-sm border border-red-100 rotate-3">
                                <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">OnGround AI Assistant</h2>
                                <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">
                                    Analyze retail data, classify store imagery, and generate strategic insights as an <span className="font-bold text-red-600 underline underline-offset-4 decoration-red-200">{activePersona.name}</span>.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full mt-4">
                                {SUGGESTIONS.map((suggestion, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setDescription(suggestion)}
                                        className="text-left p-4 rounded-2xl bg-gray-50 hover:bg-red-50 border border-gray-100 hover:border-red-100 transition-all text-sm font-medium text-gray-600 hover:text-red-700 shadow-sm"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-5xl mx-auto space-y-10">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex gap-6 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'assistant' && (
                                        <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm border border-red-100">
                                            <img src="/logo.png" alt="AI" className="w-6 h-6 object-contain" />
                                        </div>
                                    )}

                                    <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-gray-100 rounded-[2rem] px-6 py-4 text-gray-900 shadow-sm border border-gray-200/50' : 'text-gray-800 leading-relaxed pt-1'}`}>
                                        {(msg.image || msg.documentName) && msg.role === 'user' && (
                                            <div className="flex gap-3 mb-3 flex-wrap">
                                                {msg.image && (
                                                    <div className="bg-white rounded-2xl p-1.5 border border-gray-200 shadow-sm">
                                                        <img src={msg.image} className="h-32 w-auto rounded-xl object-cover" />
                                                    </div>
                                                )}
                                                {msg.documentName && (
                                                    <div className="bg-white rounded-2xl p-4 border border-gray-200 flex items-center gap-3 shadow-sm">
                                                        <FileText className="w-6 h-6 text-red-500" />
                                                        <span className="text-sm font-bold text-gray-700">{msg.documentName}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {msg.role === 'user' ? (
                                            <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
                                        ) : (
                                            <div className="prose prose-sm sm:prose-base prose-red max-w-none prose-headings:font-bold prose-a:text-red-600 prose-img:rounded-3xl prose-code:bg-gray-50 prose-code:rounded-lg prose-code:px-1.5 prose-code:py-0.5">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-6">
                                    <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0 border border-red-100 shadow-sm">
                                        <img src="/logo.png" alt="AI" className="w-6 h-6 object-contain animate-pulse" />
                                    </div>
                                    <div className="flex items-center text-sm text-gray-500 font-bold bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
                                        <Loader2 className="w-4 h-4 animate-spin mr-3 text-red-600" />
                                        Computing insights with {models.find(m => m.id === activeModel)?.name || activeModel}...
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-6 md:px-12 lg:px-24 bg-white/80 backdrop-blur-md border-t border-gray-100">
                    <div className="max-w-5xl mx-auto space-y-4">
                        {(image || documentName) && (
                            <div className="flex items-center gap-4 mb-2 px-1">
                                {image && (
                                    <div className="relative group">
                                        <div className="bg-white border-2 border-red-50 p-1.5 rounded-2xl shadow-md">
                                            <img src={image} className="w-16 h-16 object-cover rounded-xl" />
                                        </div>
                                        <button onClick={() => setImage(null)} className="absolute -top-3 -right-3 bg-gray-900 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-xl transition-colors ring-2 ring-white">×</button>
                                    </div>
                                )}
                                {documentName && (
                                    <div className="relative group flex items-center gap-3 bg-red-50 border border-red-100 px-4 py-3 rounded-2xl shadow-sm">
                                        <FileText className="w-5 h-5 text-red-600" />
                                        <span className="text-xs font-bold text-gray-700 max-w-[150px] truncate">{documentName}</span>
                                        <button onClick={() => { setDocumentName(null); setDocumentContent(null) }} className="absolute -top-3 -right-3 bg-gray-900 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-xl transition-colors ring-2 ring-white">×</button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="relative bg-white border border-gray-200 focus-within:border-red-400 focus-within:ring-4 focus-within:ring-red-50/50 rounded-2xl flex items-end p-2 transition-all shadow-sm max-w-4xl mx-auto">
                            <div className="relative flex-shrink-0">
                                <button
                                    onClick={() => setShowUploadMenu(!showUploadMenu)}
                                    className={`p-2.5 rounded-xl transition-all ${showUploadMenu ? 'bg-red-600 text-white rotate-45' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                >
                                    <Plus className="w-5 h-5" />
                                </button>

                                {showUploadMenu && (
                                    <div className="absolute bottom-full left-0 mb-3 bg-white border border-gray-100 rounded-2xl shadow-xl p-2 flex flex-col gap-1 min-w-[160px] animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
                                        <button
                                            onClick={() => { fileInputRef.current?.click(); setShowUploadMenu(false); }}
                                            className="flex items-center gap-3 px-3 py-2.5 hover:bg-red-50 rounded-xl transition-colors text-gray-600 hover:text-red-600"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                                                <ImageIcon className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs font-bold">Image</span>
                                        </button>
                                        <button
                                            onClick={() => { docInputRef.current?.click(); setShowUploadMenu(false); }}
                                            className="flex items-center gap-3 px-3 py-2.5 hover:bg-red-50 rounded-xl transition-colors text-gray-600 hover:text-red-700"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs font-bold">Document</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={`Ask Assistant...`}
                                className="flex-1 bg-transparent px-4 py-2.5 max-h-48 min-h-[44px] focus:outline-none resize-none text-[15px] placeholder-gray-400 font-medium leading-relaxed"
                                rows={1}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleAnalyze();
                                    }
                                }}
                            />

                            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" id="upload-img" />
                            <input type="file" accept=".txt,.json,.csv,.md" ref={docInputRef} onChange={handleDocumentUpload} className="hidden" id="upload-doc" />

                            <button
                                onClick={handleAnalyze}
                                disabled={isLoading || (!description.trim() && !image && !documentContent)}
                                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-100 disabled:text-gray-300 text-white rounded-xl p-2.5 transition-all shadow-md shadow-red-100 disabled:shadow-none flex-shrink-0"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">Verify critical AI outputs with market documentation.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
