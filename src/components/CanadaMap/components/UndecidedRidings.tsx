// UndecidedRidings component for the CanadaMap
import React from 'react';
import { Party, RidingsByProvince } from '../types/types';
import { partyValues } from '../types/constants';
import { 
    accordionStyle, 
    accordionHeaderStyle, 
    accordionContentStyle, 
    ridingItemStyle, 
    buttonStyle 
} from '../styles/styles';

interface UndecidedRidingsProps {
    isAccordionOpen: boolean;
    setIsAccordionOpen: React.Dispatch<React.SetStateAction<boolean>>;
    undecidedRidingsByProvince: RidingsByProvince;
    centerMapOnRiding: (ridingId: string) => void;
    setProvinceUndecidedRidingsToParty: (province: string, party: Party) => void;
    editable: boolean;
}

const UndecidedRidings: React.FC<UndecidedRidingsProps> = ({
    isAccordionOpen,
    setIsAccordionOpen,
    undecidedRidingsByProvince,
    centerMapOnRiding,
    setProvinceUndecidedRidingsToParty,
    editable,
}) => {
    const totalUndecidedRidings = Object.values(undecidedRidingsByProvince).flat().length;

    return (
        <div style={accordionStyle}>
            <div
                style={accordionHeaderStyle}
                onClick={() => setIsAccordionOpen(!isAccordionOpen)}
            >
                <h3 style={{margin: 0}}>
                    📋 Undecided Ridings ({totalUndecidedRidings})
                </h3>
                <span style={{fontSize: 20}}>
                    {isAccordionOpen ? '▲' : '▼'}
                </span>
            </div>

            {isAccordionOpen && (
                <div style={accordionContentStyle}>
                    {totalUndecidedRidings === 0 ? (
                        <p>All ridings have been assigned a party!</p>
                    ) : (
                        <div>
                            {Object.keys(undecidedRidingsByProvince).sort().map(province => {
                                const provinceRidings = undecidedRidingsByProvince[province];
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
                                                                        setProvinceUndecidedRidingsToParty(province, party);
                                                                    }}
                                                                    style={{
                                                                        ...buttonStyle,
                                                                        fontSize: '12px',
                                                                        padding: '6px 10px',
                                                                    }}
                                                                    title={`Set all undecided ridings in ${province} to ${party}`}
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
                                                    style={ridingItemStyle}
                                                    onClick={() => centerMapOnRiding(riding.id)}
                                                    title={`Center map on ${riding.name}`}
                                                >
                                                    {riding.name}
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

export default UndecidedRidings;