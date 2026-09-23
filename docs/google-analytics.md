# Google Analytics

The app reports to Google Analytics 4 through the official
[`@next/third-parties`](https://nextjs.org/docs/app/guides/third-party-libraries#google-analytics)
`<GoogleAnalytics>` component, rendered in `src/app/layout.tsx`.

## Configuration

Set your GA4 measurement ID in `.env.local`:

```
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

When the variable is unset, no analytics script is loaded. The value is
inlined at build time, so rebuild after changing it.

## What is tracked

- **Page views**: GA4 records client-side navigations from browser history
  changes (the "Page changes based on browser history events" option under
  Enhanced measurement, on by default).
- **Custom events**: call `sendGAEvent` from `@next/third-parties/google`:

  ```ts
  import {sendGAEvent} from '@next/third-parties/google';

  sendGAEvent('event', 'export_map', {value: 1});
  ```

## Verifying

Open the site with devtools and look for requests to
`www.google-analytics.com/g/collect`, or use the Realtime report in GA.
