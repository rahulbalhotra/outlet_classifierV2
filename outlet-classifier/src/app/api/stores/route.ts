import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const aso_id = searchParams.get('aso_id');

        const dataPath = path.join(process.cwd(), 'src', 'data', 'retail_store_data_v2.json');
        const dataStr = fs.readFileSync(dataPath, 'utf8');
        let storeData = JSON.parse(dataStr);

        if (aso_id && aso_id !== 'all') {
            storeData = storeData.filter((store: Record<string, unknown>) => {
                const details = store.aso_details as Record<string, string> | undefined;
                return details?.aso_id === aso_id;
            });
        }

        const enhancedData = storeData.map((store: Record<string, unknown>) => {
            const history = (store.monthly_sales_history || []) as Array<Record<string, unknown>>;
            const totalSales = history.reduce((acc: number, entry) => acc + (Number(entry.sales_value_inr) || 0), 0);

            const monthWiseSales: Record<string, number> = {};
            history.forEach((entry) => {
                monthWiseSales[String(entry.month)] = Number(entry.sales_value_inr) || 0;
            });

            return {
                ...store,
                totalSales,
                month_wise_sales: monthWiseSales
            };
        });

        return NextResponse.json({ stores: enhancedData }, { status: 200 });
    } catch (error: unknown) {
        console.error('Stores API Error:', error);
        return NextResponse.json({ error: 'Failed to load stores' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const newStore = await req.json();
        const dataPath = path.join(process.cwd(), 'src', 'data', 'retail_store_data_v2.json');
        const dataStr = fs.readFileSync(dataPath, 'utf8');
        const stores = JSON.parse(dataStr);

        // Generate new ID
        const lastId = stores.length > 0 ? stores[stores.length - 1].store_id : 'STR_000';
        const idNum = parseInt(lastId.split('_')[1]) + 1;
        const newId = `STR_${String(idNum).padStart(3, '0')}`;

        const storeToAdd = {
            ...newStore,
            store_id: newId,
            last_audit_date: new Date().toISOString().split('T')[0],
            growth_rate_percentage: 0,
            monthly_sales_history: []
        };

        stores.push(storeToAdd);
        fs.writeFileSync(dataPath, JSON.stringify(stores, null, 4), 'utf8');

        return NextResponse.json({ success: true, store: storeToAdd }, { status: 201 });
    } catch (error: unknown) {
        console.error('Stores POST Error:', error);
        return NextResponse.json({ error: 'Failed to add store' }, { status: 500 });
    }
}
