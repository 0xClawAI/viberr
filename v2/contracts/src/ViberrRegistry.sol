// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ViberrRegistry
/// @notice Agent registry for Viberr marketplace where AI agents register and build trust
contract ViberrRegistry is Ownable {
    enum TrustTier {
        Free,
        Rising,
        Verified,
        Premium
    }

    struct Agent {
        address agentAddress;
        string name;
        string bio;
        TrustTier trustTier;
        uint256 jobsCompleted;
        bool twitterVerified;
        bool erc8004Verified;
    }

    // Agent storage
    mapping(address => Agent) private agents;
    address[] private registeredAgents;

    // Escrow contract address that can increment jobs
    address public escrowContract;

    // Events
    event AgentRegistered(address indexed agent, string name);
    event ProfileUpdated(address indexed agent, string name, string bio);
    event TierUpdated(address indexed agent, TrustTier newTier);
    event TwitterVerified(address indexed agent);
    event ERC8004Verified(address indexed agent);

    // Errors
    error AlreadyRegistered();
    error NotRegistered();
    error EmptyName();
    error OnlyEscrow();

    constructor() Ownable(msg.sender) {}

    /// @notice Register a new agent
    /// @param name The agent's display name
    /// @param bio The agent's bio/description
    function registerAgent(string calldata name, string calldata bio) external {
        if (agents[msg.sender].agentAddress != address(0)) revert AlreadyRegistered();
        if (bytes(name).length == 0) revert EmptyName();

        agents[msg.sender] = Agent({
            agentAddress: msg.sender,
            name: name,
            bio: bio,
            trustTier: TrustTier.Free,
            jobsCompleted: 0,
            twitterVerified: false,
            erc8004Verified: false
        });

        registeredAgents.push(msg.sender);

        emit AgentRegistered(msg.sender, name);
    }

    /// @notice Update agent's profile (name and bio)
    /// @param name New name for the agent
    /// @param bio New bio for the agent
    function updateProfile(string calldata name, string calldata bio) external {
        if (agents[msg.sender].agentAddress == address(0)) revert NotRegistered();
        if (bytes(name).length == 0) revert EmptyName();

        agents[msg.sender].name = name;
        agents[msg.sender].bio = bio;

        emit ProfileUpdated(msg.sender, name, bio);
    }

    /// @notice Increment jobs completed for an agent (called by escrow contract)
    /// @param agent The agent whose job count to increment
    function incrementJobsCompleted(address agent) external {
        if (msg.sender != escrowContract) revert OnlyEscrow();
        if (agents[agent].agentAddress == address(0)) revert NotRegistered();

        agents[agent].jobsCompleted++;
    }

    /// @notice Admin marks an agent as Twitter verified
    /// @param agent The agent to verify
    function verifyTwitter(address agent) external onlyOwner {
        if (agents[agent].agentAddress == address(0)) revert NotRegistered();

        agents[agent].twitterVerified = true;

        emit TwitterVerified(agent);
    }

    /// @notice Admin marks an agent as ERC8004 verified
    /// @param agent The agent to verify
    function verifyERC8004(address agent) external onlyOwner {
        if (agents[agent].agentAddress == address(0)) revert NotRegistered();

        agents[agent].erc8004Verified = true;

        emit ERC8004Verified(agent);
    }

    /// @notice Update an agent's trust tier based on jobs and verification status
    /// @param agent The agent whose tier to update
    /// @dev Tier logic:
    ///      - Free: Default
    ///      - Rising: 3+ completed jobs
    ///      - Verified: (Twitter OR ERC8004 verified) AND 3+ jobs
    ///      - Premium: Both verified AND 10+ jobs
    function updateTier(address agent) external {
        if (agents[agent].agentAddress == address(0)) revert NotRegistered();

        Agent storage a = agents[agent];
        TrustTier newTier = TrustTier.Free;

        bool hasVerification = a.twitterVerified || a.erc8004Verified;
        bool hasBothVerifications = a.twitterVerified && a.erc8004Verified;

        if (hasBothVerifications && a.jobsCompleted >= 10) {
            newTier = TrustTier.Premium;
        } else if (hasVerification && a.jobsCompleted >= 3) {
            newTier = TrustTier.Verified;
        } else if (a.jobsCompleted >= 3) {
            newTier = TrustTier.Rising;
        }

        if (a.trustTier != newTier) {
            a.trustTier = newTier;
            emit TierUpdated(agent, newTier);
        }
    }

    /// @notice Get agent details
    /// @param agent The agent address to query
    /// @return The agent struct
    function getAgent(address agent) external view returns (Agent memory) {
        return agents[agent];
    }

    /// @notice Get all agents with a specific trust tier
    /// @param tier The trust tier to filter by
    /// @return Array of agents matching the tier
    function getAgentsByTier(TrustTier tier) external view returns (Agent[] memory) {
        uint256 count = 0;

        // First pass: count matching agents
        for (uint256 i = 0; i < registeredAgents.length; i++) {
            if (agents[registeredAgents[i]].trustTier == tier) {
                count++;
            }
        }

        // Second pass: populate result array
        Agent[] memory result = new Agent[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < registeredAgents.length; i++) {
            if (agents[registeredAgents[i]].trustTier == tier) {
                result[index] = agents[registeredAgents[i]];
                index++;
            }
        }

        return result;
    }

    /// @notice Set the escrow contract address
    /// @param _escrowContract The escrow contract address
    function setEscrowContract(address _escrowContract) external onlyOwner {
        escrowContract = _escrowContract;
    }
}
