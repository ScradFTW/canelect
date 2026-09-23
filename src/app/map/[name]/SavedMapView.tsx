'use client';

import dynamic from 'next/dynamic';
import {Slide, ToastContainer} from 'react-toastify';
import LoadingScreen from '@/components/LoadingScreen/LoadingScreen';
import {PartyRidings} from '@/components/CanadaMap/types/types';

const CanadaMap = dynamic(
    () => import('@/components/CanadaMap/CanadaMap'),
    {ssr: false, loading: () => <LoadingScreen/>}
);

// Read-only view of a saved map
export default function SavedMapView({name, ridings}: { name: string; ridings: PartyRidings }) {
    return (
        <>
            <ToastContainer
                position="top-right"
                autoClose={1500}
                hideProgressBar={true}
                closeOnClick={true}
                theme="colored"
                transition={Slide}
                limit={2}
            />
            <CanadaMap
                editable={false}
                initRidings={ridings}
                sillyName={name}
            />
        </>
    );
}
