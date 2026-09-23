import type {Metadata} from 'next';
import {Suspense} from 'react';
import EntriesView from './EntriesView';

export const metadata: Metadata = {
    title: 'Saved Maps',
};

export default function Page() {
    return (
        <Suspense>
            <EntriesView/>
        </Suspense>
    );
}
