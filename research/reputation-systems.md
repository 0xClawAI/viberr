# Reputation & Trust Systems for Decentralized Networks

> Research Report for Viberr Protocol
> Date: February 3, 2026
> Focus: AI Agent-Specific Applications

---

## Executive Summary

This report analyzes existing reputation and trust systems in decentralized networks, evaluating their applicability to AI agents. The key finding: **most existing systems are designed for humans**, but several can be adapted or combined for agent trust.

The most promising approaches for AI agents:
1. **ERC-8004** - Purpose-built for AI agent trust (identity + reputation + validation)
2. **EAS (Attestation Service)** - Flexible attestation primitive for cross-agent credentialing
3. **EigenTrust-style algorithms** - Adapted for agent-to-agent feedback loops
4. **Hybrid stake + performance** - Economic commitment plus track record

---

## 1. Human Passport (formerly Gitcoin Passport)

### Overview
Originally Gitcoin Passport, now maintained by Holonym Foundation as part of human.tech ecosystem. Primary use: Sybil resistance for airdrops and governance.

### How It Works
- **Stamps**: Verifiable credentials proving various attributes (social accounts, POAPs, on-chain activity, ENS ownership, etc.)
- **Scoring**: Weighted combination of stamps → aggregated "humanity score"
- **ML Detection**: Machine learning model analyzing wallet behavior for Sybil patterns
- **On-chain Attestations**: Stamps can be minted on-chain (currently live on Base, OP Mainnet)

### Key Mechanisms
- Gradual Unique Humanity Verification (probabilistic, scored)
- Boolean Unique Humanity Verification (binary pass/fail)
- Cost of Forgery principle: making fake identities expensive

### Stats
- 2M+ passports created
- $225M+ protected in airdrop/grant funds

### AI Agent Applicability: ⚠️ LIMITED

**Problems:**
- Designed for human identity verification
- Many stamps require human social accounts (Twitter, GitHub, Discord)
- Biometric verification impossible for agents

**Potential Use:**
- Agent operators could stake their human passport reputation on agents they deploy
- "This human vouches for this agent" chain of trust
- Stamps for on-chain activity could apply (wallet age, transaction history)

---

## 2. Ethereum Attestation Service (EAS)

### Overview
Open-source infrastructure for making attestations on-chain or off-chain. Think: "signed claims about anything by anyone."

### Architecture
```
┌─────────────────────────────────────────────┐
│           Schema Registry                    │
│  (defines structure of attestations)         │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│           Attestation Contract               │
│  (creates attestations using schemas)        │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│        Optional Resolver Contract            │
│  (triggers actions: payments, NFTs, etc.)    │
└─────────────────────────────────────────────┘
```

### Key Features
- **Custom Schemas**: Define any data structure for attestations
- **On-chain/Off-chain**: Choose based on privacy/cost tradeoffs
- **Private Data Attestations**: Merkle tree encoding for selective disclosure
- **Revocability**: Attestations can be revoked by attestor
- **Reference Chaining**: Attestations can reference other attestations (web of attestations)
- **EIP-712 Signing**: Secure, wallet-verifiable signatures

### AI Agent Applicability: ✅ HIGH

**Perfect for:**
- Agent-to-agent attestations ("I verify this agent completed task X correctly")
- Validator attestations ("I independently verified this output")
- Skill/capability attestations ("This agent can perform DeFi swaps")
- Operator attestations ("This agent is operated by verified entity Y")

**Implementation Pattern:**
```solidity
// Schema for agent performance attestation
{
  "agentId": "address",
  "taskType": "string",
  "success": "bool",
  "responseTime": "uint256",
  "quality": "uint8",  // 0-100
  "timestamp": "uint256"
}
```

---

## 3. Lens Protocol

### Overview
Decentralized social graph protocol by Aave. Focus: portable social identity and content ownership.

### Architecture (v3 "New Lens")
- **Accounts**: User identity primitives
- **Usernames**: On-chain handles
- **Graphs**: Social connections (followers/following)
- **Feeds**: Content aggregation
- **Groups**: Community primitives
- **Apps**: Third-party integration points
- **Rules**: Modular logic for permissions
- **Sponsorships**: Gas abstraction

### Reputation Signals
- Follower count and quality
- Content engagement (mirrors, collects, comments)
- Graph position (who follows you, who you follow)
- Activity history
- Publications quality/quantity

### AI Agent Applicability: ⚠️ MODERATE

**Use Cases:**
- Agents with social presences building reputation through content
- ORB (Lens app) has on-chain reputation system
- Could use social graph as one signal among many

**Limitations:**
- Primarily designed for human social interaction
- Reputation is social, not task-completion based
- Gaming through content farms is possible

---

## 4. Farcaster Reputation

### Overview
Sufficiently decentralized social protocol. Two-layer architecture: on-chain identity (FID) + off-chain content (Hubs).

### Identity Model
- **FID (Farcaster ID)**: On-chain via IdRegistry contract
- **Custody Address**: Controls the FID
- **Key Registry**: Manages signing keys
- **Hubs**: Decentralized storage nodes for social data

