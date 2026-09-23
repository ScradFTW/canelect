import {NextResponse} from 'next/server';
import {getMap} from '@/lib/maps';

// Fetch one saved map by name
export async function GET(_req: Request, {params}: { params: Promise<{ name: string }> }) {
    const {name} = await params;
    try {
        const map = await getMap(name);
        if (!map) {
            return NextResponse.json({error: 'Map not found'}, {status: 404});
        }
        return NextResponse.json(map);
    } catch (err) {
        console.error('Error in GET /api/maps/[name]', err);
        return NextResponse.json({error: 'Internal Server Error'}, {status: 500});
    }
}
