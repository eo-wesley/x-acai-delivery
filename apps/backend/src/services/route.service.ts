import axios from 'axios';

export interface RouteInfo {
    distance: number; // meters
    duration: number; // seconds
    geometry: string; // polyline or geojson
}

export class RouteService {
    // Public OSRM API (Use a private instance for production to avoid rate limits)
    private readonly OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

    /**
     * Calculates route between two points
     * @param start [lat, lng]
     * @param end [lat, lng]
     */
    async getRoute(start: [number, number], end: [number, number]): Promise<RouteInfo | null> {
        try {
            // OSRM coordinates are [lng,lat]
            const coords = `${start[1]},${start[0]};${end[1]},${end[0]}`;
            const url = `${this.OSRM_URL}/${coords}?overview=full&geometries=polyline`;

            const response = await axios.get(url);

            if (response.data && response.data.routes && response.data.routes.length > 0) {
                const route = response.data.routes[0];
                return {
                    distance: route.distance,
                    duration: route.duration,
                    geometry: route.geometry
                };
            }
            return null;
        } catch (error) {
            console.error('[RouteService] Error fetching route:', error);
            return null;
        }
    }

    /**
     * Estimates time in minutes between two points
     */
    async estimateTime(start: [number, number], end: [number, number]): Promise<number> {
        const route = await this.getRoute(start, end);
        if (!route) return 15; // Fallback

        // Duration is in seconds, convert to minutes and add buffer (20%)
        return Math.ceil((route.duration / 60) * 1.2);
    }
}
