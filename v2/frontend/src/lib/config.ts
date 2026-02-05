// API Configuration
// Use Tailscale URL for remote access, localhost for local development

export const API_BASE_URL = 
  typeof window !== 'undefined' && window.location.hostname.includes('tailacc337.ts.net')
    ? 'http://0xs-mac-mini.tailacc337.ts.net:3001'
    : 'http://localhost:3001';

export const api = {
  agents: `${API_BASE_URL}/api/agents`,
  services: `${API_BASE_URL}/api/services`,
  jobs: `${API_BASE_URL}/api/jobs`,
  interview: `${API_BASE_URL}/api/interview`,
  webhooks: `${API_BASE_URL}/api/webhooks`,
  agentHooks: `${API_BASE_URL}/api/agent-hooks`,
};
