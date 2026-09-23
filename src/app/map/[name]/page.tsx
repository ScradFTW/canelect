import type {Metadata, ResolvingMetadata} from 'next';
import {notFound} from 'next/navigation';
import {cache} from 'react';
import {getMap} from '@/lib/maps';
import SavedMapView from './SavedMapView';

type Props = {
    params: Promise<{ name: string }>;
};

function safeDecode(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

// Shared by generateMetadata and the page so the map is queried once per request
const loadMap = cache(async (name: string) => getMap(safeDecode(name)));

export async function generateMetadata({params}: Props, parent: ResolvingMetadata): Promise<Metadata> {
    const map = await loadMap((await params).name);
    if (!map) return {};

    const title = `${map.name}'s Election Map`;
    // Nested openGraph/twitter objects replace the layout's rather than merging,
    // so carry over its preview image and card type
    const {openGraph, twitter} = await parent;
    return {
        title: {absolute: title},
        openGraph: {...openGraph, title},
        twitter: {...twitter, title},
    };
}

export default async function Page({params}: Props) {
    const map = await loadMap((await params).name);
    if (!map) notFound();

    return <SavedMapView name={map.name} ridings={map.ridings}/>;
}
