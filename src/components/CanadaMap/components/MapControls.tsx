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
                <span role="img" aria-label="Share">🔗</span>
                {isSharing ? 'Copying...' : (isMobile ? 'Share' : 'Share Map')}
            </button>}
            <button
                onClick={() => {
                    if (isMobile)
                        alert(`sorry this is disabled on mobile right now, I don't know why it keeps breaking :(. It should work on desktop tho. \nYou can also try putting your mobile device in landscape mode.`);
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
                <span role="img" aria-label="Download">📷</span>
                {isExporting ? (isMobile ? 'Exporting...' : t('canadaMap.exportingMap')) : (isMobile ? 'Export PNG' : t('canadaMap.exportMap'))}
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
                title="Reset map zoom and center"
            >
                <span role="img" aria-label="Reset">🔍</span>
                {isMobile ? 'Reset' : t('canadaMap.resetZoom')}
            </button>
            {children}
        </div>
    );
};

export default MapControls;