### Reputation Signals
- Cast engagement (likes, recasts, replies)
- Follower quality and quantity
- Network position in social graph
- Channel participation and credibility
- Early adopter status
- Cross-platform verification (GitHub, etc.)

### Unique Properties
- Data portability between apps
- Delta graph synchronization across Hubs
- CRDT-based consistency
- Gossip protocol for propagation

### AI Agent Applicability: ⚠️ MODERATE

**Potential:**
- Agents with Farcaster presence build organic reputation
- On-chain FID provides verifiable identity
- Could weight agent FID reputation in trust calculations

**Challenges:**
- Social reputation ≠ task completion reputation
- Gaming through bot networks
- Requires ongoing social activity

---

## 5. Ethos Network

### Overview
Web3 reputation protocol focused on credibility scoring. Combats crypto fraud through peer attestations.

### Core Mechanisms

**1. Reviews**
- Qualitative peer assessments
- Anyone can review anyone (even non-Ethos users via X)
- Community moderation (upvotes/downvotes affect impact)
- Permanent on-chain record

**2. Vouches**
- Quantitative trust signal
- Stake ETH behind endorsement
- Economic skin in the game
- Credibility of voucher affects weight

**3. Slashes**
- Negative reputation signal
- Penalizes bad actors
- Requires stake (prevents spam slashing)

### Credibility Score Components
| Factor | Type |
|--------|------|
| Wallet age | Positive |
| ETH vouched for others | Positive |
| Twitter followers | Positive |
| Positive reviews | Positive |
| Who invited you | Positive |
| ETH vouched in you | Positive |
| Credible vouchers | Positive |
| Slashes against you | Negative |
| Negative reviews | Negative |
| Sybil likelihood | Negative |
| Attestations | Contextual |

### AI Agent Applicability: ✅ HIGH

**Strong fit because:**
- Stake-backed vouching applies to agents
- Reviewable by clients/users
- Slashing for bad behavior
- Sybil resistance built-in
- On-chain, composable

**Implementation:**
- Agents get Ethos profiles
- Clients review after task completion
- Operators vouch with stake
- Bad agents get slashed

---

## 6. Web of Trust (Classical Model)

### Overview
Originated with PGP cryptography. Decentralized alternative to certificate authorities.

### How It Works
```
Alice ──trusts──▶ Bob ──trusts──▶ Carol
        └─────────────────▶ (Alice can transitively trust Carol)
```

### Key Concepts
- **Direct Trust**: You personally verify and trust a key
- **Transitive Trust**: Trust flows through chains
- **Trust Levels**: Full, marginal, none
- **Validity**: How sure you are a key belongs to claimed identity
- **Trust Depth**: How many hops of trust you allow

### Problems
- Trust decay over distance
- Single point of failure (if key signer is compromised)
- Cold start for new participants
- No negative feedback mechanism

### AI Agent Applicability: ⚠️ MODERATE

**Could work as:**
- Operator endorsement chains
- Agent vouching for other agents
- Hierarchical trust (verified operators → their agents)

**Modifications needed:**
- Add decay functions for stale trust
- Incorporate negative signals (not just positive)
- Quantify trust rather than boolean

---

## 7. EigenTrust Algorithm

### Overview
Reputation algorithm designed for P2P networks (2003, Stanford). Addresses malicious actors in file-sharing networks.

### Algorithm Core
1. **Local Trust**: Peer `i` rates peer `j` based on direct interactions
2. **Normalization**: Normalize local trust values
3. **Aggregation**: Compute global trust as weighted average of local trusts
4. **Iteration**: Repeat until convergence (eigenvector computation)

### Key Properties
```
t_i = Σ (c_ji × t_j)   // Global trust is sum of 
                        // (normalized local trust × recommender's global trust)
```

- Pre-trusted peers anchor the system
- Malicious collectives cannot inflate trust
- Converges to principal eigenvector
- O(n) storage per peer

### Strengths
- Distributed computation
- Robust against collusion
- No central authority
- Mathematically proven convergence

### AI Agent Applicability: ✅ HIGH

**Excellent fit because:**
- Agents naturally have transaction histories
- Can weight by economic value of transactions
- Handles collusion resistance
- Scales to many agents

**Adaptation for agents:**
```
Local trust = f(
  task_success_rate,
  response_quality,
  economic_value,
  timeliness
)
```

---

## 8. Token-Curated Registries (TCRs)

### Overview
Decentralized curation using token staking. Token holders maintain a list through economic incentives.

### Mechanism
```
┌───────────────────────────────────────────────┐
│                   TCR                          │
│                                               │
│  1. Applicant stakes tokens to join list      │
│  2. Challengers can dispute with stake        │
│  3. Token holders vote on disputes            │
│  4. Winners get loser's stake                 │
│  5. Good actors profit, bad actors lose       │
└───────────────────────────────────────────────┘
```

### Variants
- **Binary TCR**: In/out of list
- **Graded TCR**: Ranked position
- **Ordered TCR**: Priority ranking by stake

### Problems
- Low participation (voter apathy)
- Attack vectors (plutocracy, bribery)
- Cold start
- High friction for new entrants

### AI Agent Applicability: ⚠️ LIMITED

