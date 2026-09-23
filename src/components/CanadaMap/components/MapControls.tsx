// MapControls component for the CanadaMap
import React from 'react';
import { useTranslation } from '@/localization';
import { buttonStyle, buttonDisabledStyle } from '../styles/styles';

interface MapControlsProps {
    isExporting: boolean;
    isSharing: boolean;
    exportMapAsPNG: () => void;
    /** Omit to hide the share button (unsaved drafts have nothing to link to) */
    shareMap?: () => void;
    resetMapView: () => void;
    isMobile: boolean;
    children: React.ReactNode;
}

const MapControls: React.FC<MapControlsProps> = ({
    isExporting,
    isSharing,
    exportMapAsPNG,
    shareMap,
    resetMapView,
    isMobile,
    children
}) => {
    const { t } = useTranslation();

    // Adjust button styles for mobile
    const mobileButtonStyle = {
        ...buttonStyle,
        padding: '6px 10px',
        fontSize: '14px',
        minWidth: 'auto',
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: '12px',
            gap: isMobile ? '6px' : '10px',
            flexWrap: 'wrap'
        }}>
            {shareMap && <button
                onClick={shareMap}
                disabled={isSharing}
                style={{
                    ...(isMobile ? mobileButtonStyle : buttonStyle),
                    background: '#4CAF50', // Green color for share button
                    ...(isSharing ? buttonDisabledStyle : {}),
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? '4px' : '8px',
                    padding: isMobile ? '6px 10px' : '8px 16px',
                }}
                title="Share this map"
            >
                {isSharing ? 'Opening…' : 'Share'}
            </button>}
            <button
                onClick={() => {
                    if (isMobile)
                        alert('Downloading an image isn\'t available on phones yet. Please try it on a computer.');
                    else
                        exportMapAsPNG();
                }}
                disabled={isExporting}
                style={{
                    ...(isMobile ? mobileButtonStyle : buttonStyle),
                    background: '#0070f3',
                    ...(isExporting ? buttonDisabledStyle : {}),
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? '4px' : '8px',
                    padding: isMobile ? '6px 10px' : '8px 16px',
                }}
                title={t('canadaMap.exportMap')}
            >
                {isExporting ? t('canadaMap.exportingMap') : t('canadaMap.exportMap')}
            </button>
            <button
                onClick={resetMapView}
                style={{
                    ...(isMobile ? mobileButtonStyle : buttonStyle),
                    background: '#6c757d',
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? '4px' : '8px',
                    padding: isMobile ? '6px 10px' : '8px 16px',
                }}
                title="Zoom back out to all of Canada"
            >
                {t('canadaMap.resetZoom')}
            </button>
            {children}
        </div>
    );
};

export default MapControls;
