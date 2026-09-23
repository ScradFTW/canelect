// components/LoadingScreen.tsx
import React from 'react';
import { useTranslation } from '@/localization';

export interface LoadingScreenStyles {
    container?: React.CSSProperties;
    wrapper?: React.CSSProperties;
    spinner?: React.CSSProperties;
    text?: React.CSSProperties;
}

export interface LoadingScreenProps {
    styles?: LoadingScreenStyles;
}

export default function LoadingScreen({ styles }: LoadingScreenProps) {
    const { t } = useTranslation();

    const {
        container: containerStyle = {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            zIndex: 9999,
        },
        wrapper: wrapperStyle = {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
        },
        spinner: spinnerStyle = { width: '64px', height: '64px' },
        text: textStyle = {
            marginTop: '16px',
            color: '#4b5563',
            fontSize: '1rem',
        },
    } = styles || {};

    return (
        <div style={containerStyle}>
            <div style={wrapperStyle}>
                <svg
                    width={spinnerStyle.width}
                    height={spinnerStyle.height}
                    viewBox="0 0 64 64"
                    aria-label={t('loadingScreen.ariaLabel')}
                    style={spinnerStyle}
                >
                    <g>
                        <text
                            x="50%"
                            y="50%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            style={{ fontSize: '48px', fill: '#3b82f6' }}
                        >
                            🍁
                        </text>
                        <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from="0 32 32"
                            to="360 32 32"
                            dur="1s"
                            repeatCount="indefinite"
                        />
                    </g>
                </svg>
                <p style={textStyle}>{t('loadingScreen.loadingMap')}</p>
            </div>
        </div>
    );
}
