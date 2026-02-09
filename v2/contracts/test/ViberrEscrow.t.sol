// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ViberrEscrow.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Mock USDC for testing
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

contract ViberrEscrowTest is Test {
    ViberrEscrow public escrow;
    MockUSDC public usdc;

    address public owner = address(this);
    address public platformWallet = address(0x1);
    address public client = address(0x2);
    address public agent = address(0x3);
    address public randomUser = address(0x4);

    uint256 public constant JOB_AMOUNT = 1000 * 1e6; // 1000 USDC
    bytes32 public constant SPEC_HASH = keccak256("job spec");

    event JobCreated(uint256 indexed jobId, address indexed client, address indexed agent, uint256 amount, bytes32 specHash);
    event JobFunded(uint256 indexed jobId, address indexed client, uint256 amount);
    event PaymentReleased(uint256 indexed jobId, address indexed agent, uint256 agentAmount, uint256 platformAmount);
    event Disputed(uint256 indexed jobId, address indexed client);
    event Tipped(uint256 indexed jobId, address indexed client, address indexed agent, uint256 amount);

    function setUp() public {
        usdc = new MockUSDC();
        escrow = new ViberrEscrow(address(usdc), platformWallet, address(this));
        usdc.mint(client, 10000 * 1e6);
    }

    // ============ Job Creation (now atomic: create + fund) ============

    function test_createJob_success() public {
        vm.startPrank(client);
        usdc.approve(address(escrow), JOB_AMOUNT);
        uint256 jobId = escrow.createJob(agent, JOB_AMOUNT, SPEC_HASH);
        vm.stopPrank();

        assertEq(jobId, 0);
        assertEq(escrow.nextJobId(), 1);

        (address jobClient, address jobAgent, uint256 amount, ViberrEscrow.JobStatus status, bytes32 specHash, , ) = escrow.jobs(jobId);
        assertEq(jobClient, client);
        assertEq(jobAgent, agent);
        assertEq(amount, JOB_AMOUNT);
        // Should be Funded immediately (atomic create+fund)
        assertEq(uint256(status), uint256(ViberrEscrow.JobStatus.Funded));
        assertEq(specHash, SPEC_HASH);
        assertEq(usdc.balanceOf(address(escrow)), JOB_AMOUNT);
    }

    function test_createJob_emitsEvents() public {
        vm.startPrank(client);
        usdc.approve(address(escrow), JOB_AMOUNT);
        vm.expectEmit(true, true, true, true);
        emit JobCreated(0, client, agent, JOB_AMOUNT, SPEC_HASH);
        vm.expectEmit(true, true, false, true);
        emit JobFunded(0, client, JOB_AMOUNT);
        escrow.createJob(agent, JOB_AMOUNT, SPEC_HASH);
        vm.stopPrank();
    }

    function test_createJob_incrementsJobId() public {
        vm.startPrank(client);
        usdc.approve(address(escrow), JOB_AMOUNT * 2);
        uint256 jobId1 = escrow.createJob(agent, JOB_AMOUNT, SPEC_HASH);
        uint256 jobId2 = escrow.createJob(agent, JOB_AMOUNT, SPEC_HASH);
        vm.stopPrank();

        assertEq(jobId1, 0);
        assertEq(jobId2, 1);
    }

    function test_createJob_revertsOnZeroAgent() public {
        vm.prank(client);
        vm.expectRevert(ViberrEscrow.InvalidAgent.selector);
        escrow.createJob(address(0), JOB_AMOUNT, SPEC_HASH);
    }

    function test_createJob_revertsOnZeroAmount() public {
        vm.prank(client);
        vm.expectRevert(ViberrEscrow.InvalidAmount.selector);
        escrow.createJob(agent, 0, SPEC_HASH);
    }

    function test_createJob_revertsOnInsufficientAllowance() public {
        vm.prank(client);
        // No approval — should revert
        vm.expectRevert();
        escrow.createJob(agent, JOB_AMOUNT, SPEC_HASH);
    }

    function test_createJob_revertsOnInsufficientBalance() public {
        vm.startPrank(randomUser); // randomUser has 0 USDC
        usdc.approve(address(escrow), JOB_AMOUNT);
        vm.expectRevert();
        escrow.createJob(agent, JOB_AMOUNT, SPEC_HASH);
        vm.stopPrank();
    }

    // ============ Release Payment Tests ============

    function test_releasePayment_success() public {
        uint256 jobId = _createFundedJob();

        uint256 agentBalanceBefore = usdc.balanceOf(agent);
        uint256 platformBalanceBefore = usdc.balanceOf(platformWallet);

        vm.prank(client);
        escrow.releasePayment(jobId);

        (, , , ViberrEscrow.JobStatus status, , , ) = escrow.jobs(jobId);
        assertEq(uint256(status), uint256(ViberrEscrow.JobStatus.Completed));

        uint256 expectedPlatformFee = (JOB_AMOUNT * 1500) / 10000;
        uint256 expectedAgentPayment = JOB_AMOUNT - expectedPlatformFee;

        assertEq(usdc.balanceOf(agent) - agentBalanceBefore, expectedAgentPayment);
        assertEq(usdc.balanceOf(platformWallet) - platformBalanceBefore, expectedPlatformFee);
    }

    function test_releasePayment_revertsOnNonClient() public {
        uint256 jobId = _createFundedJob();

        vm.prank(randomUser);
        vm.expectRevert(ViberrEscrow.OnlyClient.selector);
        escrow.releasePayment(jobId);
    }

    // ============ Dispute Tests ============

    function test_dispute_success() public {
        uint256 jobId = _createFundedJob();

        vm.prank(client);
        escrow.dispute(jobId);

        (, , , ViberrEscrow.JobStatus status, , , ) = escrow.jobs(jobId);
        assertEq(uint256(status), uint256(ViberrEscrow.JobStatus.Disputed));
    }

    function test_resolveDispute_release() public {
        uint256 jobId = _createFundedJob();
        vm.prank(client);
        escrow.dispute(jobId);

        uint256 agentBefore = usdc.balanceOf(agent);
        escrow.resolveDispute(jobId, ViberrEscrow.Resolution.Release, "good work");

        uint256 expectedAgent = JOB_AMOUNT - (JOB_AMOUNT * 1500) / 10000;
        assertEq(usdc.balanceOf(agent) - agentBefore, expectedAgent);
    }

    function test_resolveDispute_refund() public {
        uint256 jobId = _createFundedJob();
        vm.prank(client);
        escrow.dispute(jobId);

        uint256 clientBefore = usdc.balanceOf(client);
        escrow.resolveDispute(jobId, ViberrEscrow.Resolution.Refund, "bad work");

        assertEq(usdc.balanceOf(client) - clientBefore, JOB_AMOUNT);
    }

    function test_resolveDispute_revise() public {
        uint256 jobId = _createFundedJob();
        vm.prank(client);
        escrow.dispute(jobId);

        escrow.resolveDispute(jobId, ViberrEscrow.Resolution.Revise, "fix the buttons");

        (, , , ViberrEscrow.JobStatus status, , uint256 deadline, ) = escrow.jobs(jobId);
        assertEq(uint256(status), uint256(ViberrEscrow.JobStatus.InRevision));
        assertGt(deadline, block.timestamp);
    }

    // ============ Tip Tests ============

    function test_tip_afterCompletion() public {
        uint256 jobId = _createFundedJob();
        vm.prank(client);
        escrow.releasePayment(jobId);

        uint256 tipAmount = 100 * 1e6;
        uint256 agentBefore = usdc.balanceOf(agent);

        vm.startPrank(client);
        usdc.approve(address(escrow), tipAmount);
        escrow.tip(jobId, tipAmount);
        vm.stopPrank();

        assertEq(usdc.balanceOf(agent) - agentBefore, tipAmount);
    }

    function test_tip_revertsOnWrongStatus() public {
        uint256 jobId = _createFundedJob();

        vm.startPrank(client);
        usdc.approve(address(escrow), 100 * 1e6);
        vm.expectRevert(ViberrEscrow.InvalidStatus.selector);
        escrow.tip(jobId, 100 * 1e6);
        vm.stopPrank();
    }

    // ============ Constants ============

    function test_constants() public view {
        assertEq(escrow.PLATFORM_FEE_BPS(), 1500);
        assertEq(escrow.BPS_DENOMINATOR(), 10000);
    }

    // ============ Helper ============

    function _createFundedJob() internal returns (uint256 jobId) {
        vm.startPrank(client);
        usdc.approve(address(escrow), JOB_AMOUNT);
        jobId = escrow.createJob(agent, JOB_AMOUNT, SPEC_HASH);
        vm.stopPrank();
    }
}
