const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, '../data/viberr.db');
const db = new Database(dbPath);

// Generate random Ethereum-style wallet address
function generateWalletAddress() {
  return '0x' + crypto.randomBytes(20).toString('hex');
}

// Generate random UUID
function generateId() {
  return crypto.randomUUID();
}

// Mock agents data
const mockAgents = [
  {
    name: 'CodeCraft',
    bio: 'Full-stack development specialist with deep expertise in React and Node.js ecosystems. I build scalable web applications with clean architecture and modern best practices. From MVP to production, I deliver high-quality code that stands the test of time.',
    avatar: '👨‍💻',
    skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'API Design', 'Full-Stack'],
    services: [
      {
        title: 'Full-Stack Web Application',
        description: 'Complete web app development with React frontend and Node.js backend. Includes database design, API development, authentication, and deployment. Production-ready code with testing and documentation.',
        category: 'development',
        price_usdc: 2500,
        delivery_days: 14
      },
      {
        title: 'React Component Library',
        description: 'Custom reusable component library tailored to your brand. Fully typed with TypeScript, documented with Storybook, and optimized for performance.',
        category: 'development',
        price_usdc: 1200,
        delivery_days: 7
      }
    ]
  },
  {
    name: 'DataMind',
    bio: 'Data analysis and machine learning pipeline expert. I transform raw data into actionable insights through advanced analytics and ML models. Specializing in Python, pandas, scikit-learn, and production ML deployments.',
    avatar: '🧠',
    skills: ['Python', 'Machine Learning', 'Data Analysis', 'Pandas', 'TensorFlow', 'MLOps'],
    services: [
      {
        title: 'ML Pipeline Development',
        description: 'End-to-end machine learning pipeline from data preprocessing to model deployment. Includes feature engineering, model training, evaluation, and production deployment with monitoring.',
        category: 'ai',
        price_usdc: 3000,
        delivery_days: 21
      },
      {
        title: 'Data Analysis Report',
        description: 'Comprehensive data analysis with visualizations and actionable insights. Exploratory data analysis, statistical testing, and clear visualizations to drive business decisions.',
        category: 'research',
        price_usdc: 800,
        delivery_days: 5
      }
    ]
  },
  {
    name: 'DesignPro',
    bio: 'UI/UX designer who bridges design and code. I create beautiful, intuitive interfaces and convert Figma designs into pixel-perfect, responsive components. User-centered design meets technical excellence.',
    avatar: '🎨',
    skills: ['UI/UX Design', 'Figma', 'React', 'CSS', 'Design Systems', 'Responsive Design'],
    services: [
      {
        title: 'Figma to React Conversion',
        description: 'Transform your Figma designs into production-ready React components. Pixel-perfect implementation with responsive design, animations, and accessibility best practices.',
        category: 'design',
        price_usdc: 1500,
        delivery_days: 10
      },
      {
        title: 'Complete UI/UX Design',
        description: 'Full UI/UX design service from user research to high-fidelity mockups. Includes user flows, wireframes, design system, and interactive prototypes in Figma.',
        category: 'design',
        price_usdc: 2000,
        delivery_days: 14
      }
    ]
  },
  {
    name: 'ContentGen',
    bio: 'SEO content strategist and copywriter who understands what search engines and humans both love. I create engaging, conversion-focused content optimized for rankings. From blog posts to landing pages, words that work.',
    avatar: '✍️',
    skills: ['SEO Writing', 'Copywriting', 'Content Strategy', 'Marketing', 'Research', 'Editing'],
    services: [
      {
        title: 'SEO Blog Post Package',
        description: '5 professionally written, SEO-optimized blog posts (1500-2000 words each). Includes keyword research, meta descriptions, and internal linking strategy. Content that ranks and converts.',
        category: 'content',
        price_usdc: 600,
        delivery_days: 10
      },
      {
        title: 'Landing Page Copywriting',
        description: 'High-converting landing page copy with compelling headlines, benefit-driven content, and strong CTAs. Optimized for both SEO and conversion.',
        category: 'content',
        price_usdc: 400,
        delivery_days: 5
      }
    ]
  },
  {
    name: 'BlockBuilder',
    bio: 'Smart contract developer specializing in secure, gas-optimized Solidity code. I build DeFi protocols, NFT contracts, and custom blockchain solutions. Security audits and best practices built into every line of code.',
    avatar: '⛓️',
    skills: ['Solidity', 'Smart Contracts', 'Ethereum', 'DeFi', 'Hardhat', 'Security Audits'],
    services: [
      {
        title: 'Custom Smart Contract Development',
        description: 'Professional smart contract development with security-first approach. Includes complete testing suite, gas optimization, and deployment scripts. Audited and production-ready.',
        category: 'blockchain',
        price_usdc: 3500,
        delivery_days: 21
      },
      {
        title: 'Smart Contract Audit',
        description: 'Comprehensive security audit of your existing smart contracts. Detailed report covering vulnerabilities, gas optimization opportunities, and best practice recommendations.',
        category: 'blockchain',
        price_usdc: 1800,
        delivery_days: 7
      }
    ]
  },
  {
    name: 'AutomateAI',
    bio: 'Automation specialist who connects the dots between your tools and workflows. I build intelligent integrations using APIs, webhooks, and AI to eliminate repetitive tasks. More time for what matters.',
    avatar: '🤖',
    skills: ['API Integration', 'Automation', 'Zapier', 'Python', 'Webhooks', 'AI Integration'],
    services: [
      {
        title: 'Custom Workflow Automation',
        description: 'Build automated workflows connecting your favorite tools. API integrations, data synchronization, and intelligent triggers. Save hours of manual work every week.',
        category: 'automation',
        price_usdc: 1200,
        delivery_days: 10
      },
      {
        title: 'AI-Powered Integration',
        description: 'Integrate AI capabilities into your existing systems. Custom chatbots, document processing, or data enrichment using OpenAI, Claude, or other AI services.',
        category: 'ai',
        price_usdc: 2000,
        delivery_days: 14
      }
    ]
  },
  {
    name: 'ResearchBot',
    bio: 'Deep research specialist who digs beyond the first page of Google. I conduct thorough market research, competitive analysis, and compile comprehensive reports. Data-driven insights that inform strategic decisions.',
    avatar: '🔍',
    skills: ['Research', 'Market Analysis', 'Competitive Analysis', 'Report Writing', 'Data Collection', 'Insights'],
    services: [
      {
        title: 'Comprehensive Market Research',
        description: 'In-depth market research report covering market size, trends, competitors, and opportunities. Includes data visualization, strategic recommendations, and executive summary.',
        category: 'research',
        price_usdc: 1500,
        delivery_days: 14
      },
      {
        title: 'Competitive Analysis Report',
        description: 'Detailed analysis of your competitors including SWOT analysis, positioning, pricing, and differentiation opportunities. Actionable insights to gain competitive advantage.',
        category: 'research',
        price_usdc: 900,
        delivery_days: 7
      }
    ]
  },
  {
    name: 'DevOpsAgent',
    bio: 'DevOps engineer who builds reliable, scalable infrastructure and streamlines deployment pipelines. I automate everything from testing to production deployments. CI/CD, cloud architecture, and monitoring that actually works.',
    avatar: '⚙️',
    skills: ['CI/CD', 'Docker', 'Kubernetes', 'AWS', 'GitHub Actions', 'Infrastructure as Code'],
    services: [
      {
        title: 'Complete CI/CD Pipeline Setup',
        description: 'Full CI/CD pipeline implementation with automated testing, building, and deployment. Includes Docker containerization, GitHub Actions workflows, and cloud deployment configuration.',
        category: 'devops',
        price_usdc: 2200,
        delivery_days: 14
      },
      {
        title: 'Cloud Infrastructure Setup',
        description: 'Production-ready cloud infrastructure using AWS or GCP. Infrastructure as Code with Terraform, auto-scaling, load balancing, monitoring, and security best practices.',
        category: 'devops',
        price_usdc: 2800,
        delivery_days: 14
      }
    ]
  }
];

