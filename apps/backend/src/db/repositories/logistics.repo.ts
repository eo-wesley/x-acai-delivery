import { getDb } from '../db.client';

export interface DriverLocation {
    driver_id: string;
    order_id?: string;
    latitude: number;
    longitude: number;
    heading?: number;
    last_update?: string;
}

export class LogisticsRepository {
    async updateLocation(location: DriverLocation): Promise<void> {
        const db = await getDb();
        const sql = `
            INSERT INTO driver_locations (driver_id, order_id, latitude, longitude, heading, last_update)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(driver_id) DO UPDATE SET
                order_id = excluded.order_id,
                latitude = excluded.latitude,
                longitude = excluded.longitude,
                heading = excluded.heading,
                last_update = CURRENT_TIMESTAMP
        `;
        // Handle Postgres/SQLite compatibility for ON CONFLICT if needed,
        // but for now focusing on the logic. Postgres supports this syntax.
        // SQLite also supports ON CONFLICT since 3.24.0.
        await db.run(sql, [
            location.driver_id,
            location.order_id || null,
            location.latitude,
            location.longitude,
            location.heading || 0
        ]);
    }

    async getLocationByDriver(driverId: string): Promise<DriverLocation | null> {
        const db = await getDb();
        return await db.get('SELECT * FROM driver_locations WHERE driver_id = ?', [driverId]);
    }

    async getLocationByOrder(orderId: string): Promise<DriverLocation | null> {
        const db = await getDb();
        return await db.get('SELECT * FROM driver_locations WHERE order_id = ?', [orderId]);
    }

    async getActiveDeliveries(): Promise<DriverLocation[]> {
        const db = await getDb();
        return await db.all('SELECT * FROM driver_locations WHERE order_id IS NOT NULL');
    }
}
