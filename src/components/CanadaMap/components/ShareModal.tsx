// ShareModal component for the CanadaMap
import React from 'react';
import { buttonStyle, buttonDisabledStyle } from '../styles/styles';

interface ShareModalProps {
    isShareModalOpen: boolean;
    setIsShareModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    shareUrl: string;
    isCopyingText: boolean;
    isCopyingLink: boolean;
    copyTextSummary: () => Promise<void>;
    copyShareLink: () => Promise<void>;
}

const ShareModal: React.FC<ShareModalProps> = ({
    isShareModalOpen,
    setIsShareModalOpen,
    shareUrl,
    isCopyingText,
    isCopyingLink,
    copyTextSummary,
    copyShareLink
}) => {
    if (!isShareModalOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
        }}>
            <div style={{
                backgroundColor: '#fff',
                borderRadius: '8px',
                padding: '24px',
                maxWidth: '500px',
                width: '90%',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                }}>
                    <h3 style={{margin: 0}}>Share Map</h3>
                    <button
                        onClick={() => setIsShareModalOpen(false)}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            padding: '0',
                            color: '#666',
                        }}
                    >
                        &times;
                    </button>
                </div>

                <p>Share your map with others using the link below:</p>

                <div style={{
                    padding: '12px',
                    background: '#f5f5f5',
                    borderRadius: '4px',
                    marginBottom: '16px',
                    wordBreak: 'break-all',
                    fontFamily: 'monospace',
                }}>
                    {shareUrl}
                </div>

                <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '16px',
                }}>
                    <button
                        onClick={copyShareLink}
                        disabled={isCopyingLink}
                        style={{
                            ...buttonStyle,
                            flex: 1,
                            ...(isCopyingLink ? buttonDisabledStyle : {}),
                        }}
                    >
                        {isCopyingLink ? 'Copying...' : 'Copy Link'}
                    </button>
                    <button
                        onClick={copyTextSummary}
                        disabled={isCopyingText}
                        style={{
                            ...buttonStyle,
                            flex: 1,
                            ...(isCopyingText ? buttonDisabledStyle : {}),
                        }}
                    >
                        {isCopyingText ? 'Copying...' : 'Copy Summary Text'}
                    </button>
                </div>

                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                }}>
                    <button
                        onClick={() => setIsShareModalOpen(false)}
                        style={{
                            ...buttonStyle,
                            background: '#6c757d',
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareModal;