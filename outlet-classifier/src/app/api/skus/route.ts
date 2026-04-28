import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), 'src', 'data', 'unique_skus.json');
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ skus: [] });
        }
        const skus = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return NextResponse.json({ skus });
    } catch (error) {
        return NextResponse.json({ skus: [] });
    }
}
