#!/usr/bin/env node

const { ethers } = require('ethers');

async function registerTasks() {
  const jobId = '7b0f0a4d-3c1b-449b-9a7e-8ff0b5cf2087';
  const privateKey = '0xbd587042e0ed7278d5e8c89aa03306970e66d7b7ed6eb91868c80be6b8277ee3';
  const wallet = new ethers.Wallet(privateKey);
  
  const timestamp = Date.now();
  const message = `Viberr Auth: ${timestamp}`;
  const signature = await wallet.signMessage(message);
  
  const tasks = [
    {
      title: "Initialize React + Vite project with Tailwind CSS",
      description: "Set up project foundation with Vite, React, and Tailwind CSS configuration",
      testCriteria: "Dev server runs on localhost and Tailwind classes work",
      phase: "setup",
      taskType: "setup"
    },
    {
      title: "Build color picker component",
      description: "Create interactive color picker UI component",
      testCriteria: "Can select colors via picker UI and color changes are reflected visually",
      phase: "frontend",
      taskType: "frontend"
    },
    {
      title: "Implement hex code display",
      description: "Real-time hex code display that updates as color changes",
      testCriteria: "Hex code updates in real-time and is properly formatted (#RRGGBB)",
      phase: "frontend",
      taskType: "frontend"
    },
    {
      title: "Add copy-to-clipboard functionality",
      description: "Button to copy hex code to clipboard with visual feedback",
      testCriteria: "Click button copies hex to clipboard with toast/message feedback",
      phase: "frontend",
      taskType: "frontend"
    },
    {
      title: "Apply dark theme styling",
      description: "Implement consistent dark theme across all components",
      testCriteria: "All components use dark theme with accessible contrast ratios",
      phase: "frontend",
      taskType: "frontend"
    },
    {
      title: "Make responsive",
      description: "Ensure app works across mobile, tablet, and desktop",
      testCriteria: "Works on 375px (mobile), 768px (tablet), and 1920px (desktop)",
      phase: "frontend",
      taskType: "frontend"
    },
    {
      title: "Build production bundle",
      description: "Create optimized production build",
      testCriteria: "npm run build succeeds and build size is under 500KB",
      phase: "deploy",
      taskType: "deploy"
    },
    {
      title: "Deploy to Vercel",
      description: "Deploy to Vercel with unique auto-generated URL",
      testCriteria: "Site loads at public URL with all features working, no console errors",
      phase: "deploy",
      taskType: "deploy"
    }
  ];

  const response = await fetch(`https://api.viberr.fun/api/jobs/${jobId}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Wallet-Address': wallet.address,
      'X-Signature': signature,
      'X-Message': message
    },
    body: JSON.stringify({ tasks })
  });

  const result = await response.json();
  console.log(JSON.stringify(result, null, 2));
}

registerTasks().catch(console.error);
