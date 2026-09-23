import type {Metadata, Viewport} from 'next';
import {GoogleAnalytics} from '@next/third-parties/google';
import 'react-toastify/dist/ReactToastify.css';
import './globals.css';
import StyledJsxRegistry from './registry';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://electionmap.bradjobe.dev';
const description = 'Predict the Canadian federal election one riding at a time, then save your map and share the link.';

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: 'Election Map',
        template: '%s | Election Map',
    },
    description,
    openGraph: {
        title: 'Election Map',
        description,
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
