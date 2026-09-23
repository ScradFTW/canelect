'use client';

// Home page: the anonymous draft editor, or a read-only projection via ?jsonFile=
import dynamic from 'next/dynamic';
import {useEffect, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {Slide, ToastContainer} from 'react-toastify';
import LoadingScreen from "@/components/LoadingScreen/LoadingScreen";
import {PartyRidings, Party} from "@/components/CanadaMap/types/types";
import {loadDraft} from '@/components/CanadaMap/utils/draft';

const CanadaMap = dynamic(
    () => import('@/components/CanadaMap/CanadaMap'),
    {ssr: false, loading: () => <LoadingScreen/>}
);

// Only the bundled projection files can be loaded via ?jsonFile=
const PROJECTION_FILES = ['338_prediction.json', 'poliwave_prediction.json'];

function filenameToTitle(filename: string): string {
    // 1. Strip any directory path
    const base = filename.replace(/^.*[\\/]/, '');

    // 2. Remove the extension
    const noExt = base.replace(/\.[^/.]+$/, '');

    // 3. Split on common separators (spaces, underscores, hyphens, dots, and camelCase)
    const parts = noExt
        // insert spaces before capitals: "myFileName" → "my File Name"
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        // now split on any non-alphanumeric character or space
        .split(/[\s._-]+/);

    // 4. Capitalize each word
    return parts
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
        .trim();
}

// Convert projection data to the format expected by CanadaMap
function projectionToRidings(data: { RidingNumber: string; PredictedParty: string }[]): PartyRidings {
    const ridings: PartyRidings = {};
    data.forEach(item => {
        const party = item.PredictedParty.toLowerCase();

        // Tossup ridings stay undecided
        if (party.includes('tossup')) return;
        if (party.includes('liberal')) ridings[item.RidingNumber] = Party.Liberal;
        else if (party.includes('conservative')) ridings[item.RidingNumber] = Party.Conservative;
        else if (party.includes('ndp')) ridings[item.RidingNumber] = Party.NDP;
        else if (party.includes('green')) ridings[item.RidingNumber] = Party.Green;
        else if (party.includes('bloc')) ridings[item.RidingNumber] = Party.Bloc;
    });
    return ridings;
}

export default function HomeView() {
    const searchParams = useSearchParams();
    const jsonFile = searchParams.get('jsonFile') ?? '';
    const isProjection = PROJECTION_FILES.includes(jsonFile);

    const [initRidings, setInitRidings] = useState<PartyRidings | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isProjection) {
            // Resume the draft saved in this browser
            setInitRidings(loadDraft());
            return;
        }

        (async () => {
            try {
                const res = await fetch(`/${jsonFile}`);
                if (!res.ok) throw new Error(`Error ${res.status}`);
                setInitRidings(projectionToRidings(await res.json()));
            } catch (err) {
                console.error(err);
                setError(`Unable to load prediction data: ${err instanceof Error ? err.message : err}`);
            }
        })();
    }, [isProjection, jsonFile]);

    useEffect(() => {
        document.title = isProjection ? filenameToTitle(jsonFile) : 'Election Map';
    }, [isProjection, jsonFile]);

    return (
        <>
            <ToastContainer
                position="top-right"
                autoClose={750}
                hideProgressBar={true}
                newestOnTop={false}
                closeOnClick={true}
                theme="colored"
                transition={Slide}
                limit={2}
                toastStyle={{
                    maxHeight: '16px',
                    fontSize: '0.8rem',
                    borderRadius: '4px',
                    boxShadow: 'none',
                }}
            />

            {error && <p style={{color: 'red'}}>{error}</p>}
            {initRidings &&
                <CanadaMap
                    editable={!isProjection}
                    usingJsonFile={isProjection}
                    initRidings={initRidings}
                    sillyName={isProjection ? filenameToTitle(jsonFile) : 'Your draft'}
                />
            }
        </>
    );
}
