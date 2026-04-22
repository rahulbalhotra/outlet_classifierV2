import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const preferredType = searchParams.get('type');
        const index = parseInt(searchParams.get('index') || '0');

        const baseDir = 'd:\\OutlesClassifier-ChatAssist\\outlet-classifier\\src\\store_dataset_jpeg';

        // Get all subdirectories (categories)
        const categories = fs.readdirSync(baseDir).filter(f => fs.statSync(path.join(baseDir, f)).isDirectory());

        // Collect all images from all categories to allow for "random" variety
        let allImages: { type: string, file: string }[] = [];
        categories.forEach(cat => {
            const files = fs.readdirSync(path.join(baseDir, cat)).filter(f => f.match(/\.(jpg|jpeg|png)$/i));
            files.forEach(f => allImages.push({ type: cat, file: f }));
        });

        if (allImages.length === 0) return new NextResponse('No images found', { status: 404 });

        // If preferredType is provided, we can try to weigh it, 
        // but user asked for "little randomly", so let's just use the index to pick from the global pool
        // but with a slight preference for the category if it matches.

        // Randomization: use the index to pick from the flattened pool
        const selectionIndex = (index * 7 + 13) % allImages.length; // Simple deterministic shuffle
        const selected = allImages[selectionIndex];

        const filePath = path.join(baseDir, selected.type, selected.file);
        const fileBuffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';

        return new NextResponse(fileBuffer, {
            headers: { 'Content-Type': contentType }
        });
    } catch (error) {
        console.error('Image API Error:', error);
        return new NextResponse('Error serving image', { status: 500 });
    }
}
