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
    event Resolved(uint256 indexed jobId, bool toAgent, uint256 amount);
    event Tipped(uint256 indexed jobId, address indexed client, address indexed agent, uint256 amount);

    function setUp() public {
        usdc = new MockUSDC();
        escrow = new ViberrEscrow(address(usdc), platformWallet);

        // Mint USDC to client
        usdc.mint(client, 10000 * 1e6);
    }

    // ============ Job Creation Tests ============

    function test_createJob_success() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(agent, JOB_AMOUNT, SPEC_HASH);

        assertEq(jobId, 0);
        assertEq(escrow.nextJobId(), 1);

        (address jobClient, address jobAgent, uint256 amount, ViberrEscrow.JobStatus status, bytes32 specHash) = escrow.jobs(jobId);
        assertEq(jobClient, client);
        assertEq(jobAgent, agent);
        assertEq(amount, JOB_AMOUNT);
        assertEq(uint256(status), uint256(ViberrEscrow.JobStatus.Created));
        assertEq(specHash, SPEC_HASH);
    }

    function test_createJob_emitsEvent() public {
        vm.prank(client);
        vm.expectEmit(true, true, true, true);
        emit JobCreated(0, client, agent, JOB_AMOUNT, SPEC_HASH);
        escrow.createJob(agent, JOB_AMOUNT, SPEC_HASH);
    }

    function test_createJob_incrementsJobId() public {
        vm.startPrank(client);
        uint256 jobId1 = escrow.createJob(agent, JOB_AMOUNT, SPEC_HASH);
        uint256 jobId2 = escrow.createJob(agent, JOB_AMOUNT, SPEC_HASH);
        vm.stopPrank();

        assertEq(jobId1, 0);
        assertEq(jobId2, 1);
        assertEq(escrow.nextJobId(), 2);
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

    function test_createJob_allowsSelfHire() public {
        // Contract allows self-hire (client == agent) - this is intentional
        vm.prank(client);
        uint256 jobId = escrow.createJob(client, JOB_AMOUNT, SPEC_HASH);

        (address jobClient, address jobAgent, , , ) = escrow.jobs(jobId);
        assertEq(jobClient, client);
        assertEq(jobAgent, client);
    }

    // ============ Fund Job Tests ============

    function test_fundJob_success() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(agent, JOB_AMOUNT, SPEC_HASH);

        vm.startPrank(client);
        usdc.approve(address(escrow), JOB_AMOUNT);
        escrow.fundJob(jobId);
        vm.stopPrank();

        (, , , ViberrEscrow.JobStatus status, ) = escrow.jobs(jobId);
        assertEq(uint256(status), uint256(ViberrEscrow.JobStatus.Funded));
        assertEq(usdc.balanceOf(address(escrow)), JOB_AMOUNT);
    }

    function test_fundJob_emitsEvent() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(agent, JOB_AMOUNT, SPEC_HASH);

        vm.startPrank(client);
        usdc.approve(address(escrow), JOB_AMOUNT);
        vm.expectEmit(true, true, false, true);
        emit JobFunded(jobId, client, JOB_AMOUNT);
        escrow.fundJob(jobId);
        vm.stopPrank();
    }

    function test_fundJob_revertsOnInvalidJobId() public {
        vm.prank(client);
        vm.expectRevert(ViberrEscrow.InvalidJobId.selector);
        escrow.fundJob(999);
    }

    function test_fundJob_revertsOnWrongStatus() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(agent, JOB_AMOUNT, SPEC_HASH);

        // Fund the job first
        vm.startPrank(client);
        usdc.approve(address(escrow), JOB_AMOUNT);
        escrow.fundJob(jobId);

        // Try to fund again
        usdc.approve(address(escrow), JOB_AMOUNT);
        vm.expectRevert(ViberrEscrow.InvalidStatus.selector);
        escrow.fundJob(jobId);
        vm.stopPrank();
    }

    function test_fundJob_revertsOnNonClient() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(agent, JOB_AMOUNT, SPEC_HASH);

        vm.prank(randomUser);
        vm.expectRevert(ViberrEscrow.OnlyClient.selector);
        escrow.fundJob(jobId);
    }

    // ============ Release Payment Tests ============

    function test_releasePayment_success() public {
        uint256 jobId = _createAndFundJob();

        uint256 agentBalanceBefore = usdc.balanceOf(agent);
        uint256 platformBalanceBefore = usdc.balanceOf(platformWallet);

        vm.prank(client);
        escrow.releasePayment(jobId);

        (, , , ViberrEscrow.JobStatus status, ) = escrow.jobs(jobId);
        assertEq(uint256(status), uint256(ViberrEscrow.JobStatus.Completed));

        // Verify 85/15 split
        uint256 expectedPlatformFee = (JOB_AMOUNT * 1500) / 10000; // 15%
        uint256 expectedAgentPayment = JOB_AMOUNT - expectedPlatformFee; // 85%

        assertEq(usdc.balanceOf(agent) - agentBalanceBefore, expectedAgentPayment);
        assertEq(usdc.balanceOf(platformWallet) - platformBalanceBefore, expectedPlatformFee);
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }

    function test_releasePayment_verifies85_15Split() public {
        // Test with different amounts to ensure split is correct
        uint256 testAmount = 10000 * 1e6; // 10,000 USDC
        usdc.mint(client, testAmount);

        vm.prank(client);
        uint256 jobId = escrow.createJob(agent, testAmount, SPEC_HASH);

        vm.startPrank(client);
        usdc.approve(address(escrow), testAmount);
        escrow.fundJob(jobId);
        vm.stopPrank();

        uint256 agentBalanceBefore = usdc.balanceOf(agent);
        uint256 platformBalanceBefore = usdc.balanceOf(platformWallet);

        vm.prank(client);
        escrow.releasePayment(jobId);

        // 15% of 10,000 = 1,500
        assertEq(usdc.balanceOf(platformWallet) - platformBalanceBefore, 1500 * 1e6);
        // 85% of 10,000 = 8,500
        assertEq(usdc.balanceOf(agent) - agentBalanceBefore, 8500 * 1e6);
    }

    function test_releasePayment_emitsEvent() public {
        uint256 jobId = _createAndFundJob();

        uint256 expectedPlatformFee = (JOB_AMOUNT * 1500) / 10000;
        uint256 expectedAgentPayment = JOB_AMOUNT - expectedPlatformFee;

        vm.prank(client);
        vm.expectEmit(true, true, false, true);
        emit PaymentReleased(jobId, agent, expectedAgentPayment, expectedPlatformFee);
        escrow.releasePayment(jobId);
    }

    function test_releasePayment_revertsOnInvalidJobId() public {
        vm.prank(client);
        vm.expectRevert(ViberrEscrow.InvalidJobId.selector);
        escrow.releasePayment(999);
    }

    function test_releasePayment_revertsOnWrongStatus() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(agent, JOB_AMOUNT, SPEC_HASH);

        // Try to release payment before funding
        vm.prank(client);
        vm.expectRevert(ViberrEscrow.InvalidStatus.selector);
        escrow.releasePayment(jobId);
    }

    function test_releasePayment_revertsOnNonClient() public {
        uint256 jobId = _createAndFundJob();

        vm.prank(randomUser);
        vm.expectRevert(ViberrEscrow.OnlyClient.selector);
        escrow.releasePayment(jobId);
    }

    // ============ Dispute Tests ============

    function test_dispute_success() public {
        uint256 jobId = _createAndFundJob();

        vm.prank(client);
        escrow.dispute(jobId);

        (, , , ViberrEscrow.JobStatus status, ) = escrow.jobs(jobId);
        assertEq(uint256(status), uint256(ViberrEscrow.JobStatus.Disputed));
    }

    function test_dispute_emitsEvent() public {
        uint256 jobId = _createAndFundJob();

        vm.prank(client);
        vm.expectEmit(true, true, false, false);
        emit Disputed(jobId, client);
        escrow.dispute(jobId);
    }

    function test_dispute_revertsOnInvalidJobId() public {
        vm.prank(client);
        vm.expectRevert(ViberrEscrow.InvalidJobId.selector);
        escrow.dispute(999);
    }

    function test_dispute_revertsOnWrongStatus() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(agent, JOB_AMOUNT, SPEC_HASH);

        // Try to dispute before funding
        vm.prank(client);
        vm.expectRevert(ViberrEscrow.InvalidStatus.selector);
        escrow.dispute(jobId);
    }

    function test_dispute_revertsOnNonClient() public {
        uint256 jobId = _createAndFundJob();

        vm.prank(randomUser);
        vm.expectRevert(ViberrEscrow.OnlyClient.selector);
        escrow.dispute(jobId);
    }

    // ============ Resolve Dispute Tests ============

    function test_resolveDispute_toAgent() public {
        uint256 jobId = _createAndFundJob();

        vm.prank(client);
        escrow.dispute(jobId);

        uint256 agentBalanceBefore = usdc.balanceOf(agent);
        uint256 platformBalanceBefore = usdc.balanceOf(platformWallet);

        escrow.resolveDispute(jobId, true);

        (, , , ViberrEscrow.JobStatus status, ) = escrow.jobs(jobId);
        assertEq(uint256(status), uint256(ViberrEscrow.JobStatus.Resolved));

        // Verify 85/15 split when resolved to agent
        uint256 expectedPlatformFee = (JOB_AMOUNT * 1500) / 10000;
        uint256 expectedAgentPayment = JOB_AMOUNT - expectedPlatformFee;

        assertEq(usdc.balanceOf(agent) - agentBalanceBefore, expectedAgentPayment);
        assertEq(usdc.balanceOf(platformWallet) - platformBalanceBefore, expectedPlatformFee);
    }

    function test_resolveDispute_toClient() public {
        uint256 jobId = _createAndFundJob();

        vm.prank(client);
        escrow.dispute(jobId);

        uint256 clientBalanceBefore = usdc.balanceOf(client);

        escrow.resolveDispute(jobId, false);

        (, , , ViberrEscrow.JobStatus status, ) = escrow.jobs(jobId);
        assertEq(uint256(status), uint256(ViberrEscrow.JobStatus.Resolved));

        // Full refund to client
        assertEq(usdc.balanceOf(client) - clientBalanceBefore, JOB_AMOUNT);
    }

    function test_resolveDispute_emitsEventToAgent() public {
        uint256 jobId = _createAndFundJob();

        vm.prank(client);
        escrow.dispute(jobId);

        uint256 expectedAgentPayment = JOB_AMOUNT - (JOB_AMOUNT * 1500) / 10000;

        vm.expectEmit(true, false, false, true);
        emit Resolved(jobId, true, expectedAgentPayment);
        escrow.resolveDispute(jobId, true);
    }

    function test_resolveDispute_emitsEventToClient() public {
        uint256 jobId = _createAndFundJob();

        vm.prank(client);
        escrow.dispute(jobId);

        vm.expectEmit(true, false, false, true);
        emit Resolved(jobId, false, JOB_AMOUNT);
        escrow.resolveDispute(jobId, false);
    }

    function test_resolveDispute_revertsOnNonOwner() public {
        uint256 jobId = _createAndFundJob();

        vm.prank(client);
        escrow.dispute(jobId);

        vm.prank(randomUser);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", randomUser));
        escrow.resolveDispute(jobId, true);
    }

    function test_resolveDispute_revertsOnInvalidJobId() public {
        vm.expectRevert(ViberrEscrow.InvalidJobId.selector);
        escrow.resolveDispute(999, true);
    }

    function test_resolveDispute_revertsOnWrongStatus() public {
        uint256 jobId = _createAndFundJob();

        // Try to resolve without disputing first
        vm.expectRevert(ViberrEscrow.InvalidStatus.selector);
        escrow.resolveDispute(jobId, true);
    }

    // ============ Tip Tests ============

    function test_tip_afterCompletion() public {
        uint256 jobId = _createAndFundJob();

        vm.prank(client);
        escrow.releasePayment(jobId);

        uint256 tipAmount = 100 * 1e6;
        uint256 agentBalanceBefore = usdc.balanceOf(agent);

        vm.startPrank(client);
        usdc.approve(address(escrow), tipAmount);
        escrow.tip(jobId, tipAmount);
        vm.stopPrank();

        assertEq(usdc.balanceOf(agent) - agentBalanceBefore, tipAmount);
    }

    function test_tip_afterResolution() public {
        uint256 jobId = _createAndFundJob();

        vm.prank(client);
        escrow.dispute(jobId);

        escrow.resolveDispute(jobId, true);

        uint256 tipAmount = 100 * 1e6;
        uint256 agentBalanceBefore = usdc.balanceOf(agent);

        vm.startPrank(client);
        usdc.approve(address(escrow), tipAmount);
        escrow.tip(jobId, tipAmount);
        vm.stopPrank();

        assertEq(usdc.balanceOf(agent) - agentBalanceBefore, tipAmount);
    }

    function test_tip_emitsEvent() public {
        uint256 jobId = _createAndFundJob();

        vm.prank(client);
        escrow.releasePayment(jobId);

        uint256 tipAmount = 100 * 1e6;

        vm.startPrank(client);
        usdc.approve(address(escrow), tipAmount);
        vm.expectEmit(true, true, true, true);
        emit Tipped(jobId, client, agent, tipAmount);
        escrow.tip(jobId, tipAmount);
        vm.stopPrank();
    }

    function test_tip_allowsAnyoneToTip() public {
        uint256 jobId = _createAndFundJob();

        vm.prank(client);
        escrow.releasePayment(jobId);

        uint256 tipAmount = 50 * 1e6;
        usdc.mint(randomUser, tipAmount);

        uint256 agentBalanceBefore = usdc.balanceOf(agent);

        vm.startPrank(randomUser);
        usdc.approve(address(escrow), tipAmount);
        escrow.tip(jobId, tipAmount);
        vm.stopPrank();

        assertEq(usdc.balanceOf(agent) - agentBalanceBefore, tipAmount);
    }

    function test_tip_revertsOnInvalidJobId() public {
        vm.prank(client);
        vm.expectRevert(ViberrEscrow.InvalidJobId.selector);
        escrow.tip(999, 100 * 1e6);
    }

    function test_tip_revertsOnZeroAmount() public {
        uint256 jobId = _createAndFundJob();

        vm.prank(client);
        escrow.releasePayment(jobId);

        vm.prank(client);
        vm.expectRevert(ViberrEscrow.InvalidAmount.selector);
        escrow.tip(jobId, 0);
    }

    function test_tip_revertsOnWrongStatus() public {
        uint256 jobId = _createAndFundJob();

        // Try to tip while job is still funded (not completed)
        vm.startPrank(client);
        usdc.approve(address(escrow), 100 * 1e6);
        vm.expectRevert(ViberrEscrow.InvalidStatus.selector);
        escrow.tip(jobId, 100 * 1e6);
        vm.stopPrank();
    }

    // ============ Admin Tests ============

    function test_setPlatformWallet() public {
        address newWallet = address(0x999);
        escrow.setPlatformWallet(newWallet);
        assertEq(escrow.platformWallet(), newWallet);
    }

    function test_setPlatformWallet_revertsOnNonOwner() public {
        vm.prank(randomUser);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", randomUser));
        escrow.setPlatformWallet(address(0x999));
    }

    // ============ View Function Tests ============

    function test_constants() public view {
        assertEq(escrow.PLATFORM_FEE_BPS(), 1500);
        assertEq(escrow.BPS_DENOMINATOR(), 10000);
    }

    function test_usdc() public view {
        assertEq(address(escrow.usdc()), address(usdc));
    }

    // ============ Helper Functions ============

    function _createAndFundJob() internal returns (uint256 jobId) {
        vm.prank(client);
        jobId = escrow.createJob(agent, JOB_AMOUNT, SPEC_HASH);

        vm.startPrank(client);
        usdc.approve(address(escrow), JOB_AMOUNT);
        escrow.fundJob(jobId);
        vm.stopPrank();
    }
}
