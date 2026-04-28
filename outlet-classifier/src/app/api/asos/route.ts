import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    try {
        const fs = require('fs');
        const path = require('path');
        const dataPath = path.join(process.cwd(), 'src', 'data', 'retail_store_data_v3.json');
        const dataStr = fs.readFileSync(dataPath, 'utf8');
        const storeData = JSON.parse(dataStr);

        // Extract unique ASOs
        const uniqueAsos = Array.from(new Set(storeData.map((s: any) => s.aso_details?.ASO).filter(Boolean)));

        const asos = uniqueAsos.map((name: any) => ({
            id: name,
            name: name
        }));

        return NextResponse.json({ asos }, { status: 200 });
    } catch (error: any) {
        console.error('ASO API Error:', error);
        return NextResponse.json({ asos: [] }, { status: 200 });
    }
}
