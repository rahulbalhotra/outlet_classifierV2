import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const preferredType = searchParams.get('type') || '';
        const index = parseInt(searchParams.get('index') || '0');
        const storeId = `STR_${index.toString().padStart(3, '0')}`;

        const baseDir = path.join(process.cwd(), 'src', 'store_dataset_jpeg');

        // Mapping from store_type in JSON to folder names in dataset
        const typeToFolderMap: Record<string, string> = {
            'Hypermarket': 'Hypermarket',
            'Supermarket': 'Supermarket',
            'Kirana Store': 'Kirana',
            'Mid-Size Store': 'Supermarket',
            'Closed Counter': 'Kirana',
            'Self-Assisted Store': 'Mart',
            'Kirana': 'Kirana',
            'Mart': 'Mart'
        };

        const targetFolder = typeToFolderMap[preferredType] || 'Mart';
        const targetPath = path.join(baseDir, targetFolder);
        const metadataPath = path.join(targetPath, 'image_metadata.json');

        let selected = { type: targetFolder, file: '' };

        // 1. Try to find mapping in image_metadata.json if it exists
        if (fs.existsSync(metadataPath)) {
            try {
                const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                const entry = metadata.find((e: any) => e.store_id === storeId);
                if (entry && entry.image_name) {
                    selected.file = entry.image_name;
                }
            } catch (e) {
                console.error('Error reading metadata:', e);
            }
        }

        // 2. Fallback to modulo logic if no metadata match
        if (!selected.file && fs.existsSync(targetPath)) {
            const files = fs.readdirSync(targetPath).filter(f => f.match(/\.(jpg|jpeg|png)$/i)).sort();
            if (files.length > 0) {
                const fileIndex = index % files.length;
                selected.file = files[fileIndex];
            }
        }

        // 3. Global Fallback
        if (!selected.file) {
            const categories = fs.readdirSync(baseDir).filter(f => fs.statSync(path.join(baseDir, f)).isDirectory());
            let allImages: { type: string, file: string }[] = [];
            categories.forEach(cat => {
                const files = fs.readdirSync(path.join(baseDir, cat)).filter(f => f.match(/\.(jpg|jpeg|png)$/i));
                files.forEach(f => allImages.push({ type: cat, file: f }));
            });

            if (allImages.length === 0) return new NextResponse('No images found', { status: 404 });

            const fallbackIndex = (index * 13 + 7) % allImages.length;
            selected = allImages[fallbackIndex];
        }

        const filePath = path.join(baseDir, selected.type, selected.file);
        if (!fs.existsSync(filePath)) {
            return new NextResponse('File not found', { status: 404 });
        }

        const fileBuffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable'
            }
        });
    } catch (error) {
        console.error('Image API Error:', error);
        return new NextResponse('Error serving image', { status: 500 });
    }
}
