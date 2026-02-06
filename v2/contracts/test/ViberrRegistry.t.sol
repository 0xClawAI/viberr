// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ViberrRegistry.sol";

contract ViberrRegistryTest is Test {
    ViberrRegistry public registry;

    address public owner = address(this);
    address public agent1 = address(0x1);
    address public agent2 = address(0x2);
    address public agent3 = address(0x3);
    address public escrowContract = address(0x100);
    address public randomUser = address(0x999);

    string public constant NAME = "TestAgent";
    string public constant BIO = "A helpful AI agent";

    event AgentRegistered(address indexed agent, string name);
    event ProfileUpdated(address indexed agent, string name, string bio);
    event TierUpdated(address indexed agent, ViberrRegistry.TrustTier newTier);
    event TwitterVerified(address indexed agent);
    event ERC8004Verified(address indexed agent);

    function setUp() public {
        registry = new ViberrRegistry();
        registry.setEscrowContract(escrowContract);
    }

    // ============ Agent Registration Tests ============

    function test_registerAgent_success() public {
        vm.prank(agent1);
        registry.registerAgent(NAME, BIO);

        ViberrRegistry.Agent memory agent = registry.getAgent(agent1);
        assertEq(agent.agentAddress, agent1);
        assertEq(agent.name, NAME);
        assertEq(agent.bio, BIO);
        assertEq(uint256(agent.trustTier), uint256(ViberrRegistry.TrustTier.Free));
        assertEq(agent.jobsCompleted, 0);
        assertFalse(agent.twitterVerified);
        assertFalse(agent.erc8004Verified);
    }

    function test_registerAgent_emitsEvent() public {
        vm.prank(agent1);
        vm.expectEmit(true, false, false, true);
        emit AgentRegistered(agent1, NAME);
        registry.registerAgent(NAME, BIO);
    }

    function test_registerAgent_revertsOnAlreadyRegistered() public {
        vm.startPrank(agent1);
        registry.registerAgent(NAME, BIO);

        vm.expectRevert(ViberrRegistry.AlreadyRegistered.selector);
        registry.registerAgent("New Name", "New Bio");
        vm.stopPrank();
    }

    function test_registerAgent_revertsOnEmptyName() public {
        vm.prank(agent1);
        vm.expectRevert(ViberrRegistry.EmptyName.selector);
        registry.registerAgent("", BIO);
    }

    function test_registerAgent_allowsEmptyBio() public {
        vm.prank(agent1);
        registry.registerAgent(NAME, "");

        ViberrRegistry.Agent memory agent = registry.getAgent(agent1);
        assertEq(agent.bio, "");
    }

    // ============ Profile Update Tests ============

    function test_updateProfile_success() public {
        vm.prank(agent1);
        registry.registerAgent(NAME, BIO);

        string memory newName = "UpdatedAgent";
        string memory newBio = "Updated bio";

        vm.prank(agent1);
        registry.updateProfile(newName, newBio);

        ViberrRegistry.Agent memory agent = registry.getAgent(agent1);
        assertEq(agent.name, newName);
        assertEq(agent.bio, newBio);
    }

    function test_updateProfile_emitsEvent() public {
        vm.prank(agent1);
        registry.registerAgent(NAME, BIO);

        string memory newName = "UpdatedAgent";
        string memory newBio = "Updated bio";

        vm.prank(agent1);
        vm.expectEmit(true, false, false, true);
        emit ProfileUpdated(agent1, newName, newBio);
        registry.updateProfile(newName, newBio);
    }

    function test_updateProfile_revertsOnNotRegistered() public {
        vm.prank(agent1);
        vm.expectRevert(ViberrRegistry.NotRegistered.selector);
        registry.updateProfile("Name", "Bio");
    }

    function test_updateProfile_revertsOnEmptyName() public {
        vm.prank(agent1);
        registry.registerAgent(NAME, BIO);

        vm.prank(agent1);
        vm.expectRevert(ViberrRegistry.EmptyName.selector);
        registry.updateProfile("", "New Bio");
    }

    // ============ Increment Jobs Completed Tests ============

    function test_incrementJobsCompleted_success() public {
        vm.prank(agent1);
        registry.registerAgent(NAME, BIO);

        vm.prank(escrowContract);
        registry.incrementJobsCompleted(agent1);

        ViberrRegistry.Agent memory agent = registry.getAgent(agent1);
        assertEq(agent.jobsCompleted, 1);
    }

    function test_incrementJobsCompleted_multipleIncrements() public {
        vm.prank(agent1);
        registry.registerAgent(NAME, BIO);

        vm.startPrank(escrowContract);
        registry.incrementJobsCompleted(agent1);
        registry.incrementJobsCompleted(agent1);
        registry.incrementJobsCompleted(agent1);
        vm.stopPrank();

        ViberrRegistry.Agent memory agent = registry.getAgent(agent1);
        assertEq(agent.jobsCompleted, 3);
    }

    function test_incrementJobsCompleted_revertsOnNonEscrow() public {
        vm.prank(agent1);
        registry.registerAgent(NAME, BIO);

        vm.prank(randomUser);
        vm.expectRevert(ViberrRegistry.OnlyEscrow.selector);
        registry.incrementJobsCompleted(agent1);
    }

    function test_incrementJobsCompleted_revertsOnNotRegistered() public {
        vm.prank(escrowContract);
        vm.expectRevert(ViberrRegistry.NotRegistered.selector);
        registry.incrementJobsCompleted(agent1);
    }

    // ============ Twitter Verification Tests ============

    function test_verifyTwitter_success() public {
        vm.prank(agent1);
        registry.registerAgent(NAME, BIO);

        registry.verifyTwitter(agent1);

        ViberrRegistry.Agent memory agent = registry.getAgent(agent1);
        assertTrue(agent.twitterVerified);
    }

    function test_verifyTwitter_emitsEvent() public {
        vm.prank(agent1);
        registry.registerAgent(NAME, BIO);

        vm.expectEmit(true, false, false, false);
        emit TwitterVerified(agent1);
        registry.verifyTwitter(agent1);
    }

    function test_verifyTwitter_revertsOnNonOwner() public {
        vm.prank(agent1);
        registry.registerAgent(NAME, BIO);

        vm.prank(randomUser);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", randomUser));
        registry.verifyTwitter(agent1);
    }

    function test_verifyTwitter_revertsOnNotRegistered() public {
        vm.expectRevert(ViberrRegistry.NotRegistered.selector);
        registry.verifyTwitter(agent1);
    }

    // ============ ERC8004 Verification Tests ============

    function test_verifyERC8004_success() public {
        vm.prank(agent1);
        registry.registerAgent(NAME, BIO);

        registry.verifyERC8004(agent1);

        ViberrRegistry.Agent memory agent = registry.getAgent(agent1);
        assertTrue(agent.erc8004Verified);
    }

    function test_verifyERC8004_emitsEvent() public {
        vm.prank(agent1);
        registry.registerAgent(NAME, BIO);

        vm.expectEmit(true, false, false, false);
        emit ERC8004Verified(agent1);
        registry.verifyERC8004(agent1);
    }

    function test_verifyERC8004_revertsOnNonOwner() public {
        vm.prank(agent1);
        registry.registerAgent(NAME, BIO);

        vm.prank(randomUser);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", randomUser));
        registry.verifyERC8004(agent1);
    }

    function test_verifyERC8004_revertsOnNotRegistered() public {
        vm.expectRevert(ViberrRegistry.NotRegistered.selector);
        registry.verifyERC8004(agent1);
    }

    // ============ Tier Progression Tests ============

    function test_updateTier_staysFreeWithNoJobs() public {
        vm.prank(agent1);
        registry.registerAgent(NAME, BIO);

        registry.updateTier(agent1);

        ViberrRegistry.Agent memory agent = registry.getAgent(agent1);
        assertEq(uint256(agent.trustTier), uint256(ViberrRegistry.TrustTier.Free));
    }

    function test_updateTier_staysFreeWith2Jobs() public {
        vm.prank(agent1);
        registry.registerAgent(NAME, BIO);

        _incrementJobs(agent1, 2);

        registry.updateTier(agent1);

        ViberrRegistry.Agent memory agent = registry.getAgent(agent1);
        assertEq(uint256(agent.trustTier), uint256(ViberrRegistry.TrustTier.Free));
    }

    function test_updateTier_toRisingWith3Jobs() public {
        vm.prank(agent1);
        registry.registerAgent(NAME, BIO);

        _incrementJobs(agent1, 3);

        vm.expectEmit(true, false, false, true);
        emit TierUpdated(agent1, ViberrRegistry.TrustTier.Rising);
        registry.updateTier(agent1);

        ViberrRegistry.Agent memory agent = registry.getAgent(agent1);
        assertEq(uint256(agent.trustTier), uint256(ViberrRegistry.TrustTier.Rising));
    }

    function test_updateTier_toVerifiedWithTwitterAnd3Jobs() public {
        vm.prank(agent1);
        registry.registerAgent(NAME, BIO);

        _incrementJobs(agent1, 3);
        registry.verifyTwitter(agent1);

        vm.expectEmit(true, false, false, true);
        emit TierUpdated(agent1, ViberrRegistry.TrustTier.Verified);
        registry.updateTier(agent1);

        ViberrRegistry.Agent memory agent = registry.getAgent(agent1);
        assertEq(uint256(agent.trustTier), uint256(ViberrRegistry.TrustTier.Verified));
    }

    function test_updateTier_toVerifiedWithERC8004And3Jobs() public {
        vm.prank(agent1);
        registry.registerAgent(NAME, BIO);

        _incrementJobs(agent1, 3);
        registry.verifyERC8004(agent1);

        registry.updateTier(agent1);

        ViberrRegistry.Agent memory agent = registry.getAgent(agent1);
        assertEq(uint256(agent.trustTier), uint256(ViberrRegistry.TrustTier.Verified));
    }

    function test_updateTier_staysVerifiedWithBothVerificationsAnd9Jobs() public {
        vm.prank(agent1);
        registry.registerAgent(NAME, BIO);

        _incrementJobs(agent1, 9);
        registry.verifyTwitter(agent1);
        registry.verifyERC8004(agent1);

        registry.updateTier(agent1);

        ViberrRegistry.Agent memory agent = registry.getAgent(agent1);
        assertEq(uint256(agent.trustTier), uint256(ViberrRegistry.TrustTier.Verified));
    }

    function test_updateTier_toPremiumWithBothVerificationsAnd10Jobs() public {
        vm.prank(agent1);
        registry.registerAgent(NAME, BIO);

        _incrementJobs(agent1, 10);
        registry.verifyTwitter(agent1);
        registry.verifyERC8004(agent1);

        vm.expectEmit(true, false, false, true);
        emit TierUpdated(agent1, ViberrRegistry.TrustTier.Premium);
        registry.updateTier(agent1);

        ViberrRegistry.Agent memory agent = registry.getAgent(agent1);
        assertEq(uint256(agent.trustTier), uint256(ViberrRegistry.TrustTier.Premium));
    }

    function test_updateTier_noEventWhenTierUnchanged() public {
        vm.prank(agent1);
        registry.registerAgent(NAME, BIO);

        // First update - tier stays Free, no event expected
        // recordLogs is needed to verify no event was emitted
        vm.recordLogs();
        registry.updateTier(agent1);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        // Filter for TierUpdated events
        uint256 tierUpdateCount = 0;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == keccak256("TierUpdated(address,uint8)")) {
                tierUpdateCount++;
            }
        }
        assertEq(tierUpdateCount, 0);
    }

    function test_updateTier_revertsOnNotRegistered() public {
        vm.expectRevert(ViberrRegistry.NotRegistered.selector);
        registry.updateTier(agent1);
    }

    // ============ View Function Tests ============

    function test_getAgent_returnsEmptyForUnregistered() public view {
        ViberrRegistry.Agent memory agent = registry.getAgent(randomUser);
        assertEq(agent.agentAddress, address(0));
        assertEq(agent.name, "");
        assertEq(agent.bio, "");
        assertEq(agent.jobsCompleted, 0);
    }

    function test_getAgentsByTier_returnsCorrectAgents() public {
        // Register multiple agents
        vm.prank(agent1);
        registry.registerAgent("Agent1", "Bio1");

        vm.prank(agent2);
        registry.registerAgent("Agent2", "Bio2");

        vm.prank(agent3);
        registry.registerAgent("Agent3", "Bio3");

        // Promote agent2 to Rising
        _incrementJobs(agent2, 3);
        registry.updateTier(agent2);

        // Promote agent3 to Verified
        _incrementJobs(agent3, 3);
        registry.verifyTwitter(agent3);
        registry.updateTier(agent3);

        // Check Free tier
        ViberrRegistry.Agent[] memory freeAgents = registry.getAgentsByTier(ViberrRegistry.TrustTier.Free);
        assertEq(freeAgents.length, 1);
        assertEq(freeAgents[0].agentAddress, agent1);

        // Check Rising tier
        ViberrRegistry.Agent[] memory risingAgents = registry.getAgentsByTier(ViberrRegistry.TrustTier.Rising);
        assertEq(risingAgents.length, 1);
        assertEq(risingAgents[0].agentAddress, agent2);

        // Check Verified tier
        ViberrRegistry.Agent[] memory verifiedAgents = registry.getAgentsByTier(ViberrRegistry.TrustTier.Verified);
        assertEq(verifiedAgents.length, 1);
        assertEq(verifiedAgents[0].agentAddress, agent3);

        // Check Premium tier (empty)
        ViberrRegistry.Agent[] memory premiumAgents = registry.getAgentsByTier(ViberrRegistry.TrustTier.Premium);
        assertEq(premiumAgents.length, 0);
    }

    function test_getAgentsByTier_returnsEmptyForNoMatches() public view {
        ViberrRegistry.Agent[] memory agents = registry.getAgentsByTier(ViberrRegistry.TrustTier.Premium);
        assertEq(agents.length, 0);
    }

    // ============ Admin Tests ============

    function test_setEscrowContract() public {
        address newEscrow = address(0x200);
        registry.setEscrowContract(newEscrow);
        assertEq(registry.escrowContract(), newEscrow);
    }

    function test_setEscrowContract_revertsOnNonOwner() public {
        vm.prank(randomUser);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", randomUser));
        registry.setEscrowContract(address(0x200));
    }

    // ============ Full Tier Progression Flow Test ============

    function test_fullTierProgression() public {
        // 1. Register agent
        vm.prank(agent1);
        registry.registerAgent(NAME, BIO);

        ViberrRegistry.Agent memory agent = registry.getAgent(agent1);
        assertEq(uint256(agent.trustTier), uint256(ViberrRegistry.TrustTier.Free));

        // 2. Complete 3 jobs -> Rising
        _incrementJobs(agent1, 3);
        registry.updateTier(agent1);
        agent = registry.getAgent(agent1);
        assertEq(uint256(agent.trustTier), uint256(ViberrRegistry.TrustTier.Rising));

        // 3. Add Twitter verification -> Verified
        registry.verifyTwitter(agent1);
        registry.updateTier(agent1);
        agent = registry.getAgent(agent1);
        assertEq(uint256(agent.trustTier), uint256(ViberrRegistry.TrustTier.Verified));

        // 4. Complete 7 more jobs (total 10) and add ERC8004 -> Premium
        _incrementJobs(agent1, 7);
        registry.verifyERC8004(agent1);
        registry.updateTier(agent1);
        agent = registry.getAgent(agent1);
        assertEq(uint256(agent.trustTier), uint256(ViberrRegistry.TrustTier.Premium));
    }

    // ============ Helper Functions ============

    function _incrementJobs(address agent, uint256 count) internal {
        vm.startPrank(escrowContract);
        for (uint256 i = 0; i < count; i++) {
            registry.incrementJobsCompleted(agent);
        }
        vm.stopPrank();
    }
}
