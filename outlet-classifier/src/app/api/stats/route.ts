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
            storeData = storeData.filter((store: any) => store.aso_details?.aso_id === aso_id);
        }

        if (storeData.length === 0) {
            return NextResponse.json({
                kpis: { totalStores: 0, totalSales: 0, avgGrowth: 0, avgSalesPerStore: 0 },
                breakdowns: { segments: {}, storeTypes: {}, asoPerformance: [], topStores: [], locations: {}, storeLocations: [], monthlySalesTrend: {} }
            });
        }

        const totalStores = storeData.length;
        const totalSales = storeData.reduce((acc: number, store: any) => {
            const history = store.monthly_sales_history || [];
            return acc + history.reduce((sAcc: number, entry: any) => sAcc + (Number(entry.sales_value_inr) || 0), 0);
        }, 0);



        const segments: Record<string, number> = {};
        const storeTypes: Record<string, number> = {};
        const locations: Record<string, number> = {};
        const storeLocations: Array<{ name: string, lat: number, lng: number, segmentation: string, location: string }> = [];
        const monthlySalesTrend: Record<string, number> = {};

        storeData.forEach((store: any) => {
            const seg = store.segmentation || 'Unknown';
            segments[seg] = (segments[seg] || 0) + 1;

            const type = store.store_type || 'Unknown';
            storeTypes[type] = (storeTypes[type] || 0) + 1;

            const loc = store.location || 'Unknown';
            locations[loc] = (locations[loc] || 0) + 1;

            if (store.latitude && store.longitude) {
                storeLocations.push({
                    name: store.store_name,
                    lat: store.latitude,
                    lng: store.longitude,
                    segmentation: store.segmentation,
                    location: store.location
                });
            }

            // Consolidate monthly trend
            const history = store.monthly_sales_history || [];
            history.forEach((h: any) => {
                monthlySalesTrend[h.month] = (monthlySalesTrend[h.month] || 0) + (Number(h.sales_value_inr) || 0);
            });
        });

        const topStores = storeData
            .map((s: any) => {
                const history = s.monthly_sales_history || [];
                return {
                    name: s.store_name,
                    sales: history.reduce((sAcc: number, entry: any) => sAcc + (Number(entry.sales_value_inr) || 0), 0),
                    location: s.location,
                    type: s.store_type
                };
            })
            .sort((a: any, b: any) => b.sales - a.sales)
            .slice(0, 5);

        // Calculate MoM Growth from the trend data
        const sortedMonths = Object.keys(monthlySalesTrend).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        let momGrowth = 0;
        if (sortedMonths.length >= 2) {
            const currentMonth = sortedMonths[sortedMonths.length - 1];
            const prevMonth = sortedMonths[sortedMonths.length - 2];
            const currentSales = monthlySalesTrend[currentMonth];
            const prevSales = monthlySalesTrend[prevMonth];
            if (prevSales > 0) {
                momGrowth = ((currentSales - prevSales) / prevSales) * 100;
            }
        }

        return NextResponse.json({
            kpis: {
                totalStores,
                totalSales,
                avgGrowth: momGrowth.toFixed(2),
                avgSalesPerStore: (totalSales / totalStores).toFixed(0)
            },
            breakdowns: {
                segments,
                storeTypes,
                topStores,
                locations,
                storeLocations,
                monthlySalesTrend
            }
        }, { status: 200 });
    } catch (error: any) {
        console.error('Stats API Error:', error);
        return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
    }
}
