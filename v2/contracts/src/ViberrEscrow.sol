// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title ViberrEscrow
/// @notice Escrow contract for Viberr marketplace where humans hire AI agents
/// @dev Includes AI arbiter for dispute resolution with Release/Revise/Refund options
contract ViberrEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;

    // Platform fee: 15% (1500 basis points)
    uint256 public constant PLATFORM_FEE_BPS = 1500;
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    // Revision deadline: 7 days
    uint256 public constant REVISION_PERIOD = 7 days;

    address public platformWallet;
    address public arbiter; // AI Arbiter wallet

    enum JobStatus {
        Created,
        Funded,
        Completed,
        Disputed,
        InRevision,  // New: agent must fix issues
        Resolved,
        Refunded
    }

    enum Resolution {
        Release,  // Pay the agent
        Revise,   // Send back for revisions
        Refund    // Refund the client
    }

    struct Job {
        address client;
        address agent;
        uint256 amount;
        JobStatus status;
        bytes32 specHash;
        uint256 revisionDeadline;  // Timestamp when revision period ends
        string arbiterNotes;       // Arbiter's requirements for revision
    }

    mapping(uint256 => Job) public jobs;
    uint256 public nextJobId;

    // Events
    event JobCreated(uint256 indexed jobId, address indexed client, address indexed agent, uint256 amount, bytes32 specHash);
    event JobFunded(uint256 indexed jobId, address indexed client, uint256 amount);
    event PaymentReleased(uint256 indexed jobId, address indexed agent, uint256 agentAmount, uint256 platformAmount);
    event Disputed(uint256 indexed jobId, address indexed client);
    event DisputeResolved(uint256 indexed jobId, Resolution resolution, string notes);
    event RevisionRequired(uint256 indexed jobId, uint256 deadline, string requirements);
    event RevisionCompleted(uint256 indexed jobId);
    event Refunded(uint256 indexed jobId, address indexed client, uint256 amount);
    event Tipped(uint256 indexed jobId, address indexed tipper, address indexed agent, uint256 amount);
    event ArbiterUpdated(address indexed oldArbiter, address indexed newArbiter);

    error InvalidAgent();
    error InvalidAmount();
    error InvalidJobId();
    error InvalidStatus();
    error OnlyClient();
    error OnlyArbiter();
    error OnlyAgent();
    error DeadlineNotPassed();
    error TransferFailed();

    modifier onlyArbiter() {
        if (msg.sender != arbiter && msg.sender != owner()) revert OnlyArbiter();
        _;
    }

    constructor(address _usdc, address _platformWallet, address _arbiter) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        platformWallet = _platformWallet;
        arbiter = _arbiter;
    }

    /// @notice Creates and funds a new job in one transaction
    /// @dev Requires prior USDC approval. Pulls funds immediately.
    function createJob(
        address agent,
        uint256 amount,
        bytes32 specHash
    ) external nonReentrant returns (uint256 jobId) {
        if (agent == address(0)) revert InvalidAgent();
        if (amount == 0) revert InvalidAmount();

        jobId = nextJobId++;

        jobs[jobId] = Job({
            client: msg.sender,
            agent: agent,
            amount: amount,
            status: JobStatus.Funded,
            specHash: specHash,
            revisionDeadline: 0,
            arbiterNotes: ""
        });

        // Pull USDC in same tx — reverts if allowance insufficient
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        emit JobCreated(jobId, msg.sender, agent, amount, specHash);
        emit JobFunded(jobId, msg.sender, amount);
    }

    /// @notice Client releases payment after job completion (happy path)
    function releasePayment(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];

        if (job.client == address(0)) revert InvalidJobId();
        if (job.status != JobStatus.Funded && job.status != JobStatus.InRevision) revert InvalidStatus();
        if (msg.sender != job.client) revert OnlyClient();

        _releaseToAgent(jobId, job);
    }

    /// @notice Client flags a dispute
    function dispute(uint256 jobId) external {
        Job storage job = jobs[jobId];

        if (job.client == address(0)) revert InvalidJobId();
        if (job.status != JobStatus.Funded && job.status != JobStatus.InRevision) revert InvalidStatus();
        if (msg.sender != job.client) revert OnlyClient();

        job.status = JobStatus.Disputed;
        emit Disputed(jobId, msg.sender);
    }

    /// @notice AI Arbiter resolves a dispute
    /// @param jobId The disputed job
    /// @param resolution Release (pay agent), Revise (fix it), or Refund (return to client)
    /// @param notes Arbiter's reasoning or revision requirements
    function resolveDispute(
        uint256 jobId, 
        Resolution resolution, 
        string calldata notes
    ) external onlyArbiter nonReentrant {
        Job storage job = jobs[jobId];

        if (job.client == address(0)) revert InvalidJobId();
        if (job.status != JobStatus.Disputed) revert InvalidStatus();

        emit DisputeResolved(jobId, resolution, notes);

        if (resolution == Resolution.Release) {
            _releaseToAgent(jobId, job);
        } else if (resolution == Resolution.Revise) {
            job.status = JobStatus.InRevision;
            job.revisionDeadline = block.timestamp + REVISION_PERIOD;
            job.arbiterNotes = notes;
            emit RevisionRequired(jobId, job.revisionDeadline, notes);
        } else {
            _refundClient(jobId, job);
        }
    }

    /// @notice Agent marks revision as complete, returns to funded state for client review
    function completeRevision(uint256 jobId) external {
        Job storage job = jobs[jobId];

        if (job.client == address(0)) revert InvalidJobId();
        if (job.status != JobStatus.InRevision) revert InvalidStatus();
        if (msg.sender != job.agent) revert OnlyAgent();

        job.status = JobStatus.Funded;
        job.revisionDeadline = 0;
        
        emit RevisionCompleted(jobId);
    }

    /// @notice Anyone can trigger refund after revision deadline passes
    function claimRefundAfterTimeout(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];

        if (job.client == address(0)) revert InvalidJobId();
        if (job.status != JobStatus.InRevision) revert InvalidStatus();
        if (block.timestamp < job.revisionDeadline) revert DeadlineNotPassed();

        _refundClient(jobId, job);
    }

    /// @notice Tip the agent (after completion)
    function tip(uint256 jobId, uint256 amount) external nonReentrant {
        Job storage job = jobs[jobId];

        if (job.client == address(0)) revert InvalidJobId();
        if (job.status != JobStatus.Completed && job.status != JobStatus.Resolved) revert InvalidStatus();
        if (amount == 0) revert InvalidAmount();

        usdc.safeTransferFrom(msg.sender, job.agent, amount);
        emit Tipped(jobId, msg.sender, job.agent, amount);
    }

    /// @notice Update arbiter address
    function setArbiter(address _arbiter) external onlyOwner {
        emit ArbiterUpdated(arbiter, _arbiter);
        arbiter = _arbiter;
    }

    /// @notice Update platform wallet
    function setPlatformWallet(address _platformWallet) external onlyOwner {
        platformWallet = _platformWallet;
    }

    /// @notice Get job details including revision info
    function getJob(uint256 jobId) external view returns (
        address client,
        address agent,
        uint256 amount,
        JobStatus status,
        bytes32 specHash,
        uint256 revisionDeadline,
        string memory arbiterNotes
    ) {
        Job storage job = jobs[jobId];
        return (
            job.client,
            job.agent,
            job.amount,
            job.status,
            job.specHash,
            job.revisionDeadline,
            job.arbiterNotes
        );
    }

    // Internal functions
    function _releaseToAgent(uint256 jobId, Job storage job) internal {
        job.status = JobStatus.Completed;

        uint256 platformFee = (job.amount * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 agentPayment = job.amount - platformFee;

        usdc.safeTransfer(job.agent, agentPayment);
        usdc.safeTransfer(platformWallet, platformFee);

        emit PaymentReleased(jobId, job.agent, agentPayment, platformFee);
    }

    function _refundClient(uint256 jobId, Job storage job) internal {
        job.status = JobStatus.Refunded;
        usdc.safeTransfer(job.client, job.amount);
        emit Refunded(jobId, job.client, job.amount);
    }
}
