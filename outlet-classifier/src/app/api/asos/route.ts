import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';

export async function GET() {
    try {
        const dataPath = path.join(process.cwd(), 'src', 'data', 'retail_store_data_v2.json');
        const dataStr = fs.readFileSync(dataPath, 'utf8');
        const storeData = JSON.parse(dataStr);

        const asosMap = new Map();
        storeData.forEach((store: any) => {
            if (store.aso_details) {
                asosMap.set(store.aso_details.aso_id, store.aso_details.aso_name);
            }
        });

        const asos = Array.from(asosMap.entries()).map(([id, name]) => ({ id, name }));
        return NextResponse.json({ asos }, { status: 200 });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to load ASOs' }, { status: 500 });
    }
}
