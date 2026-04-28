import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const preferredType = searchParams.get('type') || '';
        const index = parseInt(searchParams.get('index') || '0');
        const store_id = searchParams.get('store_id');

        const baseDir = path.join(process.cwd(), 'public', 'store_images');

        // If store_id provided, we try to see if there's a specific image assigned for it in our JSON record
        // or if it follows the ID naming convention
        if (store_id) {
            const possibleExtensions = ['.png', '.jpg', '.jpeg'];
            for (const ext of possibleExtensions) {
                const p = path.join(baseDir, `${store_id}${ext}`);
                if (fs.existsSync(p)) {
                    const fileBuffer = fs.readFileSync(p);
                    const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';
                    return new NextResponse(fileBuffer, {
                        headers: {
                            'Content-Type': contentType,
                            'Cache-Control': 'public, max-age=31536000, immutable'
                        }
                    });
                }
            }
        }

        // Fallback or Type-based random selection from the flat pool
        if (fs.existsSync(baseDir)) {
            const files = fs.readdirSync(baseDir).filter(f => f.match(/\.(jpg|jpeg|png)$/i)).sort();
            if (files.length > 0) {
                // Use the index or a hash of the storeId/type to pick a consistent but different image
                const fileIndex = index % files.length;
                const selectedFile = files[fileIndex];
                const filePath = path.join(baseDir, selectedFile);

                const fileBuffer = fs.readFileSync(filePath);
                const ext = path.extname(selectedFile).toLowerCase();
                const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';

                return new NextResponse(fileBuffer, {
                    headers: {
                        'Content-Type': contentType,
                        'Cache-Control': 'public, max-age=31536000, immutable'
                    }
                });
            }
        }

        return new NextResponse('No images found', { status: 404 });
    } catch (error) {
        console.error('Image API Error:', error);
        return new NextResponse('Error serving image', { status: 500 });
    }
}