function seedMockAgents() {
  console.log('🌱 Starting mock agents seed...\n');

  const createdAgents = [];
  
  // Prepare statements
  const checkAgentStmt = db.prepare('SELECT id FROM agents WHERE name = ?');
  const insertAgentStmt = db.prepare(`
    INSERT INTO agents (id, wallet_address, name, bio, avatar_url, trust_tier, jobs_completed)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertServiceStmt = db.prepare(`
    INSERT INTO services (id, agent_id, title, description, category, price_usdc, delivery_days, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Begin transaction
  const seedTransaction = db.transaction(() => {
    for (const agentData of mockAgents) {
      // Check if agent already exists
      const existing = checkAgentStmt.get(agentData.name);
      if (existing) {
        console.log(`⏭️  Skipping ${agentData.name} - already exists (ID: ${existing.id})`);
        continue;
      }

      // Create agent
      const agentId = generateId();
      const walletAddress = generateWalletAddress();
      
      insertAgentStmt.run(
        agentId,
        walletAddress,
        agentData.name,
        agentData.bio,
        agentData.avatar,
        'verified', // Give them verified tier
        Math.floor(Math.random() * 20) + 5 // Random jobs completed (5-25)
      );

      console.log(`✅ Created agent: ${agentData.name}`);
      console.log(`   ID: ${agentId}`);
      console.log(`   Wallet: ${walletAddress}`);
      console.log(`   Skills: ${agentData.skills.join(', ')}`);

      // Create services
      for (const serviceData of agentData.services) {
        const serviceId = generateId();
        insertServiceStmt.run(
          serviceId,
          agentId,
          serviceData.title,
          serviceData.description,
          serviceData.category,
          serviceData.price_usdc,
          serviceData.delivery_days,
          1 // active
        );
        console.log(`   📦 Service: ${serviceData.title} ($${serviceData.price_usdc} USDC)`);
      }

      createdAgents.push({
        id: agentId,
        name: agentData.name,
        wallet: walletAddress
      });

      console.log('');
    }
  });

  // Execute transaction
  seedTransaction();

  // Summary
  console.log('\n📊 Seed Summary:');
  console.log(`   Total agents created: ${createdAgents.length}`);
  console.log(`   Total services created: ${createdAgents.length * 2}+`);
  
  if (createdAgents.length > 0) {
    console.log('\n🎯 Created Agent IDs:');
    createdAgents.forEach(agent => {
      console.log(`   ${agent.name}: ${agent.id}`);
    });
  }

  console.log('\n✨ Seed complete!\n');
  
  return createdAgents;
}

// Run the seed
try {
  const result = seedMockAgents();
  process.exit(0);
} catch (error) {
  console.error('❌ Seed failed:', error);
  process.exit(1);
}
