// AssignedRidings component for the CanadaMap
import React from 'react';
import { Party } from '../types/types';
import { partyColors, partyValues } from '../types/constants';
import { 
    accordionStyle, 
    accordionHeaderStyle, 
    accordionContentStyle, 
    ridingItemStyle, 
    buttonStyle 
} from '../styles/styles';

interface AssignedRidingsProps {
    isAssignedAccordionOpen: boolean;
    setIsAssignedAccordionOpen: React.Dispatch<React.SetStateAction<boolean>>;
    assignedRidingsByProvince: Record<string, Array<{ id: string, name: string, party: Party }>>;
    centerMapOnRiding: (ridingId: string) => void;
    setProvinceAssignedRidingsToParty: (province: string, party: Party) => void;
    editable: boolean;
}

const AssignedRidings: React.FC<AssignedRidingsProps> = ({
    isAssignedAccordionOpen,
    setIsAssignedAccordionOpen,
    assignedRidingsByProvince,
    centerMapOnRiding,
    setProvinceAssignedRidingsToParty,
    editable
}) => {
    const totalAssignedRidings = Object.values(assignedRidingsByProvince).flat().length;

    return (
        <div style={accordionStyle}>
            <div
                style={accordionHeaderStyle}
                onClick={() => setIsAssignedAccordionOpen(!isAssignedAccordionOpen)}
            >
                <h3 style={{margin: 0}}>
                    🗳️ Assigned Ridings ({totalAssignedRidings})
                </h3>
                <span style={{fontSize: 20}}>
                    {isAssignedAccordionOpen ? '▲' : '▼'}
                </span>
            </div>

            {isAssignedAccordionOpen && (
                <div style={accordionContentStyle}>
                    {totalAssignedRidings === 0 ? (
                        <p>No ridings have been assigned a party yet!</p>
                    ) : (
                        <div>
                            {Object.keys(assignedRidingsByProvince).sort().map(province => {
                                const provinceRidings = assignedRidingsByProvince[province];
                                if (provinceRidings.length === 0) return null;

                                return (
                                    <div key={province} style={{marginBottom: 12}}>
                                        <div>
                                            <h4 style={{
                                                margin: '8px 0',
                                                color: '#333',
                                                borderBottom: '1px solid #ccc',
                                                paddingBottom: 4,
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <span>{province} ({provinceRidings.length})</span>
                                                {editable && (
                                                    <div style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '4px'
                                                    }}>
                                                        <div style={{
                                                            display: 'flex',
                                                            gap: '4px',
                                                            flexWrap: 'wrap',
                                                            justifyContent: 'flex-end'
                                                        }}>
                                                            {partyValues.map(party => (
                                                                <button
                                                                    key={party}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setProvinceAssignedRidingsToParty(province, party);
                                                                    }}
                                                                    style={{
                                                                        ...buttonStyle,
                                                                        fontSize: '12px',
                                                                        padding: '6px 10px',
                                                                    }}
                                                                    title={`Set all assigned ridings in ${province} to ${party}`}
                                                                >
                                                                    All {party}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </h4>
                                        </div>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                                            gap: '8px'
                                        }}>
                                            {provinceRidings.map(riding => (
                                                <div
                                                    key={riding.id}
                                                    style={{
                                                        ...ridingItemStyle,
                                                        background: partyColors[riding.party],
                                                        color: (riding.party === Party.Bloc) ? '#000' : '#fff',
                                                    }}
                                                    onClick={() => centerMapOnRiding(riding.id)}
                                                    title={`Center map on ${riding.name} (${riding.party})`}
                                                >
                                                    {riding.name} ({riding.party})
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AssignedRidings;