import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    try {
        // Fetch ASOs from the backend semantic layer
        const res = await fetch('http://localhost:8001/api/filters');
        const data = await res.json();

        // Map the strings from 'asos' array to { id, name } objects
        const asos = (data.asos || []).map((name: string) => ({
            id: name, // Using name as ID since it's unique in this dataset
            name: name
        }));

        return NextResponse.json({ asos }, { status: 200 });
    } catch (error: any) {
        console.error('API Error:', error);
        // Return empty list if backend is not reachable
        return NextResponse.json({ asos: [] }, { status: 200 });
    }
}
