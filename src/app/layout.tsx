import type {Metadata, Viewport} from 'next';
import {GoogleAnalytics} from '@next/third-parties/google';
import 'react-toastify/dist/ReactToastify.css';
import './globals.css';
import StyledJsxRegistry from './registry';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://electionmap.bradjobe.dev';
const description = 'Create your own prediction map for the Canadian federal election. Assign parties to ridings across the country and see how your prediction compares to others.';

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: 'Election Map',
        template: '%s | Election Map',
    },
    description,
    openGraph: {
        title: 'Election Map',
        description: 'Create your own prediction map for the Canadian federal election. View and share riding-by-riding predictions.',
        type: 'website',
        siteName: 'Election Map',
    },
    twitter: {
        card: 'summary_large_image',
    },
};

export const viewport: Viewport = {
    themeColor: '#D71920',
};

const gaId = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({children}: { children: React.ReactNode }) {
    return (
        <html lang="en">
        <body>
        <StyledJsxRegistry>
            {children}
        </StyledJsxRegistry>
        </body>
        {gaId && <GoogleAnalytics gaId={gaId}/>}
        </html>
    );
}
