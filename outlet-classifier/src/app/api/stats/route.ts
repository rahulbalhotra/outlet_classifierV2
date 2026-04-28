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
            storeData = storeData.filter((store: any) => store.aso_details?.ASO === aso_id);
        }

        if (storeData.length === 0) {
            return NextResponse.json({
                kpis: { totalStores: 0, totalSales: 0, avgGrowth: '0.00', avgSalesPerStore: '0' },
                breakdowns: { segments: {}, storeTypes: {}, asoPerformance: [], topStores: [], locations: {}, storeLocations: [], monthlySalesTrend: {} }
            });
        }

        const totalStores = storeData.length;
        const totalSales = storeData.reduce((acc: number, store: any) => {
            const history = store.monthly_sales_history || [];
            return acc + history.reduce((sAcc: number, entry: any) => sAcc + (Number(entry.sales_value_inr) || 0), 0);
        }, 0);

        const totalSkusSet = new Set<string>();
        const segments: Record<string, { sales: number, count: number }> = {};
        const storeTypes: Record<string, { sales: number, count: number }> = {};
        const locations: Record<string, number> = {};
        const storeLocations: Array<any> = [];
        const monthlySalesTrend: Record<string, number> = {};
        const skuPerformance: Record<string, number> = {};
        const distributorPerformance: Record<string, number> = {};

        storeData.forEach((store: any) => {
            const seg = store.Segment_Name || 'Unknown';
            const history = store.monthly_sales_history || [];
            const storeSales = history.reduce((sAcc: number, entry: any) => sAcc + (Number(entry.sales_value_inr) || 0), 0);

            if (!segments[seg]) segments[seg] = { sales: 0, count: 0 };
            segments[seg].sales += storeSales;
            segments[seg].count += 1;

            const type = store.Outlet_Type || 'Unknown';
            if (!storeTypes[type]) storeTypes[type] = { sales: 0, count: 0 };
            storeTypes[type].sales += storeSales;
            storeTypes[type].count += 1;

            const loc = store.Route_Name || 'Unknown';
            locations[loc] = (locations[loc] || 0) + 1;

            if (store.latitude && store.longitude) {
                storeLocations.push({
                    Outlet_ID: store.Outlet_ID,
                    Latitude: store.latitude,
                    Longitude: store.longitude,
                    'Sales in Rs.': storeSales,
                    Segment_Name: seg,
                    Outlet_Location: `${store.latitude}, ${store.longitude}`
                });
            }

            // SKU Tracking
            (store.sku_list || []).forEach((sku: string) => {
                totalSkusSet.add(sku);
                skuPerformance[sku] = (skuPerformance[sku] || 0) + (storeSales / Math.max(1, store.sku_list.length));
            });

            // Distributor tracking
            const dist = store.Distributor_Name || 'Unknown';
            distributorPerformance[dist] = (distributorPerformance[dist] || 0) + storeSales;

            // Consolidate monthly trend
            history.forEach((h: any) => {
                monthlySalesTrend[h.month] = (monthlySalesTrend[h.month] || 0) + (Number(h.sales_value_inr) || 0);
            });
        });

        // Format for Dashboard
        const trend = Object.entries(monthlySalesTrend).map(([month, sales]) => ({
            month: new Date(month).toISOString().split('T')[0].slice(0, 7), // YYYY-MM
            sales
        })).sort((a, b) => a.month.localeCompare(b.month));

        const totalSalesVal = Object.values(monthlySalesTrend).reduce((a, b) => a + b, 0);
        const categoryDist = Object.entries(storeTypes).map(([category, data]) => ({
            category,
            sales: data.sales,
            percentage: totalSalesVal > 0 ? Number(((data.sales / totalSalesVal) * 100).toFixed(2)) : 0
        })).sort((a, b) => b.sales - a.sales);

        const segmentation = Object.entries(segments).map(([segment, data]) => ({
            segment,
            sales: data.sales,
            unique_outlets: data.count
        })).sort((a, b) => b.sales - a.sales);

        const topSkus = Object.entries(skuPerformance)
            .map(([sku, sales]) => ({ sku, sales }))
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 10);

        const topDistributors = Object.entries(distributorPerformance)
            .map(([distributor, sales]) => ({ distributor, sales }))
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 5);

        return NextResponse.json({
            kpis: {
                total_sales: totalSales,
                total_volume: totalSales / 100, // Placeholder ratio
                total_outlets: totalStores,
                avg_sales_per_outlet: totalSales / totalStores,
                total_skus: totalSkusSet.size
            },
            trend,
            categoryDist,
            locations: storeLocations,
            segmentation,
            topSkus,
            topDistributors
        }, { status: 200 });
    } catch (error: any) {
        console.error('Stats API Error:', error);
        return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
    }
}
