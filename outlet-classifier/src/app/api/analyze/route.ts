import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { apiKey, description, image, documentContent, history, aso_id, aso_name, persona, modelName } = body;

        const apiKeyToUse = apiKey || process.env.GEMINI_API_KEY;
        if (!apiKeyToUse) {
            return NextResponse.json({ error: 'API key is required' }, { status: 400 });
        }

        const selectedModel = modelName || 'gemini-1.5-flash';

        // Prepare context from Backend (FastAPI)
        let marketContext = "";
        try {
            const query = aso_name ? `aso=${encodeURIComponent(aso_name)}` : "";
            const [kpiRes, skusRes] = await Promise.all([
                fetch(`http://localhost:8001/api/kpis?${query}`).then(r => r.json()),
                fetch(`http://localhost:8001/api/charts/top-skus?n=10&${query}`).then(r => r.json())
            ]);

            marketContext = `
## Current Market Snapshot ${aso_name ? `for ASO: ${aso_name}` : '(Universal View)'}
- Total Sales Revenue: ₹${kpiRes.total_sales.toLocaleString('en-IN')}
- Active Market Outlets: ${kpiRes.total_outlets}
- Average Order Value per Store: ₹${kpiRes.avg_sales_per_outlet.toLocaleString('en-IN')}
- Unique SKUs in Circulation: ${kpiRes.total_skus}

## Top 10 High-Velocity Products
${(skusRes || []).map((s: any, i: number) => `${i + 1}. ${s.sku} (₹${s.sales.toLocaleString('en-IN')})`).join('\n')}
`;
        } catch (e) {
            console.error('Failed to load market context from backend', e);
            marketContext = "Error: Data backend is currently unreachable. Operating on visual and document context only.";
        }

        const activePersonaDesc = persona || 'an AI Market Intelligence Assistant';
        const asoHeading = aso_name ? `acting as the persona of ${aso_name} (Area Sales Officer)` : 'acting as a Senior Regional Manager';

        const systemPrompt = `
You are OnGround AI, a high-performance market intelligence engine designed for Whirlpool's ground operations.
You are currently ${asoHeading} and ${activePersonaDesc}.

${marketContext}

${documentContent ? `## Reference Documents\n"${documentContent}"` : ''}

### Operational Guidelines:
1. Provide extremely professional, data-driven insights.
2. If the user asks about specific performance, refer to the "Current Market Snapshot" provided above.
3. Be concise and use Markdown tables or lists for data presentation.
4. Your tone should be authoritative but supportive to ground staff.
`;

        // Initialize Gemini API
        const genAI = new GoogleGenerativeAI(apiKeyToUse);
        const model = genAI.getGenerativeModel({
            model: selectedModel,
            systemInstruction: systemPrompt
        });

        // Initialize Chat with History
        const chatHistory = (history || []).map((msg: any) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const chat = model.startChat({
            history: chatHistory,
        });

        const userMessageParts: any[] = [];
        if (description) userMessageParts.push({ text: description });

        if (image) {
            const base64Data = image.split(',')[1];
            const mimeType = image.split(';')[0].split(':')[1];
            userMessageParts.push({
                inlineData: {
                    data: base64Data,
                    mimeType,
                },
            });
        }

        const result = await chat.sendMessage(userMessageParts);
        const responseText = result.response.text();

        return NextResponse.json({ result: responseText }, { status: 200 });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
