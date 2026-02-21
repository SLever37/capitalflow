import { Campaign, CampaignLead } from '../types';

const CAMPAIGNS_KEY = 'cf_campaigns';
const LEADS_KEY = 'cf_campaign_leads';

export const campaignService = {
  getCampaigns: (): Campaign[] => {
    try {
      const saved = localStorage.getItem(CAMPAIGNS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load campaigns', e);
      return [];
    }
  },

  getCampaign: (id: string): Campaign | undefined => {
    const campaigns = campaignService.getCampaigns();
    return campaigns.find(c => c.id === id);
  },

  saveCampaign: (campaign: Campaign) => {
    const campaigns = campaignService.getCampaigns();
    const index = campaigns.findIndex(c => c.id === campaign.id);
    
    if (index >= 0) {
      campaigns[index] = campaign;
    } else {
      campaigns.unshift(campaign);
    }
    
    localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns));
  },

  deleteCampaign: (id: string) => {
    const campaigns = campaignService.getCampaigns();
    const filtered = campaigns.filter(c => c.id !== id);
    localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(filtered));
  },

  trackClick: (id: string) => {
    const campaigns = campaignService.getCampaigns();
    const campaign = campaigns.find(c => c.id === id);
    if (campaign) {
      campaign.clicks = (campaign.clicks || 0) + 1;
      campaignService.saveCampaign(campaign);
    }
  },

  saveLead: (lead: CampaignLead) => {
    try {
      const saved = localStorage.getItem(LEADS_KEY);
      const leads: CampaignLead[] = saved ? JSON.parse(saved) : [];
      leads.unshift(lead);
      localStorage.setItem(LEADS_KEY, JSON.stringify(leads));

      // Update campaign lead count
      const campaigns = campaignService.getCampaigns();
      const campaign = campaigns.find(c => c.id === lead.campaignId);
      if (campaign) {
        campaign.leads = (campaign.leads || 0) + 1;
        localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns));
      }
    } catch (e) {
      console.error('Failed to save lead', e);
    }
  },

  getLeads: (campaignId?: string): CampaignLead[] => {
    try {
      const saved = localStorage.getItem(LEADS_KEY);
      const leads: CampaignLead[] = saved ? JSON.parse(saved) : [];
      if (campaignId) {
        return leads.filter(l => l.campaignId === campaignId);
      }
      return leads;
    } catch (e) {
      console.error('Failed to load leads', e);
      return [];
    }
  }
};
