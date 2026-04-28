import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const aso_id = searchParams.get('aso_id');

        const dataPath = path.join(process.cwd(), 'src', 'data', 'retail_store_data_v3.json');
        const dataStr = fs.readFileSync(dataPath, 'utf8');
        let storeData = JSON.parse(dataStr);

        if (aso_id && aso_id !== 'all') {
            storeData = storeData.filter((store: Record<string, any>) => {
                return store.aso_details?.ASO === aso_id;
            });
        }

        const enhancedData = storeData.map((store: Record<string, any>) => {
            const history = (store.monthly_sales_history || []) as Array<Record<string, any>>;
            const totalSales = history.reduce((acc: number, entry) => acc + (Number(entry.sales_value_inr) || 0), 0);

            const monthWiseSales: Record<string, number> = {};
            history.forEach((entry) => {
                monthWiseSales[String(entry.month)] = Number(entry.sales_value_inr) || 0;
            });

            // Map v3 keys to frontend keys
            return {
                store_id: store.Outlet_ID,
                store_name: store.Distributor_Name,
                store_type: store.Outlet_Type,
                route_name: store.Route_Name || store.route_name,
                latitude: store.latitude,
                longitude: store.longitude,
                segmentation: store.Segment_Name,
                avg_monthly_order_value_inr: store.avg_monthly_order_value_inr,
                growth_rate_percentage: store.growth_rate_percentage,
                unique_sku_count: store.unique_sku_count,
                sku_list: store.sku_list,
                aso_details: {
                    aso_id: store.aso_details?.ASO,
                    aso_name: store.aso_details?.ASO
                },
                last_audit_date: store.last_audit_date,
                totalSales,
                month_wise_sales: monthWiseSales,
                image: store.store_image ? `/api/image?store_id=${store.Outlet_ID}` : null
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
        const dataPath = path.join(process.cwd(), 'src', 'data', 'retail_store_data_v3.json');
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
