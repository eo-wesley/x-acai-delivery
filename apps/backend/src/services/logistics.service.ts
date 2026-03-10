import { LogisticsRepository, DriverLocation } from '../db/repositories/logistics.repo';
import { v4 as uuidv4 } from 'uuid';
import { eventBus } from '../core/eventBus';
import { RouteService } from './route.service';
import { OrdersRepo } from '../db/repositories/orders.repo';

export class LogisticsService {
    private repo = new LogisticsRepository();
    private routeService = new RouteService();
    private ordersRepo = new OrdersRepo();

    async updateDriverLocation(driverId: string, orderId: string | undefined, lat: number, lng: number, heading?: number): Promise<void> {
        await this.repo.updateLocation({
            driver_id: driverId,
            order_id: orderId,
            latitude: lat,
            longitude: lng,
            heading
        });

        // Emit for SSE/Real-time
        eventBus.emit('driver_location_updated', {
            driverId,
            orderId,
            latitude: lat,
            longitude: lng,
            heading
        });
    }

    async getTrackingData(token: string): Promise<any> {
        // In a real app, the token would be a signed JWT or a hashed order ID.
        // For simplicity, we'll assume the token IS the order ID for now.
        const orderId = token;
        const location = await this.repo.getLocationByOrder(orderId);

        if (!location) {
            return { status: 'preparing', driver_location: null };
        }

        // AI-Enhanced ETA Logic (Using RouteService)
        let eta = 15;
        try {
            const order = await this.ordersRepo.getOrderById(orderId);
            if (order && order.latitude && order.longitude) {
                eta = await this.routeService.estimateTime(
                    [location.latitude, location.longitude],
                    [order.latitude, order.longitude]
                );
            }
        } catch (error) {
            console.error('[LogisticsService] Error calculating real ETA:', error);
        }

        return {
            status: 'delivering',
            driver_location: {
                lat: location.latitude,
                lng: location.longitude,
                heading: location.heading
            },
            eta: eta,
            last_update: location.last_update
        };
    }

    async getAllActiveDeliveries(): Promise<DriverLocation[]> {
        return await this.repo.getActiveDeliveries();
    }

    private calculateEstimatedTime(location: DriverLocation): number {
        // Very basic mock: random between 5 and 15 mins
        // In reality, this would use current distance to customer address.
        return Math.floor(Math.random() * 10) + 5;
    }
}
