import {useEffect, useRef} from 'react';

/**
 * Runs `onFocus` whenever the tab/window becomes active again.
 *
 * @param onFocus – function to call when user returns to the page
 */
export function usePageFocus(onFocus: () => void) {
    // Keep the latest callback in a ref so we don’t re-wire listeners
    const latestCb = useRef(onFocus);
    useEffect(() => {
        latestCb.current = onFocus;
    }, [onFocus]);

    useEffect(() => {
        const handleFocus = () => latestCb.current();
        const handleVisibility = () => {
            if (document.visibilityState === 'visible')
                latestCb.current();
        };

        window.addEventListener('focus', handleFocus);               // window/tab gains focus
        document.addEventListener('visibilitychange', handleVisibility); // tab becomes visible

        return () => {
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, []);
}
