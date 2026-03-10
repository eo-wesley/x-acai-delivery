type EventCallback = (payload: any) => Promise<void> | void;

class EventBus {
    private handlers: { [eventName: string]: EventCallback[] } = {};

    public on(eventName: string, callback: EventCallback) {
        if (!this.handlers[eventName]) {
            this.handlers[eventName] = [];
        }
        this.handlers[eventName].push(callback);
        console.log(`[EventBus] Registered handler for: ${eventName}`);
    }

    public off(eventName: string, callback: EventCallback) {
        if (!this.handlers[eventName]) return;
        this.handlers[eventName] = this.handlers[eventName].filter(cb => cb !== callback);
        console.log(`[EventBus] Removed handler for: ${eventName}`);
    }

    public async emit(eventName: string, payload: any) {
        if (!this.handlers[eventName]) return;

        console.log(`[EventBus] Emitting event: ${eventName}`);

        // Execute handlers concurrently to not block the calling flow
        const promises = this.handlers[eventName].map(async (handler) => {
            try {
                await handler(payload);
            } catch (e: any) {
                console.error(`[EventBus] Error executing handler for ${eventName}:`, e.message);
            }
        });

        // Fire and forget, or await if needed (currently firing and returning immediately)
        Promise.all(promises).catch(err => console.error('[EventBus] Global error:', err.message));
    }
}

export const eventBus = new EventBus();

// Example usage hook-up:
/*
eventBus.on('OrderCreated', async (order) => {
    await sendWhatsApp({ event: 'order_created', order });
});
*/
