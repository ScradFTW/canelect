// CanadaMap component
import React, {useEffect, useState, useMemo, useRef, memo} from 'react';
import {MapContainer, GeoJSON, WMSTileLayer} from 'react-leaflet';
import RIDINGS_DATA from '@/data/turfed_ridings.json';
import RIDING_PROVINCES from '@/data/canada_federal_riding_provinces.json';
import GEOID_TO_PROVINCE from '@/data/geoid_to_province.json';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Link from 'next/link';
import {displayName} from '@/lib/displayName';
import {useRouter} from 'next/navigation';
import {toast} from 'react-toastify';
import {useTranslation} from '@/localization';

// Import types and constants
import {Party, PartyRidings, CanadaMapProps} from './types/types';
import {partyValues, partyColors} from './types/constants';
import {DEFAULT_CENTER, DEFAULT_ZOOM, MAP_PROJECTION, MAX_ZOOM, MIN_ZOOM} from './types/mapProjection';

// Import styles
import {
    containerStyle,
    headerStyle,
    paragraphStyle,
    mapWrapperStyle,
    accordionStyle,
    accordionHeaderStyle,
    accordionContentStyle,
    buttonStyle, ridingItemStyle, ridingListStyle
} from './styles/styles';

// Import utility functions
import {
    featureStyle,
    createOnEachFeature,
    randomizeAll,
    setAllRidingsToParty,
    setProvinceUndecidedRidingsToParty,
    setProvinceAssignedRidingsToParty,
    centerMapOnRiding,
    resetMapView,
    resetRidings,
    simplifyGeoJSON
} from './utils/mapUtils';
import {
    exportMapAsPNG as exportMapAsPNGUtil,
    performExport,
    shareMap as shareMapUtil,
    copyTextSummary as copyTextSummaryUtil,
    copyShareLink as copyShareLinkUtil
} from './utils/exportUtils';
import {
    calculateNationalCounts,
    getUndecidedRidingsByProvince,
    getAssignedRidingsByProvince,
    checkIsMobile,
    addResizeListener
} from './utils/dataUtils';

// Import components
import MapController from './components/MapController';
import MapControls from './components/MapControls';
import MapSummary from './components/MapSummary';
import UndecidedRidings from './components/UndecidedRidings';
import AssignedRidings from './components/AssignedRidings';
import ShareModal from './components/ShareModal';
import {hasDraft, saveDraft} from './utils/draft';


