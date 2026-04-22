import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { apiKey, description, image, documentContent, history, aso_id, aso_name, persona, modelName } = body;

        if (!apiKey) {
            return NextResponse.json({ error: 'API key is required' }, { status: 400 });
        }

        if (!description && !image && !documentContent) {
            return NextResponse.json({ error: 'Context is required' }, { status: 400 });
        }

        const selectedModel = modelName || 'gemini-1.5-pro';

        // Prepare Prompt Context
        const activePersonaDesc = persona || (aso_id ? 'an Area Sales Officer Assistant focusing exclusively on this ASO\'s region' : 'an Admin/Expert Database Assistant with access to all ASO regions');

        const dataPath = 'd:\\OutlesClassifier-ChatAssist\\retail_store_data_v2.json';
        let storeData = [];
        try {
            const dataStr = fs.readFileSync(dataPath, 'utf8');
            storeData = JSON.parse(dataStr);
        } catch (e) {
            console.error('Failed to load store data', e);
            storeData = []; // Fallback to empty
        }

        if (aso_id) {
            storeData = storeData.filter((store: any) => store.aso_details?.aso_id === aso_id);
        }

        const dbSnapshot = JSON.stringify(storeData.slice(0, 50), null, 2);

        let systemPrompt = "";
        try {
            const promptTemplate = fs.readFileSync('d:\\OutlesClassifier-ChatAssist\\outlet-classifier\\prompts\\v1_aso.md', 'utf8');
            systemPrompt = promptTemplate
                .replace('{{persona}}', activePersonaDesc)
                .replace(/\{\{aso_name\}\}/g, aso_name || 'Officer')
                .replace('{{database_snapshot}}', dbSnapshot)
                .replace('{{document_section}}', documentContent ? `## Additional Context\n"${documentContent}"` : '');
        } catch (e) {
            systemPrompt = `You are ${activePersonaDesc}. Database Snapshot: ${dbSnapshot}`;
        }

        // Initialize Gemini API with System Instruction
        const genAI = new GoogleGenerativeAI(apiKey);
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
