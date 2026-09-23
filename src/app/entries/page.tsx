import type {Metadata} from 'next';
import {Suspense} from 'react';
import EntriesView from './EntriesView';

export const metadata: Metadata = {
    title: 'Saved maps',
    description: 'Browse every Canadian federal election map saved on Election Map.',
};

export default function Page() {
    return (
        <Suspense>
            <EntriesView/>
        </Suspense>
    );
}
