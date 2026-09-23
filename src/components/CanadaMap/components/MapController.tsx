// MapController component for the CanadaMap
import { useMap } from 'react-leaflet';
import { useEffect } from 'react';
import { Map } from 'leaflet';
import { resetMapView } from '../utils/mapUtils';

interface MapControllerProps {
    setMap: React.Dispatch<React.SetStateAction<Map | null>>;
}

const MapController: React.FC<MapControllerProps> = ({ setMap }) => {
    const map = useMap();

    useEffect(() => {
        setMap(map);
        // Start with the whole country in view at whatever width the map has
        resetMapView(map);
    }, [map, setMap]);

    return null;
};

export default MapController;