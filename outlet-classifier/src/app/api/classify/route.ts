import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Cache for image hashes to enable deterministic lookup
let imageHashCache: Record<string, { store_id: string, folder: string, file: string }> | null = null;

function getHash(data: Buffer | string) {
    return crypto.createHash('md5').update(data).digest('hex');
}

function initializeImageCache() {
    if (imageHashCache) return;
    imageHashCache = {};
    const baseDir = path.join(process.cwd(), 'src', 'store_dataset_jpeg');
    const folders = ['Hypermarket', 'Kirana', 'Mart', 'Supermarket'];

    folders.forEach(folder => {
        const folderPath = path.join(baseDir, folder);
        const metadataPath = path.join(folderPath, 'image_metadata.json');
        if (!fs.existsSync(metadataPath)) return;

        try {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            metadata.forEach((entry: any) => {
                const imgPath = path.join(folderPath, entry.image_name);
                if (fs.existsSync(imgPath)) {
                    const hash = getHash(fs.readFileSync(imgPath));
                    imageHashCache![hash] = {
                        store_id: entry.store_id,
                        folder: folder,
                        file: entry.image_name
                    };
                }
            });
        } catch (e) {
            console.error(`Error caching hashes for ${folder}:`, e);
        }
    });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log('Classify Request:', { ...body, image: body.image ? 'present' : 'absent' });
        const { aso_name, store_name, store_type, route_name, avg_monthly_order_value_inr, image, apiKey, modelName } = body;

        // Load store data
        const dataPath = path.join(process.cwd(), 'src', 'data', 'retail_store_data_v3.json');
        const dataStr = fs.readFileSync(dataPath, 'utf8');
        const stores = JSON.parse(dataStr);

        let identifiedStore: any = null;
        let resultData: any = null;
        let finalSource = "Rule-Based Engine";

        // 1. Visual Identity Check (Deterministic Lookup)
        if (image) {
            initializeImageCache();
            const base64Data = image.split(',')[1];
            const imageBuffer = Buffer.from(base64Data, 'base64');
            const incomingHash = getHash(imageBuffer);

            const match = imageHashCache![incomingHash];
            if (match) {
                identifiedStore = stores.find((s: any) => s.store_id === match.store_id);
                if (identifiedStore) {
                    finalSource = "Dataset Match (Deterministic)";
                    resultData = {
                        store_name: identifiedStore.Distributor_Name || identifiedStore.store_name,
                        store_type: identifiedStore.Outlet_Type || identifiedStore.store_type,
                        route_name: identifiedStore.Route_Name || identifiedStore.route_name,
                        avg_monthly_order_value_inr: identifiedStore.avg_monthly_order_value_inr,
                        segmentation: identifiedStore.Segment_Name || identifiedStore.segmentation,
                        assumed_sku_count: identifiedStore.unique_sku_count,
                        assumed_sku_list: identifiedStore.sku_list,
                        morphology_analysis: `Exact match found in visual dataset. Identified as ${identifiedStore.Outlet_ID} standard format.`,
                        confidence_score: 100,
                        matched_store_id: identifiedStore.Outlet_ID
                    };
                }
            }
        }

        // Filter for neighbors/context
        let similarStores = stores.filter((s: any) =>
            s && (
                ((s.Route_Name || s.route_name || "").toString().trim().toLowerCase() === (route_name || "").toString().trim().toLowerCase()) ||
                (s.aso_details?.ASO === aso_name)
            )
        );

        let typeSimilarStores = similarStores.filter((s: any) => s.store_type === store_type);
        const displayResults = (typeSimilarStores.length > 0 ? typeSimilarStores : similarStores).slice(0, 4);

        // 2. AI Classification (if not matched or to refine)
        const apiKeyToUse = apiKey || process.env.GEMINI_API_KEY;
        if (!resultData && apiKeyToUse) {
            try {
                const genAI = new GoogleGenerativeAI(apiKeyToUse);
                const model = genAI.getGenerativeModel({
                    model: modelName || 'gemini-1.5-flash',
                    generationConfig: { temperature: 0 } // Always produce same output for same input
                });

                const peerContext = displayResults.map((s: any) => ({
                    name: s.store_name,
                    type: s.store_type,
                    route: s.Route_Name || s.route_name,
                    segmentation: s.segmentation,
                    avg_val: s.avg_monthly_order_value_inr
                }));

                let promptText = "";
                try {
                    const promptTemplate = fs.readFileSync(path.join(process.cwd(), 'prompts', 'v1_classifier.md'), 'utf8');
                    promptText = promptTemplate
                        .replace(/{{peer_stores}}/g, JSON.stringify(peerContext, null, 2))
                        .replace(/{{store_name}}/g, store_name)
                        .replace(/{{store_type}}/g, store_type)
                        .replace(/{{location}}/g, route_name)
                        .replace(/{{estimated_value}}/g, String(avg_monthly_order_value_inr))
                        .replace(/{{user_sku_count}}/g, String(body.estimated_sku_count || 'Unknown'))
                        .replace(/{{user_sku_tags}}/g, body.sku_tags || 'None');
                } catch (e) {
                    promptText = `Classify this store: ${store_name}, Type: ${store_type}, Route: ${route_name}. Peer data: ${JSON.stringify(peerContext)}`;
                }

                const parts: any[] = [promptText];
                if (image) {
                    const base64Data = image.split(',')[1];
                    const mimeType = image.split(';')[0].split(':')[1];
                    parts.push({ inlineData: { data: base64Data, mimeType } });
                }

                const geminiResult = await model.generateContent(parts);
                const text = geminiResult.response.text();
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    resultData = JSON.parse(jsonMatch[0]);
                    finalSource = "Gemini AI";
                }
            } catch (err) {
                console.error("Gemini AI failed:", err);
            }
        }

        // 3. Heuristic Fallback
        if (!resultData) {
            let suggestedSegmentation = "Mass Market";
            if (avg_monthly_order_value_inr > 200000) suggestedSegmentation = "Premium";
            else if (avg_monthly_order_value_inr > 80000) suggestedSegmentation = "Value";

            const areaAvg = typeSimilarStores.length > 0
                ? typeSimilarStores.reduce((acc: number, s: any) => acc + s.avg_monthly_order_value_inr, 0) / typeSimilarStores.length
                : avg_monthly_order_value_inr;

            resultData = {
                store_name,
                store_type,
                route_name,
                avg_monthly_order_value_inr: Math.round(areaAvg),
                segmentation: suggestedSegmentation,
                assumed_sku_count: 15,
                assumed_sku_list: ["Universal FMCG Pack", "General Groceries", "Regional Staples"],
                morphology_analysis: `Safety Fallback: Based on regional benchmarks on ${route_name}, this store shows stable potential.`,
                confidence_score: 85
            };
        }

        const finalResponse = {
            classification: {
                ...resultData,
                aso_name,
                source: finalSource
            },
            aiError: finalSource.includes("Fallback") ? "Gemini Error: Using rule-based fallback." : null,
            similar_stores: (identifiedStore ? [identifiedStore, ...displayResults.filter((s: any) => s.Outlet_ID !== identifiedStore.Outlet_ID)] : displayResults).slice(0, 4).map((s: any) => {
                const history = (s.monthly_sales_history || []) as Array<Record<string, unknown>>;
                const totalSales = history.reduce((acc: number, entry) => acc + (Number(entry.sales_value_inr) || 0), 0);
                const monthWiseSales: Record<string, number> = {};
                history.forEach((entry) => {
                    monthWiseSales[String(entry.month)] = Number(entry.sales_value_inr) || 0;
                });
                return {
                    store_id: s.Outlet_ID || s.store_id,
                    store_name: s.Distributor_Name || s.store_name,
                    store_type: s.Outlet_Type || s.store_type,
                    route_name: s.Route_Name || s.route_name,
                    segmentation: s.Segment_Name || s.segmentation,
                    avg_monthly_order_value_inr: s.avg_monthly_order_value_inr,
                    growth_rate_percentage: s.growth_rate_percentage,
                    totalSales,
                    month_wise_sales: monthWiseSales,
                    image: s.store_image ? `/api/image?store_id=${s.Outlet_ID}` : null
                };
            })
        };

        return NextResponse.json(finalResponse, { status: 200 });
    } catch (error: any) {
        console.error('Classify API Error:', error);
        return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
    }
}
