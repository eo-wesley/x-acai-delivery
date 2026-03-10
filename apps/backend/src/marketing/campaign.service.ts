import { marketingRepo, CampaignFilter } from '../db/repositories/marketing.repo';
import { sendNotification } from '../notifications/notification.service';

export class CampaignService {
    async executeCampaign(tenantId: string, campaignId: string) {
        try {
            const campaign = await marketingRepo.getCampaignDetails(campaignId);
            if (!campaign) return;

            await marketingRepo.updateCampaignStatus(campaignId, 'sending');

            const filters: CampaignFilter = JSON.parse(campaign.filters || '{}');
            const customers = await marketingRepo.getSegmentedCustomers(tenantId, filters);

            console.log(`[CampaignService] Starting campaign ${campaignId} for ${customers.length} customers.`);

            for (const customer of customers) {
                try {
                    // Personalize message
                    const personalizedMessage = campaign.message.replace(/\{nome\}/gi, customer.name);

                    await sendNotification({
                        restaurantId: tenantId,
                        orderId: 'campaign-' + campaignId.substring(0, 8),
                        customerPhone: customer.phone,
                        customerName: customer.name,
                        event: 'promotion',
                        customMessage: personalizedMessage
                    });

                    await marketingRepo.logDelivery(campaignId, customer.id, 'sent');
                    await marketingRepo.updateCampaignProgress(campaignId, { sent: 1, error: 0 });

                    // Sleep 3-5 seconds between messages
                    const sleep = Math.floor(Math.random() * 2000) + 3000;
                    await new Promise(resolve => setTimeout(resolve, sleep));

                } catch (e: any) {
                    console.error(`[CampaignService] Failed for customer ${customer.id}:`, e.message);
                    await marketingRepo.logDelivery(campaignId, customer.id, 'failed', e.message);
                    await marketingRepo.updateCampaignProgress(campaignId, { sent: 0, error: 1 });
                }
            }

            await marketingRepo.updateCampaignStatus(campaignId, 'completed');
            console.log(`[CampaignService] Campaign ${campaignId} completed.`);
        } catch (error: any) {
            console.error(`[CampaignService] Critical failure for campaign ${campaignId}:`, error.message);
            await marketingRepo.updateCampaignStatus(campaignId, 'failed');
        }
    }
}

export const campaignService = new CampaignService();
