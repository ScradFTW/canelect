// Export and share utility functions for the CanadaMap component
import { toast } from 'react-toastify';
import domtoimage from 'dom-to-image-more';
import L from 'leaflet';
import {DEFAULT_ZOOM} from '../types/mapProjection';

// Function to export the map and National Summary as PNG
export const exportMapAsPNG = (
    isExporting: boolean,
    setIsExporting: React.Dispatch<React.SetStateAction<boolean>>,
    mapWrapperRef: React.RefObject<HTMLDivElement|null>,
    summaryRef: React.RefObject<HTMLDivElement|null>,
    map: L.Map | null,
    t: (key: string, options?: any) => string
): void => {
    // This function requires dom-to-image-more to be installed
    if (!mapWrapperRef.current || !summaryRef.current || !map) {
        toast.error(t('canadaMap.exportError'));
        return;
    }

    // Set isExporting to true, which will trigger the useEffect hook
    setIsExporting(true);
};

// Function to perform the export process
export const performExport = async (
    isExporting: boolean,
    map: L.Map | null,
    mapWrapperRef: React.RefObject<HTMLDivElement|null>,
    summaryRef: React.RefObject<HTMLDivElement|null>,
    sillyName: string,
    setIsExporting: React.Dispatch<React.SetStateAction<boolean>>,
    setIsExportMode: React.Dispatch<React.SetStateAction<boolean>>,
    t: (key: string, options?: any) => string
): Promise<void> => {
    if (!isExporting) return;

    if (!map || !mapWrapperRef.current || !summaryRef.current) return;

    // Set export mode to hide the tile layer
    setIsExportMode(true);

    try {
        // Save current map view state
        const currentCenter = map.getCenter();
        const currentZoom = map.getZoom();

        // Center the map on Canada and zoom out to show the entire country
        // The container just switched to its fixed 1200px export width
        map.invalidateSize();
        map.setView([55, -90], DEFAULT_ZOOM);

        // Wait for the map to finish rendering at the new zoom level
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Use static dimensions for the image
        const imageWidth = 1200;
        const imageHeight = 1200;

        // Calculate proportions for map and summary
        const mapHeight = 650;
        const summaryHeight = 550;

        // Create a combined canvas with static dimensions
        const combinedCanvas = document.createElement('canvas');
        const ctx = combinedCanvas.getContext('2d');
        if (!ctx)
            throw new Error('CanadaMap.exportError: invalid ctx: ' + ctx);

        // Set static dimensions for the canvas
        combinedCanvas.width = imageWidth;
        combinedCanvas.height = imageHeight;

        // Capture and draw the map
        const mapCanvas = await domtoimage.toCanvas(mapWrapperRef.current, {
            bgcolor: '#fff',
            cacheBust: true,
            width: imageWidth,
            height: mapHeight,
        });

        // Capture and draw the National Summary
        const summaryCanvas = await domtoimage.toCanvas(summaryRef.current, {
            bgcolor: '#fff',
            cacheBust: true,
            width: imageWidth,
            height: summaryHeight,
        });

        // Draw both elements on the canvas
        ctx.drawImage(mapCanvas, 0, 0);
        ctx.drawImage(summaryCanvas, 0, mapHeight);

        // Convert to PNG and trigger download
        const link = document.createElement('a');
        const slug = sillyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        link.download = `electionmap-${slug}-${new Date().toISOString().split('T')[0]}.png`;
        link.href = combinedCanvas.toDataURL('image/png');
        link.click();

        map.setView(currentCenter, currentZoom);

    } catch (error) {
        console.error('Failed to export map:', error);
        toast.error(t('canadaMap.exportError'));
    } finally {
        setIsExporting(false);
        setIsExportMode(false); // Restore the tile layer
    }
};

// Function to share the map via a link
export const shareMap = async (
    sillyName: string,
    isJsonMap: boolean,
    setIsSharing: React.Dispatch<React.SetStateAction<boolean>>,
    setShareUrl: React.Dispatch<React.SetStateAction<string>>,
    setIsShareModalOpen: React.Dispatch<React.SetStateAction<boolean>>
): Promise<void> => {
    try {
        setIsSharing(true);

        // Create the shareable URL with the appropriate format
        const origin = window.location.origin;
        let url;

        if (isJsonMap) {
            // For JSON maps, use the current URL
            url = window.location.href;
        } else {
            // For user maps, use the /map/{sillyName} format
            url = `${origin}/map/${encodeURIComponent(sillyName)}`;
        }

        // Store the URL in state
        setShareUrl(url);

        // Open the share modal
        setIsShareModalOpen(true);
    } catch (error) {
        console.error('Failed to share map:', error);
        toast.error('Failed to create share link');
    } finally {
        setIsSharing(false);
    }
};

// Function to copy the full text summary to clipboard
export const copyTextSummary = async (
    shareUrl: string,
    nationalCounts: Record<string, number>,
    partyValues: string[],
    setIsCopyingText: React.Dispatch<React.SetStateAction<boolean>>
): Promise<void> => {
    try {
        setIsCopyingText(true);

        // Create a summary text with counts for each party
        let summaryText = `Canada Federal 2025 Projection:\n\n`;

        // Add party counts sorted by riding counts
        [...partyValues].sort((a, b) => (nationalCounts[b] || 0) - (nationalCounts[a] || 0)).forEach(party => {
            const count = nationalCounts[party] || 0;
            if (count > 0) {
                summaryText += `${party}: ${count}\n`;
            }
        });

        // Add the share URL
        summaryText += `\nMap: ${shareUrl}`;

        // Copy to clipboard
        await navigator.clipboard.writeText(summaryText);

        // Show success toast
        toast.success('Summary copied to clipboard!');
    } catch (error) {
        console.error('Failed to copy summary:', error);
        toast.error('Failed to copy summary');
    } finally {
        setIsCopyingText(false);
    }
};

// Function to copy just the link to clipboard
export const copyShareLink = async (
    shareUrl: string,
    setIsCopyingLink: React.Dispatch<React.SetStateAction<boolean>>
): Promise<void> => {
    try {
        setIsCopyingLink(true);

        // Copy the URL to clipboard
        await navigator.clipboard.writeText(shareUrl);

        // Show success toast
        toast.success('Link copied to clipboard!');
    } catch (error) {
        console.error('Failed to copy link:', error);
        toast.error('Failed to copy link');
    } finally {
        setIsCopyingLink(false);
    }
};