const GeoJsonMap: React.FC<CanadaMapProps>
    = ({initRidings, sillyName, editable}) => {
    const {t} = useTranslation();
    const router = useRouter();
    // Use useMemo to simplify the GeoJSON data once when the component mounts
    // This uses turf.js to reduce the number of points in the GeoJSON data, which improves performance
    // without significantly affecting the visual quality of the map
    const simplifiedData = useMemo(() => {
        console.log('Simplifying GeoJSON data for better performance...');
        // The tolerance parameter controls the level of simplification:
        // - Higher values (e.g., 0.001) = more simplification, better performance, less detail
        // - Lower values (e.g., 0.0001) = less simplification, more detail, potentially slower performance
        // Adjust this value based on the specific needs of your application
        return RIDINGS_DATA;
    }, []);
    const [data] = useState<any | null>(simplifiedData);
    const [map, setMap] = useState<L.Map | null>(null);

    // Function to reset map zoom and center
    const handleResetMapView = () => {
        resetMapView(map);
    };
    const [ridingParties, setRidingParties] = useState<PartyRidings>({});
    const ridingPartiesRef = useRef<PartyRidings>(ridingParties);
    useEffect(() => {
        ridingPartiesRef.current = ridingParties;
    }, [ridingParties]);
    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [isAccordionOpen, setIsAccordionOpen] = useState(false);
    const [isAssignedAccordionOpen, setIsAssignedAccordionOpen] = useState(false);

    // Create a ref for the map wrapper div to scroll to
    const mapWrapperRef = useRef<HTMLDivElement>(null);
    // Create a ref for the National Summary section for export
    const summaryRef = useRef<HTMLDivElement>(null);
    // State for tracking export process
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        setRidingParties(JSON.parse(JSON.stringify(initRidings)));
    }, [JSON.stringify(initRidings)]);

    useEffect(() => {
        if (!data || !map)
            return;


    }, [data, map]);

    // Keep the draft in this browser so it survives reloads
    useEffect(() => {
        if (editable) saveDraft(ridingParties);
    }, [editable, ridingParties]);

    // Publish the draft as a new anonymous map, then open its page
    const handleSaveMap = async () => {
        if (!Object.values(ridingParties).some(Boolean)) {
            toast.error('Give at least one riding a party before saving.');
            return;
        }
        setIsSaving(true);
        try {
            const res = await fetch('/api/maps', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ridings: ridingParties}),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || 'Failed to save map');

            toast.success('Map saved.');
            router.push(`/map/${encodeURIComponent(body.name)}`);
        } catch (error) {
            console.error('Failed to save map:', error);
            toast.error(error instanceof Error ? error.message : 'Couldn\'t save your map. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // Start a new draft from the map being viewed
    const handleEditCopy = () => {
        if (hasDraft() && !window.confirm('Replace your current map with a copy of this one?')) {
            return;
        }
        saveDraft(ridingParties);
        router.push('/');
    };

    const {nationalCounts, nationalTotal} = useMemo(() => {
        return calculateNationalCounts(data, ridingParties);
    }, [data, ridingParties]);

    const styleFn = useMemo(() => featureStyle(ridingParties), [ridingParties]);

    const onEachFeatureFn = useMemo(() => {
        // The ref is only dereferenced inside Leaflet click handlers, never during render
        // eslint-disable-next-line react-hooks/refs
        return createOnEachFeature(ridingParties, ridingPartiesRef, setRidingParties, editable, sillyName);
    }, [ridingParties, setRidingParties, editable, sillyName]);

    const handleRandomizeAll = () => {
        randomizeAll(data, setRidingParties);
    };

    const handleResetRidings = async () => {
        await resetRidings(setIsResetting, setRidingParties);
    };

    // Function to set all ridings to a specific party
    const handleSetAllRidingsToParty = async (party: Party) => {
        await setAllRidingsToParty(data, party, setRidingParties);
    };

    // Function to set all undecided ridings in a province to a specific party
    const handleSetProvinceUndecidedRidingsToParty = (province: string, party: Party) => {
        setProvinceUndecidedRidingsToParty(
            province,
            party,
            undecidedRidingsByProvince,
            setRidingParties,
            editable
        );
    };

    // Function to set all assigned ridings in a province to a specific party
    const handleSetProvinceAssignedRidingsToParty = (province: string, party: Party) => {
        setProvinceAssignedRidingsToParty(
            province,
            party,
            assignedRidingsByProvince,
            setRidingParties,
            editable
        );
    };

    // Function to center the map on a specific riding
    const handleCenterMapOnRiding = (ridingId: string) => {
        centerMapOnRiding(ridingId, map, data, mapWrapperRef);
    };

    const totalDecidedRidings = Object.values(nationalCounts).reduce((a, b) => a + b, 0);

    // State to track if we're in export mode (to hide the tile layer)
    const [isExportMode, setIsExportMode] = useState(false);
    // State to track if we're sharing the map
    const [isSharing, setIsSharing] = useState(false);
    // State to track if the share modal is open
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    // State to track if we're copying the text
    const [isCopyingText, setIsCopyingText] = useState(false);
    // State to track if we're copying the link
    const [isCopyingLink, setIsCopyingLink] = useState(false);
    // Store the share URL
    const [shareUrl, setShareUrl] = useState('');

    // Function to export the map and National Summary as PNG
    const handleExportMapAsPNG = () => {
        exportMapAsPNGUtil(
            isExporting,
            setIsExporting,
            mapWrapperRef,
            summaryRef,
            map,
            t
        );
    };

    // The map container is resized for export and back again; let Leaflet re-measure
    useEffect(() => {
        map?.invalidateSize();
    }, [map, isExporting]);

    // useEffect hook to handle the export process when isExporting becomes true
    useEffect(() => {
        if (isExporting && map && mapWrapperRef.current && summaryRef.current) {
            performExport(
                isExporting,
                map,
                mapWrapperRef,
                summaryRef,
                sillyName,
                setIsExporting,
                setIsExportMode,
                t
            );
        }
    }, [isExporting, map, mapWrapperRef, summaryRef, t, sillyName, setIsExporting, setIsExportMode]);

    // Function to share the map via a link
    const handleShareMap = async () => {
        await shareMapUtil(
            sillyName,
            setIsSharing,
            setShareUrl,
            setIsShareModalOpen
        );
    };

    // Function to copy the full text summary to clipboard
    const handleCopyTextSummary = async () => {
        await copyTextSummaryUtil(
            shareUrl,
            nationalCounts,
            partyValues,
            setIsCopyingText
        );
    };

    // Function to copy just the link to clipboard
    const handleCopyShareLink = async () => {
        await copyShareLinkUtil(
            shareUrl,
            setIsCopyingLink
        );
    };

    // Get undecided ridings grouped by province and sorted alphabetically
    const undecidedRidingsByProvince = useMemo(() => {
        return getUndecidedRidingsByProvince(data, ridingParties, GEOID_TO_PROVINCE, RIDING_PROVINCES);
    }, [data, ridingParties]);

    // Get assigned ridings grouped by province and sorted alphabetically
    const assignedRidingsByProvince = useMemo(() => {
        return getAssignedRidingsByProvince(data, ridingParties, GEOID_TO_PROVINCE, RIDING_PROVINCES);
    }, [data, ridingParties]);

    // Use useState and useEffect for responsive behavior
    const isMobile = window.innerWidth <= 768;

    return (
        <div style={containerStyle}>
            <h2 style={headerStyle}>🇨🇦 Election Map</h2>
            {editable ? (
                <>
                    <p style={paragraphStyle}>
                        Predict the next Canadian federal election, one riding at a time.
                    </p>
                    <p style={paragraphStyle}>
                        Click a riding to give it a party. Click again to switch parties or clear it.
                        Your map is kept in this browser as you work.
                    </p>
                    <p style={paragraphStyle}>
                        When you&apos;re done, choose <strong>Save &amp; share</strong> to publish your map
                        under a random name, like <strong>Polite moose</strong>. Saved maps are public
                        and can&apos;t be changed.
                    </p>
                </>
            ) : (
                <>
                    <p style={paragraphStyle}>
                        You&apos;re viewing <strong>{displayName(sillyName)}</strong>. Saved maps can&apos;t be changed,
                        but you can edit a copy.
                    </p>
                    <p style={paragraphStyle}>
                        <Link href="/" style={{color: '#0070f3', textDecoration: 'none'}}>{t('entries.backToMap')}</Link>
                    </p>
                </>
            )}

            <p style={{...paragraphStyle, marginTop: 8, marginBottom: 24}}>
                <Link href="/entries">See everyone&apos;s saved maps</Link>
            </p>

            <MapControls
                isExporting={isExporting}
                isSharing={isSharing}
                exportMapAsPNG={handleExportMapAsPNG}
                shareMap={editable ? undefined : handleShareMap}
                resetMapView={handleResetMapView}
                isMobile={isMobile}
            >

                {editable ? (
                    <button
                        onClick={handleSaveMap}
                        disabled={isSaving}
                        style={{
                            ...buttonStyle,
                            background: '#009137',
                            opacity: isSaving ? 0.7 : 1,
                            padding: isMobile ? '6px 10px' : '8px 16px',
                            fontSize: isMobile ? '14px' : '16px',
                        }}
                    >
                        {isSaving ? 'Saving…' : 'Save & share'}
                    </button>
                ) : (
                    <button
                        onClick={handleEditCopy}
                        style={{
                            ...buttonStyle,
                            background: '#009137',
                            padding: isMobile ? '6px 10px' : '8px 16px',
                            fontSize: isMobile ? '14px' : '16px',
                        }}
                    >
                        Edit a copy
                    </button>
                )}
            </MapControls>

            <div style={mapWrapperStyle} ref={mapWrapperRef}>
                <MapRendererMemo 
                    data={data}
                    onEachFeatureFn={onEachFeatureFn}
                    styleFn={styleFn}
                    isExporting={isExporting}
                    setMap={setMap}
                />
            </div>

            <MapSummary
                nationalCounts={nationalCounts}
                nationalTotal={nationalTotal}
                totalDecidedRidings={totalDecidedRidings}
                isExporting={isExporting}
                isMobile={isMobile}
                summaryRef={summaryRef}
            />

            <UndecidedRidings
                isAccordionOpen={isAccordionOpen}
                setIsAccordionOpen={setIsAccordionOpen}
                undecidedRidingsByProvince={undecidedRidingsByProvince}
                centerMapOnRiding={handleCenterMapOnRiding}
                setProvinceUndecidedRidingsToParty={handleSetProvinceUndecidedRidingsToParty}
                editable={editable}
            />

            {/* Assigned Ridings Accordion */}
            <div style={{...accordionStyle, marginTop: 16}}>
                <div
                    style={accordionHeaderStyle}
                    onClick={() => setIsAssignedAccordionOpen(!isAssignedAccordionOpen)}
                >
                    <h3 style={{margin: 0}}>
                        Assigned ridings ({Object.values(assignedRidingsByProvince).flat().length})
                    </h3>
                    <span style={{fontSize: 20}}>
                        {isAssignedAccordionOpen ? '▲' : '▼'}
                    </span>
                </div>

                {isAssignedAccordionOpen && (
                    <div style={accordionContentStyle}>
                        {Object.values(assignedRidingsByProvince).flat().length === 0 ? (
                            <p>No ridings have a party yet. Click one on the map to start.</p>
                        ) : (
                            <div>
                                {Object.keys(assignedRidingsByProvince).sort().map(province => {
                                    const provinceRidings = assignedRidingsByProvince[province];
                                    if (provinceRidings.length === 0) return null;

                                    return (
                                        <div key={province} style={{marginBottom: 12, marginRight: 8}}>
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
                                                        alignItems: 'flex-end'
                                                    }}>
                                                        <div style={{
                                                            fontSize: '9px',
                                                            color: '#555',
                                                            marginBottom: '2px'
                                                        }}>
                                                            Change all to:
                                                        </div>
                                                        <div style={{display: 'flex', gap: '8px'}}>
                                                            {partyValues.map(party => {
                                                                // Determine text color based on background color for contrast
                                                                const textColor = (party === Party.Bloc || party === Party.Green) ? '#000' : '#fff';

                                                                return (
                                                                    <button
                                                                        key={party}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleSetProvinceAssignedRidingsToParty(province, party);
                                                                        }}
                                                                        style={{
                                                                            background: partyColors[party],
                                                                            color: textColor,
                                                                            border: 'none',
                                                                            borderRadius: '4px',
                                                                            padding: '2px 4px',
                                                                            fontSize: '10px',
                                                                            cursor: 'pointer',
                                                                            fontWeight: 'bold'
                                                                        }}
                                                                        title={`Change every assigned riding in ${province} to ${party}`}
                                                                    >
                                                                        {party.charAt(0)}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </h4>
                                            <div style={ridingListStyle}>
                                                {provinceRidings.map(riding => {
                                                    // Determine text color based on background color for contrast
                                                    const textColor = (riding.party === Party.Bloc || riding.party === Party.Green) ? '#000' : '#fff';

                                                    return (
                                                        <div
                                                            key={riding.id}
                                                            style={{
                                                                ...ridingItemStyle,
                                                                background: partyColors[riding.party],
                                                                color: textColor
                                                            }}
                                                            onClick={() => handleCenterMapOnRiding(riding.id)}
                                                            title={`Show ${riding.name} on the map`}
                                                        >
                                                            {riding.name} ({riding.party})
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Share Modal */}
                <ShareModal
                    isShareModalOpen={isShareModalOpen}
                    setIsShareModalOpen={setIsShareModalOpen}
                    shareUrl={shareUrl}
                    isCopyingText={isCopyingText}
                    isCopyingLink={isCopyingLink}
                    copyTextSummary={handleCopyTextSummary}
                    copyShareLink={handleCopyShareLink}
                />

            </div>
        </div>
    );
};


// Memoized Map Renderer Component
interface MapRendererProps {
    data: any;
    onEachFeatureFn: any;
    styleFn: any;
    isExporting: boolean;
    setMap: React.Dispatch<React.SetStateAction<L.Map | null>>;
}

const MapRenderer: React.FC<MapRendererProps> = ({ 
    data, 
    onEachFeatureFn, 
    styleFn, 
    isExporting, 
    setMap 
}) => {
    return (
        // MapContainer only reads style/className on mount, so size this wrapper
        // instead: it fills the page up to 1200px (shorter on phones, where a
        // 650px-tall box leaves Canada floating in empty space), and export
        // always renders at exactly 1200x650
        <div
            className={isExporting ? 'map-exporting' : undefined}
            style={isExporting
                ? {width: 1200, height: 650}
                : {width: '100%', maxWidth: 1200, height: 'min(650px, 110vw)'}}
        >
        <MapContainer
            crs={MAP_PROJECTION}
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            zoomSnap={0.25}
            style={{height: '100%', width: '100%'}}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            scrollWheelZoom
            doubleClickZoom={false}
            zoomControl={!isExporting}
        >
            {
                !isExporting &&
                <WMSTileLayer
                    url="https://maps.geogratis.gc.ca/wms/CBMT"
                    crs={MAP_PROJECTION}
                    // ← only show this layer inside these lat/lng bounds…
                    bounds={L.latLngBounds(
                        [41.68, -141.0],
                        [83.11, -52.62],
                    )}
                    noWrap={true}
                    params={{
                        layers: 'CBMT',
                        format: 'image/png',
                        transparent: true
                    }}
                />
            }
            <MapController setMap={setMap}/>
            {
                data &&
                <GeoJSON
                    data={data}
                    onEachFeature={onEachFeatureFn}
                    style={styleFn}
                />
            }
        </MapContainer>
        </div>
    );
};

// Memoize the MapRenderer component to prevent unnecessary re-renders
const MapRendererMemo = memo(MapRenderer);

export default GeoJsonMap;
