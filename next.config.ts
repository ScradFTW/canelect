import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
    reactStrictMode: true,
    // Self-contained server bundle for the container image
    output: 'standalone',
    async redirects() {
        return [
            {
                // Share links from the old sign-in version of the site
                source: '/',
                has: [{type: 'query', key: 'sillyName', value: '(?<sillyName>.+)'}],
                destination: '/map/:sillyName',
                permanent: true,
            },
        ];
    },
};

export default nextConfig;
