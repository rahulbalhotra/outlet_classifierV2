import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { aso_name, store_name, store_type, location, avg_monthly_order_value_inr, image, apiKey, modelName } = body;

        // Load store data
        const dataPath = 'd:\\OutlesClassifier-ChatAssist\\retail_store_data_v2.json';
        const dataStr = fs.readFileSync(dataPath, 'utf8');
        const stores = JSON.parse(dataStr);

        // Filter based on location and aso_name
        let similarStores = stores.filter((s: any) =>
            s.location.toLowerCase() === location.toLowerCase() ||
            s.aso_details?.aso_name === aso_name
        );

        // Find similar stores based on store_type
        let typeSimilarStores = similarStores.filter((s: any) => s.store_type === store_type);

        // If too many, take a subset for results view
        const displayResults = (typeSimilarStores.length > 0 ? typeSimilarStores : similarStores).slice(0, 4);

        let resultData;
        let finalSource = "Rule-Based Engine";

        if (apiKey) {
            try {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: modelName || 'gemini-1.5-flash' });

                const peerContext = displayResults.map((s: any) => ({
                    name: s.store_name,
                    type: s.store_type,
                    location: s.location,
                    segmentation: s.segmentation,
                    avg_val: s.avg_monthly_order_value_inr
                }));

                // Load Versioned System Prompt
                let promptText = "";
                try {
                    const promptTemplate = fs.readFileSync('d:\\OutlesClassifier-ChatAssist\\outlet-classifier\\prompts\\v1_classifier.md', 'utf8');
                    promptText = promptTemplate
                        .replace(/{{peer_stores}}/g, JSON.stringify(peerContext, null, 2))
                        .replace(/{{store_name}}/g, store_name)
                        .replace(/{{store_type}}/g, store_type)
                        .replace(/{{location}}/g, location)
                        .replace(/{{estimated_value}}/g, String(avg_monthly_order_value_inr));
                } catch (e) {
                    console.error("Failed to load classifier prompt template, using inline fallback");
                    promptText = `Classify this store: ${store_name}, Type: ${store_type}, Location: ${location}. Peer data: ${JSON.stringify(peerContext)}`;
                }

                const parts: any[] = [promptText];
                if (image) {
                    const base64Data = image.split(',')[1];
                    const mimeType = image.split(';')[0].split(':')[1];
                    parts.push({
                        inlineData: { data: base64Data, mimeType }
                    });
                }

                const geminiResult = await model.generateContent(parts);
                const text = geminiResult.response.text();

                // Extract JSON from response
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    resultData = JSON.parse(jsonMatch[0]);
                    finalSource = "Gemini AI";
                } else {
                    throw new Error("Gemini failed to return valid JSON");
                }
            } catch (err) {
                console.error("Gemini AI failed, falling back to rule-based:", err);
                finalSource = "Rule-Based Engine (AI Fallback)";
                resultData = null; // Trigger heuristic below
            }
        }

        if (!resultData) {
            // Heuristic fallback (Used if no API key OR if AI call failed)
            let suggestedSegmentation = "Mass Market";
            if (avg_monthly_order_value_inr > 200000) suggestedSegmentation = "Premium";
            else if (avg_monthly_order_value_inr > 80000) suggestedSegmentation = "Value";

            const areaAvg = typeSimilarStores.length > 0
                ? typeSimilarStores.reduce((acc: number, s: any) => acc + s.avg_monthly_order_value_inr, 0) / typeSimilarStores.length
                : avg_monthly_order_value_inr;

            resultData = {
                store_name,
                store_type,
                location,
                avg_monthly_order_value_inr: Math.round(areaAvg),
                segmentation: suggestedSegmentation,
                morphology_analysis: `Safety Fallback: Based on regional benchmarks in ${location}, this store shows stable potential for ${store_type} format.`,
                confidence_score: 85
            };
        }

        const finalResponse = {
            classification: {
                ...resultData,
                aso_name,
                source: finalSource
            },
            aiError: finalSource.includes("Fallback") ? "Gemini Error: Rate limit or API issue. Using rule-based fallback." : null,
            similar_stores: displayResults.map((s: any) => {
                const history = (s.monthly_sales_history || []) as Array<Record<string, unknown>>;
                const totalSales = history.reduce((acc: number, entry) => acc + (Number(entry.sales_value_inr) || 0), 0);
                const monthWiseSales: Record<string, number> = {};
                history.forEach((entry) => {
                    monthWiseSales[String(entry.month)] = Number(entry.sales_value_inr) || 0;
                });
                return { ...s, totalSales, month_wise_sales: monthWiseSales };
            })
        };

        return NextResponse.json(finalResponse, { status: 200 });
    } catch (error: any) {
        console.error('Classify API Error:', error);
        return NextResponse.json({ error: 'Failed to classify store: ' + error.message }, { status: 500 });
    }
}
