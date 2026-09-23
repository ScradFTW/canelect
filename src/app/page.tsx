import {Suspense} from 'react';
import HomeView from './HomeView';

export default function Page() {
    return (
        <Suspense>
            <HomeView/>
        </Suspense>
    );
}
