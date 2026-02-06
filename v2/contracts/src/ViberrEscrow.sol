// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title ViberrEscrow
/// @notice Escrow contract for Viberr marketplace where humans hire AI agents
contract ViberrEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Base Sepolia USDC address
    IERC20 public immutable usdc;

    // Platform fee: 15% (1500 basis points)
    uint256 public constant PLATFORM_FEE_BPS = 1500;
    uint256 public constant BPS_DENOMINATOR = 10000;

    // Platform wallet for fee collection
    address public platformWallet;

    enum JobStatus {
        Created,
        Funded,
        Completed,
        Disputed,
        Resolved
    }

    struct Job {
        address client;
        address agent;
        uint256 amount;
        JobStatus status;
        bytes32 specHash;
    }

    // Job storage
    mapping(uint256 => Job) public jobs;
    uint256 public nextJobId;

    // Events
    event JobCreated(uint256 indexed jobId, address indexed client, address indexed agent, uint256 amount, bytes32 specHash);
    event JobFunded(uint256 indexed jobId, address indexed client, uint256 amount);
    event PaymentReleased(uint256 indexed jobId, address indexed agent, uint256 agentAmount, uint256 platformAmount);
    event Disputed(uint256 indexed jobId, address indexed client);
    event Resolved(uint256 indexed jobId, bool toAgent, uint256 amount);
    event Tipped(uint256 indexed jobId, address indexed client, address indexed agent, uint256 amount);

    error InvalidAgent();
    error InvalidAmount();
    error InvalidJobId();
    error InvalidStatus();
    error OnlyClient();
    error OnlyAdmin();
    error TransferFailed();

    constructor(address _usdc, address _platformWallet) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        platformWallet = _platformWallet;
    }

    /// @notice Creates a new job
    /// @param agent The AI agent address that will perform the work
    /// @param amount The payment amount in USDC
    /// @param specHash Hash of the job specification
    /// @return jobId The ID of the created job
    function createJob(
        address agent,
        uint256 amount,
        bytes32 specHash
    ) external returns (uint256 jobId) {
        if (agent == address(0)) revert InvalidAgent();
        if (amount == 0) revert InvalidAmount();

        jobId = nextJobId++;

        jobs[jobId] = Job({
            client: msg.sender,
            agent: agent,
            amount: amount,
            status: JobStatus.Created,
            specHash: specHash
        });

        emit JobCreated(jobId, msg.sender, agent, amount, specHash);
    }

    /// @notice Client deposits USDC to fund the job
    /// @param jobId The job to fund
    function fundJob(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];

        if (job.client == address(0)) revert InvalidJobId();
        if (job.status != JobStatus.Created) revert InvalidStatus();
        if (msg.sender != job.client) revert OnlyClient();

        job.status = JobStatus.Funded;

        usdc.safeTransferFrom(msg.sender, address(this), job.amount);

        emit JobFunded(jobId, msg.sender, job.amount);
    }

    /// @notice Releases payment after job completion - 85% to agent, 15% to platform
    /// @param jobId The job to release payment for
    function releasePayment(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];

        if (job.client == address(0)) revert InvalidJobId();
        if (job.status != JobStatus.Funded) revert InvalidStatus();
        if (msg.sender != job.client) revert OnlyClient();

        job.status = JobStatus.Completed;

        uint256 platformFee = (job.amount * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 agentPayment = job.amount - platformFee;

        usdc.safeTransfer(job.agent, agentPayment);
        usdc.safeTransfer(platformWallet, platformFee);

        emit PaymentReleased(jobId, job.agent, agentPayment, platformFee);
    }

    /// @notice Client flags a dispute with the job
    /// @param jobId The job to dispute
    function dispute(uint256 jobId) external {
        Job storage job = jobs[jobId];

        if (job.client == address(0)) revert InvalidJobId();
        if (job.status != JobStatus.Funded) revert InvalidStatus();
        if (msg.sender != job.client) revert OnlyClient();

        job.status = JobStatus.Disputed;

        emit Disputed(jobId, msg.sender);
    }

    /// @notice Admin resolves a disputed job
    /// @param jobId The disputed job
    /// @param toAgent If true, funds go to agent (with platform fee); if false, refund to client
    function resolveDispute(uint256 jobId, bool toAgent) external onlyOwner nonReentrant {
        Job storage job = jobs[jobId];

        if (job.client == address(0)) revert InvalidJobId();
        if (job.status != JobStatus.Disputed) revert InvalidStatus();

        job.status = JobStatus.Resolved;

        if (toAgent) {
            uint256 platformFee = (job.amount * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
            uint256 agentPayment = job.amount - platformFee;

            usdc.safeTransfer(job.agent, agentPayment);
            usdc.safeTransfer(platformWallet, platformFee);

            emit Resolved(jobId, true, agentPayment);
        } else {
            usdc.safeTransfer(job.client, job.amount);

            emit Resolved(jobId, false, job.amount);
        }
    }

    /// @notice Client tips the agent extra
    /// @param jobId The job to tip for
    /// @param amount The tip amount in USDC
    function tip(uint256 jobId, uint256 amount) external nonReentrant {
        Job storage job = jobs[jobId];

        if (job.client == address(0)) revert InvalidJobId();
        if (job.status != JobStatus.Completed && job.status != JobStatus.Resolved) revert InvalidStatus();
        if (amount == 0) revert InvalidAmount();

        usdc.safeTransferFrom(msg.sender, job.agent, amount);

        emit Tipped(jobId, msg.sender, job.agent, amount);
    }

    /// @notice Update the platform wallet address
    /// @param _platformWallet New platform wallet address
    function setPlatformWallet(address _platformWallet) external onlyOwner {
        platformWallet = _platformWallet;
    }
}
