import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const dataPath = path.join(process.cwd(), 'src', 'data', 'retail_store_data_v3.json');
        const dataStr = fs.readFileSync(dataPath, 'utf8');
        const storeData = JSON.parse(dataStr);

        const categories = Array.from(new Set(storeData.map((s: any) => s.Outlet_Type).filter(Boolean))) as string[];
        const subcategories = Array.from(new Set(storeData.map((s: any) => s.Route_Name).filter(Boolean))) as string[];
        const regions = Array.from(new Set(storeData.map((s: any) => s.Route_Name).filter(Boolean))) as string[]; // Placeholder for regions
        const segments = Array.from(new Set(storeData.map((s: any) => s.Segment_Name).filter(Boolean))) as string[];
        const asos = Array.from(new Set(storeData.map((s: any) => s.aso_details?.ASO).filter(Boolean))) as string[];

        return NextResponse.json({
            categories,
            subcategories,
            regions,
            segments,
            asos
        });
    } catch (error) {
        console.error('Filters API Error:', error);
        return NextResponse.json({ categories: [], subcategories: [], regions: [], segments: [], asos: [] });
    }
}
