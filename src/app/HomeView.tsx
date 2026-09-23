'use client';

// Home page: the anonymous draft editor
import dynamic from 'next/dynamic';
import {useEffect, useState} from 'react';
import {Slide, ToastContainer} from 'react-toastify';
import LoadingScreen from "@/components/LoadingScreen/LoadingScreen";
import {PartyRidings} from "@/components/CanadaMap/types/types";
import {loadDraft} from '@/components/CanadaMap/utils/draft';

const CanadaMap = dynamic(
    () => import('@/components/CanadaMap/CanadaMap'),
    {ssr: false, loading: () => <LoadingScreen/>}
);

export default function HomeView() {
    const [initRidings, setInitRidings] = useState<PartyRidings | null>(null);

    useEffect(() => {
        // Resume the draft saved in this browser
        setInitRidings(loadDraft());
    }, []);

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

            {initRidings &&
                <CanadaMap
                    editable={true}
                    initRidings={initRidings}
                    sillyName="Your draft"
                />
            }
        </>
    );
}
