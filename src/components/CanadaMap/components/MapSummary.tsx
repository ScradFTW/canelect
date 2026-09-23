// MapSummary component for the CanadaMap
import React from 'react';
import {Party} from '../types/types';
import {partyColors, partyValues} from '../types/constants';
import {summaryCardStyle, summaryHeaderStyle, statsListStyle} from '../styles/styles';
import { useTranslation } from '@/localization';

interface MapSummaryProps {
    nationalCounts: Record<string, number>;
    nationalTotal: number;
    totalDecidedRidings: number;
    isExporting: boolean;
    isMobile: boolean;
    summaryRef: React.RefObject<HTMLDivElement | null>;
}

const MapSummary: React.FC<MapSummaryProps>
    = ({
           nationalCounts,
           nationalTotal,
           totalDecidedRidings,
           isExporting,
           isMobile,
           summaryRef
       }) => {
    const { t } = useTranslation();

    return (
        <div
            style={{
                ...summaryCardStyle,
                width: isExporting ? 1000 : '100%',
            }}
            ref={summaryRef}
        >
            <h3 style={summaryHeaderStyle}>
                <span>Seat count</span>
            </h3>
            <div
                style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between',
                    gap: '24px'
                }}
            >
                <div style={{...statsListStyle, width: '100%'}}>
                    {/* Party bars with integrated counts */}
                    <div style={{marginBottom: '8px'}}>
                        {[...partyValues].sort((a, b) => (nationalCounts[b] || 0) - (nationalCounts[a] || 0)).map((party) => {
                            // Determine text color based on background color for contrast
                            const count = nationalCounts[party] || 0;
                            const percentage = totalDecidedRidings > 0 ? (count / totalDecidedRidings) * 100 : 0;

                            return (
                                <div key={party}>
                                    <span><strong>{party}</strong></span>
                                    <div style={{
                                        position: 'relative',
                                        height: '32px',
                                        marginBottom: '6px',
                                        borderRadius: '6px',
                                        background: partyColors[party as Party],
                                        width: `${percentage}%`,
                                        minWidth: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '0 12px',
                                        color: 'black',
                                        fontWeight: 600,
                                        fontSize: '14px',
                                        transition: 'width 0.5s ease-out',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                        overflow: 'visible'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            width: '100%',
                                            position: 'absolute',
                                            left: '12px',
                                            right: '12px'
                                        }}>
                                            <span style={{
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}>
                                                {count}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Undecided count */}
                    <div style={{marginTop: '16px', fontSize: '15px'}}>
                        <strong>Undecided:</strong> {nationalTotal - totalDecidedRidings}
                    </div>

                    {/* Total count */}
                    <div style={{marginTop: '8px', fontSize: '15px'}}>
                        <strong>Total ridings:</strong> {nationalTotal}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapSummary;
