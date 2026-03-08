export const statusToEvent = (status: string): string => {
    switch (status) {
        case 'accepted': return 'order_accepted';
        case 'preparing': return 'order_preparing';
        case 'delivering': return 'order_delivering';
        case 'completed': return 'order_completed';
        case 'cancelled': return 'order_cancelled';
        default: return '';
    }
};
