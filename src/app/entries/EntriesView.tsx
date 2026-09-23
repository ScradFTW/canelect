'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Color mapping for parties
const partyColors: Record<string, string> = {
    liberal: '#D71920',
    conservative: '#034EA2',
    ndp: '#F37021',
    green: '#00A878',
    bloc: '#ADD8E6',
};

// Type for 338 prediction data
type PredictionItem = {
    RidingNumber: string;
    PredictedParty: string;
};

// Define types matching the API response
export type Entry = {
    name: string;
    created_at: string;
    total_count: number;
    liberal: number;
    conservative: number;
    ndp: number;
    green: number;
    bloc: number;
};

interface ApiResponse {
    page: number;
    limit: number;
    total: number;
    filtered_count: number;
    entries: Entry[];
}

const EntriesView: React.FC = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pageNum = parseInt(searchParams.get('page') || '1', 10);
    const limitNum = 12;

    const [data, setData] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State for prediction data
    const [predictionData, setPredictionData] = useState<PredictionItem[]>([]);
    const [predictionLoading, setPredictionLoading] = useState(true);
    const [predictionError, setPredictionError] = useState<string | null>(null);

    // State for poliwave prediction data
    const [poliwavePredictionData, setPoliwavePredictionData] = useState<PredictionItem[]>([]);
    const [poliwavePredictionLoading, setPoliwavePredictionLoading] = useState(true);
    const [poliwavePredictionError, setPoliwavePredictionError] = useState<string | null>(null);
    const [accordionOpen, setAccordionOpen] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('accordionOpen');
            return saved === null ? true : saved === 'true';
        }
        return true;
    });

    // Sorting state
    const [sortKey, setSortKey] = useState<keyof Entry | ''>('created_at');
    const [sortAsc, setSortAsc] = useState(false);

    // Filter state - initialize from localStorage if available
    const [hideIncomplete, setHideIncomplete] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('hideIncomplete');
            return saved === 'true';
        }
        return false;
    });
    const [hideSingleParty, setHideSingleParty] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('hideSingleParty');
            return saved === 'true';
        }
        return false;
    });

    // Fetch data client-side
    const fetchEntries = async (page: number, limit: number) => {
        setLoading(true);
        setError(null);
        try {
            // Add filter parameters to the API request
            const url = new URL('/api/maps', window.location.origin);
            url.searchParams.append('page', page.toString());
            url.searchParams.append('limit', limit.toString());

            // Only add filter parameters if they are true
            if (hideIncomplete) {
                url.searchParams.append('hideIncomplete', 'true');
            }

            if (hideSingleParty) {
                url.searchParams.append('hideSingleParty', 'true');
            }

            // Add sorting parameters if set
            if (sortKey) {
                url.searchParams.append('sortKey', sortKey);
                url.searchParams.append('sortAsc', sortAsc.toString());
            }

            const res = await fetch(url.toString());

            if (!res.ok) throw new Error(`Error ${res.status}`);
            const json: ApiResponse = await res.json();
            setData(json);
        } catch (err: any) {
            console.error(err);
            setError('Failed to load entries: ' + (err.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    // Fetch and process 338 prediction data
    const fetch338PredictionData = async () => {
        setPredictionLoading(true);
        setPredictionError(null);
        try {
            const res = await fetch('/338_prediction.json');
            if (!res.ok) throw new Error(`Error ${res.status}`);
            const data: PredictionItem[] = await res.json();
            setPredictionData(data);
        } catch (err: any) {
            console.error(err);
            setPredictionError('Failed to load 338 prediction data: ' + (err.message || 'Unknown error'));
        } finally {
            setPredictionLoading(false);
        }
    };

    // Fetch and process Poliwave prediction data
    const fetchPoliwavePredictionData = async () => {
        setPoliwavePredictionLoading(true);
        setPoliwavePredictionError(null);
        try {
            const res = await fetch('/poliwave_prediction.json');
            if (!res.ok) throw new Error(`Error ${res.status}`);
            const data: PredictionItem[] = await res.json();
            setPoliwavePredictionData(data);
        } catch (err: any) {
            console.error(err);
            setPoliwavePredictionError('Failed to load Poliwave prediction data: ' + (err.message || 'Unknown error'));
        } finally {
            setPoliwavePredictionLoading(false);
        }
    };

    // Process 338 prediction data to count parties
    const processed338PredictionData = useMemo(() => {
        if (!predictionData.length) return null;

        const counts = {
            liberal: 0,
            conservative: 0,
            ndp: 0,
            green: 0,
            bloc: 0,
            tossup: 0,
            tossup_lib_con: 0,
            tossup_lib_ndp: 0,
            tossup_lib_bloc: 0,
            tossup_con_ndp: 0,
            tossup_con_bloc: 0,
            tossup_con_green: 0,
            tossup_lib_con_bloc: 0,
            tossup_lib_con_ndp: 0,
            tossup_other: 0,
            total_count: predictionData.length
        };

        predictionData.forEach(item => {
            const party = item.PredictedParty.toLowerCase();

            if (party.includes('tossup')) {
                counts.tossup++; // Keep total tossup count

                // Categorize tossups based on parties involved
                if (party.includes('liberal') && party.includes('conservative') && party.includes('bloc')) {
                    counts.tossup_lib_con_bloc++;
                } else if (party.includes('liberal') && party.includes('conservative') && party.includes('ndp')) {
                    counts.tossup_lib_con_ndp++;
                } else if (party.includes('liberal') && party.includes('conservative')) {
                    counts.tossup_lib_con++;
                } else if (party.includes('liberal') && party.includes('ndp')) {
                    counts.tossup_lib_ndp++;
                } else if (party.includes('liberal') && party.includes('bloc')) {
                    counts.tossup_lib_bloc++;
                } else if (party.includes('conservative') && party.includes('ndp')) {
                    counts.tossup_con_ndp++;
                } else if (party.includes('conservative') && party.includes('bloc')) {
                    counts.tossup_con_bloc++;
                } else if (party.includes('conservative') && party.includes('green')) {
                    counts.tossup_con_green++;
                } else {
                    counts.tossup_other++;
                }
            } else if (party.includes('liberal')) {
                counts.liberal++;
            } else if (party.includes('conservative')) {
                counts.conservative++;
            } else if (party.includes('ndp')) {
                counts.ndp++;
            } else if (party.includes('green')) {
                counts.green++;
            } else if (party.includes('bloc')) {
                counts.bloc++;
            }
        });

        return {
            name: "338Canada Prediction",
            created_at: new Date().toISOString(), // Using current date as update time
            total_count: counts.total_count,
            liberal: counts.liberal,
            conservative: counts.conservative,
            ndp: counts.ndp,
            green: counts.green,
            bloc: counts.bloc,
            tossup: counts.tossup,
            tossup_lib_con: counts.tossup_lib_con,
            tossup_lib_ndp: counts.tossup_lib_ndp,
            tossup_lib_bloc: counts.tossup_lib_bloc,
            tossup_con_ndp: counts.tossup_con_ndp,
            tossup_con_bloc: counts.tossup_con_bloc,
            tossup_con_green: counts.tossup_con_green,
            tossup_lib_con_bloc: counts.tossup_lib_con_bloc,
            tossup_lib_con_ndp: counts.tossup_lib_con_ndp,
            tossup_other: counts.tossup_other
        };
    }, [predictionData]);

    // Process Poliwave prediction data to count parties
    const processedPoliwavePredictionData = useMemo(() => {
        if (!poliwavePredictionData.length) return null;

        const counts = {
            liberal: 0,
            conservative: 0,
            ndp: 0,
            green: 0,
            bloc: 0,
            tossup: 0,
            tossup_lib_con: 0,
            tossup_lib_ndp: 0,
            tossup_lib_bloc: 0,
            tossup_con_ndp: 0,
            tossup_con_bloc: 0,
            tossup_con_green: 0,
            tossup_lib_con_bloc: 0,
            tossup_lib_con_ndp: 0,
            tossup_other: 0,
            total_count: poliwavePredictionData.length
        };

        poliwavePredictionData.forEach(item => {
            const party = item.PredictedParty.toLowerCase();

            if (party.includes('tossup')) {
                counts.tossup++; // Keep total tossup count

                // Categorize tossups based on parties involved
                if (party.includes('liberal') && party.includes('conservative') && party.includes('bloc')) {
                    counts.tossup_lib_con_bloc++;
                } else if (party.includes('liberal') && party.includes('conservative') && party.includes('ndp')) {
                    counts.tossup_lib_con_ndp++;
                } else if (party.includes('liberal') && party.includes('conservative')) {
                    counts.tossup_lib_con++;
                } else if (party.includes('liberal') && party.includes('ndp')) {
                    counts.tossup_lib_ndp++;
                } else if (party.includes('liberal') && party.includes('bloc')) {
                    counts.tossup_lib_bloc++;
                } else if (party.includes('conservative') && party.includes('ndp')) {
                    counts.tossup_con_ndp++;
                } else if (party.includes('conservative') && party.includes('bloc')) {
                    counts.tossup_con_bloc++;
                } else if (party.includes('conservative') && party.includes('green')) {
                    counts.tossup_con_green++;
                } else {
                    counts.tossup_other++;
                }
            } else if (party.includes('liberal')) {
                counts.liberal++;
            } else if (party.includes('conservative')) {
                counts.conservative++;
            } else if (party.includes('ndp')) {
                counts.ndp++;
            } else if (party.includes('green')) {
                counts.green++;
            } else if (party.includes('bloc')) {
                counts.bloc++;
            }
        });

        return {
            name: "Poliwave Prediction",
            created_at: new Date().toISOString(), // Using current date as update time
            total_count: counts.total_count,
            liberal: counts.liberal,
            conservative: counts.conservative,
            ndp: counts.ndp,
            green: counts.green,
            bloc: counts.bloc,
            tossup: counts.tossup,
            tossup_lib_con: counts.tossup_lib_con,
            tossup_lib_ndp: counts.tossup_lib_ndp,
            tossup_lib_bloc: counts.tossup_lib_bloc,
            tossup_con_ndp: counts.tossup_con_ndp,
            tossup_con_bloc: counts.tossup_con_bloc,
            tossup_con_green: counts.tossup_con_green,
            tossup_lib_con_bloc: counts.tossup_lib_con_bloc,
            tossup_lib_con_ndp: counts.tossup_lib_con_ndp,
            tossup_other: counts.tossup_other
        };
    }, [poliwavePredictionData]);

    useEffect(() => {
        fetchEntries(pageNum, limitNum);
        fetch338PredictionData();
        fetchPoliwavePredictionData();
    }, [pageNum, limitNum, hideIncomplete, hideSingleParty, sortKey, sortAsc]);

    const changePage = (newPage: number) => {
        router.push(`/entries?page=${newPage}&limit=${limitNum}`);
    };


    // Apply sorting to entries
    const sortedEntries = useMemo(() => {
        if (!data) return [];

        return [...data.entries].sort((a, b) => {
            // For party-based sorting, find the winning party
            if (['liberal', 'conservative', 'ndp', 'green', 'bloc'].includes(sortKey)) {
                // Get the party with the most ridings for each entry
                const getWinningParty = (entry: Entry) => {
                    const parties = [
                        { name: 'liberal', count: entry.liberal },
                        { name: 'conservative', count: entry.conservative },
                        { name: 'ndp', count: entry.ndp },
                        { name: 'green', count: entry.green },
                        { name: 'bloc', count: entry.bloc }
                    ];
                    return parties.sort((p1, p2) => p2.count - p1.count)[0];
                };

                const aWinner = getWinningParty(a);
                const bWinner = getWinningParty(b);

                // If sorting by a specific party
                if (aWinner.name === sortKey && bWinner.name !== sortKey) {
                    return sortAsc ? 1 : -1;
                } else if (aWinner.name !== sortKey && bWinner.name === sortKey) {
                    return sortAsc ? -1 : 1;
                }

                // If both or neither have the same winning party, sort by count of that party
                // @ts-expect-error -- sortKey is a string, not narrowed to keyof Entry
                const valA = a[sortKey] as number;
                // @ts-expect-error -- sortKey is a string, not narrowed to keyof Entry
                const valB = b[sortKey] as number;
                return sortAsc ? valA - valB : valB - valA;
            }

            // For non-party sorting
            // @ts-expect-error -- sortKey is a string, not narrowed to keyof Entry
            const valA = a[sortKey];
            // @ts-expect-error -- sortKey is a string, not narrowed to keyof Entry
            const valB = b[sortKey];
            let cmp = 0;
            if (sortKey === 'created_at') {
                cmp = new Date(valA as string).getTime() - new Date(valB as string).getTime();
            } else if (typeof valA === 'number' && typeof valB === 'number') {
                cmp = valA - valB;
            } else {
                cmp = String(valA).localeCompare(String(valB));
            }
            return sortAsc ? cmp : -cmp;
        });
    }, [data, sortKey, sortAsc]);

    // Render arrow indicator
    const renderArrow = (key: keyof Entry) =>
        sortKey === key ? (sortAsc ? ' ▲' : ' ▼') : '';

    return (
        <>
            <div className="container">
                <h1>Saved Maps</h1>

                <div className="header-actions">
                    <a href={"/"} className="back-link">← Back to your draft</a>

                    {!loading && data && (
                        <>
                            <div className="filter-controls">
                                <div className="filter-option">
                                    <input
                                        type="checkbox"
                                        id="hide-incomplete"
                                        checked={hideIncomplete}
                                        onChange={(e) => {
                                            const newValue = e.target.checked;
                                            setHideIncomplete(newValue);
                                            localStorage.setItem('hideIncomplete', String(newValue));
                                        }}
                                    />
                                    <label htmlFor="hide-incomplete">Hide incomplete maps</label>
                                </div>
                                <div className="filter-option">
                                    <input
                                        type="checkbox"
                                        id="hide-single-party"
                                        checked={hideSingleParty}
                                        onChange={(e) => {
                                            const newValue = e.target.checked;
                                            setHideSingleParty(newValue);
                                            localStorage.setItem('hideSingleParty', String(newValue));
                                        }}
                                    />
                                    <label htmlFor="hide-single-party">Hide single-party maps ({'>'}80% of ridings)</label>
                                </div>
                            </div>

                            <div className="sort-controls">
                                <label htmlFor="sort-select">Sort by:</label>
                                <select
                                    id="sort-select"
                                    value={sortKey}
                                    onChange={(e) => {
                                        const value = e.target.value as keyof Entry | '';
                                        if (value === sortKey) {
                                            setSortAsc(!sortAsc);
                                        } else {
                                            setSortKey(value);
                                            // Set default sort direction: DESC for parties, ASC for others
                                            const partyFields = ['liberal', 'conservative', 'ndp', 'green', 'bloc'];
                                            setSortAsc(!partyFields.includes(value));
                                        }
                                    }}
                                >
                                    <option value="created_at">Date Saved</option>
                                    <option value="name">Name</option>
                                    <option value="total_count">Total Ridings</option>
                                    <option value="liberal">Liberal</option>
                                    <option value="conservative">Conservative</option>
                                    <option value="ndp">NDP</option>
                                    <option value="green">Green</option>
                                    <option value="bloc">Bloc</option>
                                </select>

                                <button
                                    className="sort-direction"
                                    onClick={() => setSortAsc(!sortAsc)}
                                    title={sortAsc ? "Ascending" : "Descending"}
                                >
                                    {sortAsc ? '↑' : '↓'}
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {loading && <p className="info">Loading...</p>}
                {error && <p className="error">{error}</p>}

                {/* Trusted Sources Accordion */}
                <div className="accordion">
                    <div className="accordion-header" onClick={() => {
                        const newValue = !accordionOpen;
                        setAccordionOpen(newValue);
                        localStorage.setItem('accordionOpen', String(newValue));
                    }}>
                        <h2>Trusted Sources</h2>
                        <span className="accordion-icon">{accordionOpen ? '▼' : '▶'}</span>
                    </div>

                    {accordionOpen && (
                        <div className="accordion-content">
                            {(predictionLoading || poliwavePredictionLoading) && <p className="info">Loading trusted sources...</p>}
                            {predictionError && <p className="error">{predictionError}</p>}
                            {poliwavePredictionError && <p className="error">{poliwavePredictionError}</p>}

                            {!predictionLoading && processed338PredictionData && (
                                <div className="cards-container">
                                    <div className="entry-card trusted-source-card">
                                        <div className="card-header">
                                            <h2 className="entry-name">{processed338PredictionData.name}</h2>
                                        </div>

                                        <div className="card-meta">
                                            <span className="total-count">
                                                Total: <strong>{processed338PredictionData.total_count}</strong> ridings
                                            </span>
                                            {/* Plain <a>: styled-jsx scoped classes don't apply to <Link> */}
                                            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                                            <a href="/?jsonFile=338_prediction.json" className="view-button">
                                                View Map
                                            </a>
                                        </div>
                                        <div className="source-credit">
                                            <a href="https://338canada.com/" target="_blank" rel="noopener noreferrer">
                                                Source: 338Canada.com
                                            </a>
                                        </div>

                                        <div className="party-stats">
                                            {Object.entries({
                                                liberal: processed338PredictionData.liberal,
                                                conservative: processed338PredictionData.conservative,
                                                ndp: processed338PredictionData.ndp,
                                                green: processed338PredictionData.green,
                                                bloc: processed338PredictionData.bloc
                                            })
                                            .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
                                            .map(([party, count]) => (
                                                <div key={party} className="party-bar" style={{
                                                    background: partyColors[party as keyof typeof partyColors],
                                                    width: `${(count as number / processed338PredictionData.total_count) * 100}%`,
                                                    minWidth: (count as number) > 0 ? '5%' : '0'
                                                }}>
                                                    <span className="party-count">{count}</span>
                                                </div>
                                            ))}
                                            {/* Display different tossup categories */}
                                            {processed338PredictionData.tossup_lib_con > 0 && (
                                                <div className="party-bar" style={{
                                                    background: 'linear-gradient(90deg, #D71920 50%, #034EA2 50%)',
                                                    width: `${(processed338PredictionData.tossup_lib_con / processed338PredictionData.total_count) * 100}%`,
                                                    minWidth: '5%'
                                                }}>
                                                    <span className="party-count">{processed338PredictionData.tossup_lib_con}</span>
                                                </div>
                                            )}
                                            {processed338PredictionData.tossup_lib_ndp > 0 && (
                                                <div className="party-bar" style={{
                                                    background: 'linear-gradient(90deg, #D71920 50%, #F37021 50%)',
                                                    width: `${(processed338PredictionData.tossup_lib_ndp / processed338PredictionData.total_count) * 100}%`,
                                                    minWidth: '5%'
                                                }}>
                                                    <span className="party-count">{processed338PredictionData.tossup_lib_ndp}</span>
                                                </div>
                                            )}
                                            {processed338PredictionData.tossup_lib_bloc > 0 && (
                                                <div className="party-bar" style={{
                                                    background: 'linear-gradient(90deg, #D71920 50%, #ADD8E6 50%)',
                                                    width: `${(processed338PredictionData.tossup_lib_bloc / processed338PredictionData.total_count) * 100}%`,
                                                    minWidth: '5%'
                                                }}>
                                                    <span className="party-count">{processed338PredictionData.tossup_lib_bloc}</span>
                                                </div>
                                            )}
                                            {processed338PredictionData.tossup_con_ndp > 0 && (
                                                <div className="party-bar" style={{
                                                    background: 'linear-gradient(90deg, #034EA2 50%, #F37021 50%)',
                                                    width: `${(processed338PredictionData.tossup_con_ndp / processed338PredictionData.total_count) * 100}%`,
                                                    minWidth: '5%'
                                                }}>
                                                    <span className="party-count">{processed338PredictionData.tossup_con_ndp}</span>
                                                </div>
                                            )}
                                            {processed338PredictionData.tossup_con_bloc > 0 && (
                                                <div className="party-bar" style={{
                                                    background: 'linear-gradient(90deg, #034EA2 50%, #ADD8E6 50%)',
                                                    width: `${(processed338PredictionData.tossup_con_bloc / processed338PredictionData.total_count) * 100}%`,
                                                    minWidth: '5%'
                                                }}>
                                                    <span className="party-count">{processed338PredictionData.tossup_con_bloc}</span>
                                                </div>
                                            )}
                                            {processed338PredictionData.tossup_con_green > 0 && (
                                                <div className="party-bar" style={{
                                                    background: 'linear-gradient(90deg, #034EA2 50%, #00A878 50%)',
                                                    width: `${(processed338PredictionData.tossup_con_green / processed338PredictionData.total_count) * 100}%`,
                                                    minWidth: '5%'
                                                }}>
                                                    <span className="party-count">{processed338PredictionData.tossup_con_green}</span>
                                                </div>
                                            )}
                                            {processed338PredictionData.tossup_lib_con_bloc > 0 && (
                                                <div className="party-bar" style={{
                                                    background: 'linear-gradient(90deg, #D71920 33%, #034EA2 33%, #034EA2 66%, #ADD8E6 66%)',
                                                    width: `${(processed338PredictionData.tossup_lib_con_bloc / processed338PredictionData.total_count) * 100}%`,
                                                    minWidth: '5%'
                                                }}>
                                                    <span className="party-count">{processed338PredictionData.tossup_lib_con_bloc}</span>
                                                </div>
                                            )}
                                            {processed338PredictionData.tossup_lib_con_ndp > 0 && (
                                                <div className="party-bar" style={{
                                                    background: 'linear-gradient(90deg, #D71920 33%, #034EA2 33%, #034EA2 66%, #F37021 66%)',
                                                    width: `${(processed338PredictionData.tossup_lib_con_ndp / processed338PredictionData.total_count) * 100}%`,
                                                    minWidth: '5%'
                                                }}>
                                                    <span className="party-count">{processed338PredictionData.tossup_lib_con_ndp}</span>
                                                </div>
                                            )}
                                            {processed338PredictionData.tossup_other > 0 && (
                                                <div className="party-bar" style={{
                                                    background: '#888888',
                                                    width: `${(processed338PredictionData.tossup_other / processed338PredictionData.total_count) * 100}%`,
                                                    minWidth: '5%'
                                                }}>
                                                    <span className="party-count">{processed338PredictionData.tossup_other}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="party-legend">
                                            <div className="legend-item">
                                                <span className="color-box" style={{ background: partyColors.liberal }}></span>
                                                <span>Liberal: {processed338PredictionData.liberal}</span>
                                            </div>
                                            <div className="legend-item">
                                                <span className="color-box" style={{ background: partyColors.conservative }}></span>
                                                <span>Conservative: {processed338PredictionData.conservative}</span>
                                            </div>
                                            <div className="legend-item">
                                                <span className="color-box" style={{ background: partyColors.ndp }}></span>
                                                <span>NDP: {processed338PredictionData.ndp}</span>
                                            </div>
                                            <div className="legend-item">
                                                <span className="color-box" style={{ background: partyColors.green }}></span>
                                                <span>Green: {processed338PredictionData.green}</span>
                                            </div>
                                            <div className="legend-item">
                                                <span className="color-box" style={{ background: partyColors.bloc }}></span>
                                                <span>Bloc: {processed338PredictionData.bloc}</span>
                                            </div>
                                            {/* Tossup legend items */}
                                            {processed338PredictionData.tossup_lib_con > 0 && (
                                                <div className="legend-item">
                                                    <span className="color-box" style={{ background: 'linear-gradient(90deg, #D71920 50%, #034EA2 50%)' }}></span>
                                                    <span>Tossup Lib/Con: {processed338PredictionData.tossup_lib_con}</span>
                                                </div>
                                            )}
                                            {processed338PredictionData.tossup_lib_ndp > 0 && (
                                                <div className="legend-item">
                                                    <span className="color-box" style={{ background: 'linear-gradient(90deg, #D71920 50%, #F37021 50%)' }}></span>
                                                    <span>Tossup Lib/NDP: {processed338PredictionData.tossup_lib_ndp}</span>
                                                </div>
                                            )}
                                            {processed338PredictionData.tossup_lib_bloc > 0 && (
                                                <div className="legend-item">
                                                    <span className="color-box" style={{ background: 'linear-gradient(90deg, #D71920 50%, #ADD8E6 50%)' }}></span>
                                                    <span>Tossup Lib/Bloc: {processed338PredictionData.tossup_lib_bloc}</span>
                                                </div>
                                            )}
                                            {processed338PredictionData.tossup_con_ndp > 0 && (
                                                <div className="legend-item">
                                                    <span className="color-box" style={{ background: 'linear-gradient(90deg, #034EA2 50%, #F37021 50%)' }}></span>
                                                    <span>Tossup Con/NDP: {processed338PredictionData.tossup_con_ndp}</span>
                                                </div>
                                            )}
                                            {processed338PredictionData.tossup_con_bloc > 0 && (
                                                <div className="legend-item">
                                                    <span className="color-box" style={{ background: 'linear-gradient(90deg, #034EA2 50%, #ADD8E6 50%)' }}></span>
                                                    <span>Tossup Con/Bloc: {processed338PredictionData.tossup_con_bloc}</span>
                                                </div>
                                            )}
                                            {processed338PredictionData.tossup_con_green > 0 && (
                                                <div className="legend-item">
                                                    <span className="color-box" style={{ background: 'linear-gradient(90deg, #034EA2 50%, #00A878 50%)' }}></span>
                                                    <span>Tossup Con/Green: {processed338PredictionData.tossup_con_green}</span>
                                                </div>
                                            )}
                                            {processed338PredictionData.tossup_lib_con_bloc > 0 && (
                                                <div className="legend-item">
                                                    <span className="color-box" style={{ background: 'linear-gradient(90deg, #D71920 33%, #034EA2 33%, #034EA2 66%, #ADD8E6 66%)' }}></span>
                                                    <span>Tossup Lib/Con/Bloc: {processed338PredictionData.tossup_lib_con_bloc}</span>
                                                </div>
                                            )}
                                            {processed338PredictionData.tossup_lib_con_ndp > 0 && (
                                                <div className="legend-item">
                                                    <span className="color-box" style={{ background: 'linear-gradient(90deg, #D71920 33%, #034EA2 33%, #034EA2 66%, #F37021 66%)' }}></span>
                                                    <span>Tossup Lib/Con/NDP: {processed338PredictionData.tossup_lib_con_ndp}</span>
                                                </div>
                                            )}
                                            {processed338PredictionData.tossup_other > 0 && (
                                                <div className="legend-item">
                                                    <span className="color-box" style={{ background: '#888888' }}></span>
                                                    <span>Other Tossups: {processed338PredictionData.tossup_other}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Poliwave Prediction Card */}
                                    {!poliwavePredictionLoading && processedPoliwavePredictionData && (
                                        <div className="entry-card trusted-source-card">
                                            <div className="card-header">
                                                <h2 className="entry-name">{processedPoliwavePredictionData.name}</h2>
                                            </div>

                                            <div className="card-meta">
                                                <span className="total-count">
                                                    Total: <strong>{processedPoliwavePredictionData.total_count}</strong> ridings
                                                </span>
                                                {/* Plain <a>: styled-jsx scoped classes don't apply to <Link> */}
                                                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                                                <a href="/?jsonFile=poliwave_prediction.json" className="view-button">
                                                    View Map
                                                </a>
                                            </div>
                                            <div className="source-credit">
                                                <a href="https://www.poliwave.com/election/ca/fed" target="_blank" rel="noopener noreferrer">
                                                    Source: Poliwave.com
                                                </a>
                                            </div>

                                            <div className="party-stats">
                                                {Object.entries({
                                                    liberal: processedPoliwavePredictionData.liberal,
                                                    conservative: processedPoliwavePredictionData.conservative,
                                                    ndp: processedPoliwavePredictionData.ndp,
                                                    green: processedPoliwavePredictionData.green,
                                                    bloc: processedPoliwavePredictionData.bloc
                                                })
                                                .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
                                                .map(([party, count]) => (
                                                    <div key={party} className="party-bar" style={{
                                                        background: partyColors[party as keyof typeof partyColors],
                                                        width: `${(count as number / processedPoliwavePredictionData.total_count) * 100}%`,
                                                        minWidth: (count as number) > 0 ? '5%' : '0'
                                                    }}>
                                                        <span className="party-count">{count}</span>
                                                    </div>
                                                ))}
                                                {/* Display different tossup categories */}
                                                {processedPoliwavePredictionData.tossup_lib_con > 0 && (
                                                    <div className="party-bar" style={{
                                                        background: 'linear-gradient(90deg, #D71920 50%, #034EA2 50%)',
                                                        width: `${(processedPoliwavePredictionData.tossup_lib_con / processedPoliwavePredictionData.total_count) * 100}%`,
                                                        minWidth: '5%'
                                                    }}>
                                                        <span className="party-count">{processedPoliwavePredictionData.tossup_lib_con}</span>
                                                    </div>
                                                )}
                                                {processedPoliwavePredictionData.tossup_lib_ndp > 0 && (
                                                    <div className="party-bar" style={{
                                                        background: 'linear-gradient(90deg, #D71920 50%, #F37021 50%)',
                                                        width: `${(processedPoliwavePredictionData.tossup_lib_ndp / processedPoliwavePredictionData.total_count) * 100}%`,
                                                        minWidth: '5%'
                                                    }}>
                                                        <span className="party-count">{processedPoliwavePredictionData.tossup_lib_ndp}</span>
                                                    </div>
                                                )}
                                                {processedPoliwavePredictionData.tossup_lib_bloc > 0 && (
                                                    <div className="party-bar" style={{
                                                        background: 'linear-gradient(90deg, #D71920 50%, #ADD8E6 50%)',
                                                        width: `${(processedPoliwavePredictionData.tossup_lib_bloc / processedPoliwavePredictionData.total_count) * 100}%`,
                                                        minWidth: '5%'
                                                    }}>
                                                        <span className="party-count">{processedPoliwavePredictionData.tossup_lib_bloc}</span>
                                                    </div>
                                                )}
                                                {processedPoliwavePredictionData.tossup_con_ndp > 0 && (
                                                    <div className="party-bar" style={{
                                                        background: 'linear-gradient(90deg, #034EA2 50%, #F37021 50%)',
                                                        width: `${(processedPoliwavePredictionData.tossup_con_ndp / processedPoliwavePredictionData.total_count) * 100}%`,
                                                        minWidth: '5%'
                                                    }}>
                                                        <span className="party-count">{processedPoliwavePredictionData.tossup_con_ndp}</span>
                                                    </div>
                                                )}
                                                {processedPoliwavePredictionData.tossup_con_bloc > 0 && (
                                                    <div className="party-bar" style={{
                                                        background: 'linear-gradient(90deg, #034EA2 50%, #ADD8E6 50%)',
                                                        width: `${(processedPoliwavePredictionData.tossup_con_bloc / processedPoliwavePredictionData.total_count) * 100}%`,
                                                        minWidth: '5%'
                                                    }}>
                                                        <span className="party-count">{processedPoliwavePredictionData.tossup_con_bloc}</span>
                                                    </div>
                                                )}
                                                {processedPoliwavePredictionData.tossup_con_green > 0 && (
                                                    <div className="party-bar" style={{
                                                        background: 'linear-gradient(90deg, #034EA2 50%, #00A878 50%)',
                                                        width: `${(processedPoliwavePredictionData.tossup_con_green / processedPoliwavePredictionData.total_count) * 100}%`,
                                                        minWidth: '5%'
                                                    }}>
                                                        <span className="party-count">{processedPoliwavePredictionData.tossup_con_green}</span>
                                                    </div>
                                                )}
                                                {processedPoliwavePredictionData.tossup_lib_con_bloc > 0 && (
                                                    <div className="party-bar" style={{
                                                        background: 'linear-gradient(90deg, #D71920 33%, #034EA2 33%, #034EA2 66%, #ADD8E6 66%)',
                                                        width: `${(processedPoliwavePredictionData.tossup_lib_con_bloc / processedPoliwavePredictionData.total_count) * 100}%`,
                                                        minWidth: '5%'
                                                    }}>
                                                        <span className="party-count">{processedPoliwavePredictionData.tossup_lib_con_bloc}</span>
                                                    </div>
                                                )}
                                                {processedPoliwavePredictionData.tossup_lib_con_ndp > 0 && (
                                                    <div className="party-bar" style={{
                                                        background: 'linear-gradient(90deg, #D71920 33%, #034EA2 33%, #034EA2 66%, #F37021 66%)',
                                                        width: `${(processedPoliwavePredictionData.tossup_lib_con_ndp / processedPoliwavePredictionData.total_count) * 100}%`,
                                                        minWidth: '5%'
                                                    }}>
                                                        <span className="party-count">{processedPoliwavePredictionData.tossup_lib_con_ndp}</span>
                                                    </div>
                                                )}
                                                {processedPoliwavePredictionData.tossup_other > 0 && (
                                                    <div className="party-bar" style={{
                                                        background: '#888888',
                                                        width: `${(processedPoliwavePredictionData.tossup_other / processedPoliwavePredictionData.total_count) * 100}%`,
                                                        minWidth: '5%'
                                                    }}>
                                                        <span className="party-count">{processedPoliwavePredictionData.tossup_other}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="party-legend">
                                                <div className="legend-item">
                                                    <span className="color-box" style={{ background: partyColors.liberal }}></span>
                                                    <span>Liberal: {processedPoliwavePredictionData.liberal}</span>
                                                </div>
                                                <div className="legend-item">
                                                    <span className="color-box" style={{ background: partyColors.conservative }}></span>
                                                    <span>Conservative: {processedPoliwavePredictionData.conservative}</span>
                                                </div>
                                                <div className="legend-item">
                                                    <span className="color-box" style={{ background: partyColors.ndp }}></span>
                                                    <span>NDP: {processedPoliwavePredictionData.ndp}</span>
                                                </div>
                                                <div className="legend-item">
                                                    <span className="color-box" style={{ background: partyColors.green }}></span>
                                                    <span>Green: {processedPoliwavePredictionData.green}</span>
                                                </div>
                                                <div className="legend-item">
                                                    <span className="color-box" style={{ background: partyColors.bloc }}></span>
                                                    <span>Bloc: {processedPoliwavePredictionData.bloc}</span>
                                                </div>
                                                {/* Tossup legend items */}
                                                {processedPoliwavePredictionData.tossup_lib_con > 0 && (
                                                    <div className="legend-item">
                                                        <span className="color-box" style={{ background: 'linear-gradient(90deg, #D71920 50%, #034EA2 50%)' }}></span>
                                                        <span>Tossup Lib/Con: {processedPoliwavePredictionData.tossup_lib_con}</span>
                                                    </div>
                                                )}
                                                {processedPoliwavePredictionData.tossup_lib_ndp > 0 && (
                                                    <div className="legend-item">
                                                        <span className="color-box" style={{ background: 'linear-gradient(90deg, #D71920 50%, #F37021 50%)' }}></span>
                                                        <span>Tossup Lib/NDP: {processedPoliwavePredictionData.tossup_lib_ndp}</span>
                                                    </div>
                                                )}
                                                {processedPoliwavePredictionData.tossup_lib_bloc > 0 && (
                                                    <div className="legend-item">
                                                        <span className="color-box" style={{ background: 'linear-gradient(90deg, #D71920 50%, #ADD8E6 50%)' }}></span>
                                                        <span>Tossup Lib/Bloc: {processedPoliwavePredictionData.tossup_lib_bloc}</span>
                                                    </div>
                                                )}
                                                {processedPoliwavePredictionData.tossup_con_ndp > 0 && (
                                                    <div className="legend-item">
                                                        <span className="color-box" style={{ background: 'linear-gradient(90deg, #034EA2 50%, #F37021 50%)' }}></span>
                                                        <span>Tossup Con/NDP: {processedPoliwavePredictionData.tossup_con_ndp}</span>
                                                    </div>
                                                )}
                                                {processedPoliwavePredictionData.tossup_con_bloc > 0 && (
                                                    <div className="legend-item">
                                                        <span className="color-box" style={{ background: 'linear-gradient(90deg, #034EA2 50%, #ADD8E6 50%)' }}></span>
                                                        <span>Tossup Con/Bloc: {processedPoliwavePredictionData.tossup_con_bloc}</span>
                                                    </div>
                                                )}
                                                {processedPoliwavePredictionData.tossup_con_green > 0 && (
                                                    <div className="legend-item">
                                                        <span className="color-box" style={{ background: 'linear-gradient(90deg, #034EA2 50%, #00A878 50%)' }}></span>
                                                        <span>Tossup Con/Green: {processedPoliwavePredictionData.tossup_con_green}</span>
                                                    </div>
                                                )}
                                                {processedPoliwavePredictionData.tossup_lib_con_bloc > 0 && (
                                                    <div className="legend-item">
                                                        <span className="color-box" style={{ background: 'linear-gradient(90deg, #D71920 33%, #034EA2 33%, #034EA2 66%, #ADD8E6 66%)' }}></span>
                                                        <span>Tossup Lib/Con/Bloc: {processedPoliwavePredictionData.tossup_lib_con_bloc}</span>
                                                    </div>
                                                )}
                                                {processedPoliwavePredictionData.tossup_lib_con_ndp > 0 && (
                                                    <div className="legend-item">
                                                        <span className="color-box" style={{ background: 'linear-gradient(90deg, #D71920 33%, #034EA2 33%, #034EA2 66%, #F37021 66%)' }}></span>
                                                        <span>Tossup Lib/Con/NDP: {processedPoliwavePredictionData.tossup_lib_con_ndp}</span>
                                                    </div>
                                                )}
                                                {processedPoliwavePredictionData.tossup_other > 0 && (
                                                    <div className="legend-item">
                                                        <span className="color-box" style={{ background: '#888888' }}></span>
                                                        <span>Other Tossups: {processedPoliwavePredictionData.tossup_other}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {!loading && data && (
                    <>
                        <div className="cards-container">
                            {sortedEntries.map((entry, idx) => (
                                <div key={idx} className="entry-card">
                                    <div className="card-header">
                                        <h2 className="entry-name">{entry.name}</h2>
                                        <a href={`/map/${encodeURIComponent(entry.name)}`} className="view-button">
                                            View Map
                                        </a>
                                    </div>

                                    <div className="card-meta">
                                        <span className="updated-at">
                                            Saved: {new Date(entry.created_at).toLocaleString()}
                                        </span>
                                        <span className="total-count">
                                            Total: <strong>{entry.total_count}</strong> ridings
                                        </span>
                                    </div>

                                    <div className="party-stats">
                                        {Object.entries({
                                            liberal: entry.liberal,
                                            conservative: entry.conservative,
                                            ndp: entry.ndp,
                                            green: entry.green,
                                            bloc: entry.bloc
                                        })
                                        .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
                                        .map(([party, count]) => (
                                            <div key={party} className="party-bar" style={{
                                                background: partyColors[party as keyof typeof partyColors],
                                                width: `${(count as number / entry.total_count) * 100}%`,
                                                minWidth: (count as number) > 0 ? '5%' : '0'
                                            }}>
                                                <span className="party-count">{count}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="party-legend">
                                        <div className="legend-item">
                                            <span className="color-box" style={{ background: partyColors.liberal }}></span>
                                            <span>Liberal: {entry.liberal}</span>
                                        </div>
                                        <div className="legend-item">
                                            <span className="color-box" style={{ background: partyColors.conservative }}></span>
                                            <span>Conservative: {entry.conservative}</span>
                                        </div>
                                        <div className="legend-item">
                                            <span className="color-box" style={{ background: partyColors.ndp }}></span>
                                            <span>NDP: {entry.ndp}</span>
                                        </div>
                                        <div className="legend-item">
                                            <span className="color-box" style={{ background: partyColors.green }}></span>
                                            <span>Green: {entry.green}</span>
                                        </div>
                                        <div className="legend-item">
                                            <span className="color-box" style={{ background: partyColors.bloc }}></span>
                                            <span>Bloc: {entry.bloc}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination controls */}
                        {data.total > 0 && (
                            <div className="pagination-controls">
                                <button 
                                    className="pagination-button"
                                    onClick={() => changePage(pageNum - 1)}
                                    disabled={pageNum <= 1}
                                >
                                    Previous
                                </button>

                                <div className="pagination-pages">
                                    {(() => {
                                        const totalPages = Math.ceil(data.total / limitNum);
                                        const pages = [];

                                        // Always show first page
                                        if (totalPages > 0) {
                                            pages.push(
                                                <button 
                                                    key={1}
                                                    className={`page-number ${pageNum === 1 ? 'active' : ''}`}
                                                    onClick={() => changePage(1)}
                                                    disabled={pageNum === 1}
                                                >
                                                    1
                                                </button>
                                            );
                                        }

                                        // Add ellipsis if needed
                                        if (pageNum > 4) {
                                            pages.push(<span key="ellipsis1" className="ellipsis">...</span>);
                                        }

                                        // Add pages around current page
                                        for (let i = Math.max(2, pageNum - 2); i <= Math.min(totalPages - 1, pageNum + 2); i++) {
                                            if (i <= 1 || i >= totalPages) continue; // Skip first and last page as they're handled separately
                                            pages.push(
                                                <button 
                                                    key={i}
                                                    className={`page-number ${pageNum === i ? 'active' : ''}`}
                                                    onClick={() => changePage(i)}
                                                    disabled={pageNum === i}
                                                >
                                                    {i}
                                                </button>
                                            );
                                        }

                                        // Add ellipsis if needed
                                        if (pageNum < totalPages - 3) {
                                            pages.push(<span key="ellipsis2" className="ellipsis">...</span>);
                                        }

                                        // Always show last page if there's more than one page
                                        if (totalPages > 1) {
                                            pages.push(
                                                <button 
                                                    key={totalPages}
                                                    className={`page-number ${pageNum === totalPages ? 'active' : ''}`}
                                                    onClick={() => changePage(totalPages)}
                                                    disabled={pageNum === totalPages}
                                                >
                                                    {totalPages}
                                                </button>
                                            );
                                        }

                                        return pages;
                                    })()}
                                </div>

                                <span className="pagination-info">
                                    Page {pageNum} of {Math.max(1, Math.ceil((data.filtered_count ?? data.total) / limitNum))}
                                    {'  '}
                                    {(hideIncomplete || hideSingleParty) ? (
                                        <>
                                            ({data.filtered_count ?? data.total} filtered / {data.total} total entries)
                                            {(data.filtered_count ?? data.total) === 0 && (
                                                <span className="no-results">No entries match the current filters</span>
                                            )}
                                        </>
                                    ) : (
                                        <>({data.total} total entries)</>
                                    )}
                                </span>

                                <button 
                                    className="pagination-button"
                                    onClick={() => changePage(pageNum + 1)}
                                    disabled={pageNum >= Math.ceil((data.filtered_count ?? data.total) / limitNum)}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
            <style jsx>{`
                .container {
                    max-width: 1200px;
                    margin: 40px auto;
                    padding: 0 20px;
                    font-family: 'Inter', 'Segoe UI', Tahoma, sans-serif;
                    color: #333;
                }

                h1 {
                    text-align: center;
                    color: #222;
                    margin-bottom: 24px;
                    font-size: 32px;
                    font-weight: 700;
                }

                .header-actions {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                    gap: 16px;
                }

                .back-link {
                    color: #0070f3;
                    text-decoration: none;
                    font-weight: 500;
                    transition: color 0.2s;
                    display: inline-flex;
                    align-items: center;
                }

                .back-link:hover {
                    color: #0051b3;
                    text-decoration: underline;
                }

                .filter-controls {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin-bottom: 16px;
                }

                .filter-option {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .filter-option input[type="checkbox"] {
                    width: 16px;
                    height: 16px;
                    cursor: pointer;
                }

                .filter-option label {
                    font-size: 14px;
                    color: #555;
                    cursor: pointer;
                }

                .sort-controls {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .sort-controls label {
                    font-weight: 500;
                    color: #555;
                }

                .sort-controls select {
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    background-color: white;
                    font-size: 14px;
                    cursor: pointer;
                    outline: none;
                    transition: border-color 0.2s;
                }

                .sort-controls select:hover,
                .sort-controls select:focus {
                    border-color: #0070f3;
                }

                .sort-direction {
                    background: #f5f5f5;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 16px;
                    transition: all 0.2s;
                }

                .sort-direction:hover {
                    background: #e5e5e5;
                    border-color: #ccc;
                }

                .cards-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                    gap: 24px;
                }

                .entry-card {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                    overflow: hidden;
                    transition: transform 0.2s, box-shadow 0.2s;
                    border: 1px solid #f0f0f0;
                    padding: 20px;
                }

                .entry-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
                }

                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }

                .entry-name {
                    font-size: 20px;
                    font-weight: 600;
                    margin: 0;
                    color: #222;
                }

                .view-button {
                    background: #0070f3;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 8px 12px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background 0.2s;
                    text-decoration: none;
                }

                .view-button:hover {
                    background: #0051b3;
                }

                .card-meta {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 16px;
                    font-size: 14px;
                    color: #666;
                }

                .party-stats {
                    margin-bottom: 16px;
                }

                .party-bar {
                    height: 24px;
                    margin-bottom: 4px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    padding: 0 8px;
                    color: white;
                    font-weight: 500;
                    font-size: 12px;
                    transition: width 0.5s ease-out;
                }

                .party-count {
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
                }

                .party-legend {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                    gap: 8px;
                    font-size: 13px;
                }

                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .color-box {
                    width: 12px;
                    height: 12px;
                    border-radius: 2px;
                }

                .info,
                .error {
                    text-align: center;
                    font-size: 16px;
                    padding: 20px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                    margin-bottom: 24px;
                }

                .info {
                    color: #555;
                }

                .error {
                    color: #d00;
                    border-left: 4px solid #d00;
                }

                /* Pagination controls */
                .pagination-controls {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin-top: 32px;
                    gap: 16px;
                    flex-wrap: wrap;
                }

                .pagination-button {
                    background: #0070f3;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 8px 16px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .pagination-button:hover:not(:disabled) {
                    background: #0051b3;
                }

                .pagination-button:disabled {
                    background: #ccc;
                    cursor: not-allowed;
                }

                .pagination-pages {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                    justify-content: center;
                }

                .page-number {
                    min-width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    background: #f5f5f5;
                    border: 1px solid #ddd;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    padding: 0 8px;
                }

                .page-number:hover:not(:disabled) {
                    background: #e5e5e5;
                    border-color: #ccc;
                }

                .page-number.active {
                    background: #0070f3;
                    color: white;
                    border-color: #0070f3;
                    cursor: default;
                }

                .ellipsis {
                    font-size: 14px;
                    font-weight: 500;
                    color: #555;
                    padding: 0 4px;
                }

                .pagination-info {
                    white-space: pre;
                    font-size: 14px;
                    font-weight: 500;
                    color: #555;
                }

                .no-results {
                    display: block;
                    color: #d00;
                    font-weight: 500;
                    margin-top: 8px;
                }

                /* Responsive styles for mobile */
                @media (max-width: 768px) {
                    .container {
                        margin: 20px auto;
                        padding: 0 16px;
                    }

                    h1 {
                        font-size: 28px;
                        margin-bottom: 20px;
                    }

                    .header-actions {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 12px;
                    }

                    .sort-controls {
                        width: 100%;
                        justify-content: space-between;
                    }

                    .sort-controls select {
                        flex-grow: 1;
                    }

                    .cards-container {
                        grid-template-columns: 1fr;
                    }

                    .pagination-controls {
                        flex-wrap: wrap;
                        justify-content: center;
                        gap: 12px;
                    }

                    .pagination-pages {
                        order: 0;
                        width: 100%;
                        justify-content: center;
                        margin: 8px 0;
                    }

                    .pagination-info {
                        order: -1;
                        width: 100%;
                        text-align: center;
                        margin-bottom: 8px;
                    }
                }

                /* Accordion styles */
                .accordion {
                    margin-bottom: 32px;
                    border: 1px solid #e0e0e0;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                    background: white;
                }

                .accordion-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 20px;
                    background: #f5f5f5;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .accordion-header:hover {
                    background: #e8e8e8;
                }

                .accordion-header h2 {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 600;
                    color: #333;
                }

                .accordion-icon {
                    font-size: 16px;
                    color: #666;
                }

                .accordion-content {
                    padding: 20px;
                }

                .trusted-source-card {
                    width: 100%;
                    max-width: 100%;
                }

                /* Even smaller screens */
                @media (max-width: 480px) {
                    .container {
                        padding: 0 12px;
                    }

                    h1 {
                        font-size: 24px;
                    }

                    .entry-card {
                        padding: 16px;
                    }

                    .card-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 12px;
                    }

                    .view-button {
                        width: auto;
                        text-align: center;
                        display: inline-block;
                        max-width: 120px;
                    }

                    .card-meta {
                        flex-direction: column;
                        gap: 8px;
                    }

                    .party-legend {
                        grid-template-columns: 1fr 1fr;
                    }

                    .accordion-header {
                        padding: 12px 16px;
                    }

                    .accordion-header h2 {
                        font-size: 18px;
                    }

                    .accordion-content {
                        padding: 16px;
                    }
                }
            `}</style>
        </>
    );
};

export default EntriesView;