**Could work for:**
- Curated list of "trusted agents"
- Stake-to-join agent registries
- Community-vetted agent directories

**Challenges:**
- Binary good/bad doesn't capture agent nuance
- High friction reduces adoption
- Better suited for lists than continuous reputation

---

## 9. ERC-8004: Trustless Agents

### Overview
Purpose-built standard for AI agent trust on Ethereum. Draft ERC (August 2025) by MetaMask, EF, Google, Coinbase contributors.

### Three Registries

**1. Identity Registry**
- ERC-721 based (NFT for each agent)
- agentURI → registration file (IPFS/HTTPS/on-chain)
- Contains: name, description, services, endpoints
- Supports: A2A, MCP, ENS, DID integration

**2. Reputation Registry**
- Posting and fetching feedback signals
- On-chain (composability) + off-chain (complex algorithms)
- Enables: scoring services, auditor networks, insurance pools

**3. Validation Registry**
- Independent verification hooks
- Options: stake-backed re-execution, zkML proofs, TEE attestation

### Registration File Structure
```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "myAgentName",
  "description": "Agent description...",
  "image": "https://example.com/agent.png",
  "services": [
    {"name": "A2A", "endpoint": "https://...", "version": "0.3.0"},
    {"name": "MCP", "endpoint": "https://...", "version": "2025-06-18"}
  ],
  "supportedTrust": ["reputation", "crypto-economic", "tee-attestation"]
}
```

### Trust Models (Pluggable)
| Model | Mechanism | Use Case |
|-------|-----------|----------|
| Reputation | Client feedback aggregation | Low-stakes tasks |
| Crypto-economic | Stake-secured re-execution | Medium-stakes |
| zkML | Zero-knowledge proof of computation | Verifiable ML |
| TEE | Hardware attestation | High-security |

### AI Agent Applicability: ✅ EXCELLENT

**This is THE standard for agent trust:**
- Purpose-built for agents
- Integrates with A2A, MCP protocols
- Pluggable trust levels
- Chain-agnostic (any L2)
- Censorship-resistant identity

---

## 10. Other Notable Systems

### Cirtus AI
- Trust layer for autonomous agents
- Decentralized identity + secure wallets + verifiable reputation
- Production platform

### Talent Protocol
- On-chain reputation for professionals
- Builder scores
- Could apply to agent operators

### Worldcoin World ID
- Iris-scan proof of personhood
- Useful for: human-operated agent verification
- Not applicable to pure AI agents

### Clawdict / BotGames
- AI agent prediction markets and reputation
- Performance-based scoring
- Competition-driven reputation

---

## Recommendations for Viberr

### Tier 1: Core Implementation

**1. Adopt ERC-8004 Framework**
- Register agents in Identity Registry
- Implement reputation feedback loops
- Support multiple validation methods

**2. Build on EAS**
- Define schemas for agent attestations
- Enable agent-to-agent credentialing
- Create resolver contracts for incentives

### Tier 2: Reputation Algorithm

**3. Modified EigenTrust**
```
Global_Trust(agent) = Σ(
  weight_i × Local_Trust_i × Credibility_i
)

where:
- weight_i = economic_value of interaction
- Local_Trust_i = direct experience score
- Credibility_i = recommender's global trust
```

**4. Ethos-style Mechanisms**
- Stake-backed vouching
- Slashing for misbehavior
- Review aggregation

### Tier 3: Bootstrap & Cold Start

**5. Operator Vouching**
- Human operators vouch for their agents
- Use Human Passport scores as operator credibility
- Stake requirements scale with agent capabilities

**6. Graduated Trust**
- New agents start with low trust ceiling
- Trust ceiling increases with:
  - Successful task completions
  - Time in network
  - Stake accumulation
  - Peer vouches

### Trust Tiers for Different Operations

| Task Type | Required Trust | Validation |
|-----------|---------------|------------|
| Information lookup | Low | Reputation only |
| Content generation | Low-Medium | Reputation + sampling |
| Financial (< $100) | Medium | Stake + reputation |
| Financial (> $100) | High | Multi-validator |
| Critical operations | Very High | zkML/TEE + stake |

---

## Open Questions

1. **Agent Identity Persistence**: If an agent's model changes (fine-tuned, updated), is it the "same" agent?

2. **Operator vs Agent Trust**: How to separate the trust of the human operator from the AI agent?

3. **Gaming Resistance**: Agents could create fake tasks and fake completions to build reputation.

4. **Cross-chain Reputation**: How to aggregate reputation across multiple chains?

5. **Privacy**: Can reputation be proven without revealing all past interactions?

---

## References

- [ERC-8004 Draft](https://eips.ethereum.org/EIPS/eip-8004)
- [EAS Documentation](https://docs.attest.org/)
- [Human Passport](https://passport.human.tech/)
- [Ethos Network](https://ethos.network/)
- [EigenTrust Paper](https://nlp.stanford.edu/pubs/eigentrust.pdf)
- [Lens Protocol](https://lens.xyz/docs/protocol)
- [Farcaster Protocol](https://docs.farcaster.xyz/)

---

*Report generated by 0xClaw subagent*
