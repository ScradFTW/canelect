// @vitest-environment jsdom
import {describe, expect, it, vi} from 'vitest';
import type L from 'leaflet';
import {resetMapView} from '../mapUtils';
import {CANADA_EXTENT, DEFAULT_CENTER, DEFAULT_ZOOM, MAP_PROJECTION} from '../../types/mapProjection';

// Just the parts of L.Map that resetMapView touches
function fakeMap(width: number, height: number) {
    const setView = vi.fn();
    const map = {
        getSize: () => ({x: width, y: height}),
        getMinZoom: () => 0,
        options: {crs: MAP_PROJECTION},
        setView,
    } as unknown as L.Map;
    return {map, setView};
}

describe('resetMapView', () => {
    it('does nothing without a map', () => {
        expect(() => resetMapView(null)).not.toThrow();
    });

    it('uses the default framing at the 1200px design width', () => {
        const {map, setView} = fakeMap(1200, 650);

        resetMapView(map);

        expect(setView).toHaveBeenCalledWith(DEFAULT_CENTER, DEFAULT_ZOOM);
    });

    it('keeps the default framing but zooms out on narrower desktop windows', () => {
        const {map, setView} = fakeMap(862, 650);

        resetMapView(map);

        const [center, zoom] = setView.mock.calls[0];
        expect(center).toEqual(DEFAULT_CENTER);
        expect(zoom).toBe(2.25);
    });

    it('snaps to the map\'s 0.25 zoom steps', () => {
        const {map, setView} = fakeMap(1000, 650);

        resetMapView(map);

        expect(setView.mock.calls[0][1] % 0.25).toBe(0);
    });

    it('fits and centres the whole country on a phone', () => {
        const {map, setView} = fakeMap(317, 429);

        resetMapView(map);

        const [center, zoom] = setView.mock.calls[0];
        expect(center).not.toEqual(DEFAULT_CENTER);

        // Canada's projected extent must fit inside the map at the chosen zoom
        const [minX, minY, maxX, maxY] = CANADA_EXTENT;
        const pixelsPerMetre = MAP_PROJECTION.scale(zoom);
        expect((maxX - minX) * pixelsPerMetre).toBeLessThanOrEqual(317);
        expect((maxY - minY) * pixelsPerMetre).toBeLessThanOrEqual(429);

        // ...and be centred in it
        const projected = MAP_PROJECTION.projection.project(center);
        expect(projected.x).toBeCloseTo((minX + maxX) / 2, -3);
        expect(projected.y).toBeCloseTo((minY + maxY) / 2, -3);
    });

    it('never zooms below the minimum zoom', () => {
        const {map, setView} = fakeMap(120, 200);

        resetMapView(map);

        expect(setView.mock.calls[0][1]).toBeGreaterThanOrEqual(0);
    });
});
