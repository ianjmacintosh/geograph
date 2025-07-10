import { describe, it, expect } from "vitest";
import {
  calculatePlacementPoints,
  calculateFinalPlacements,
} from "../utils/game";

describe("🎮 Visual Tie Handling Demonstration", () => {
  it("should demonstrate complete tie handling workflow", () => {
    console.log("\n" + "=".repeat(60));
    console.log("🎮 GEOGRAPH TIE HANDLING DEMONSTRATION");
    console.log("=".repeat(60));

    // === ROUND-LEVEL TIE SCENARIO ===
    console.log("\n📍 ROUND 1: Players guess Paris location");
    console.log("Target: Paris, France (48.8566°N, 2.3522°E)");

    const roundGuesses = [
      { playerId: "alice", distance: 100 }, // Alice: 100km away
      { playerId: "bob", distance: 100 }, // Bob: SAME distance as Alice (TIE!)
      { playerId: "charlie", distance: 300 }, // Charlie: 300km away
    ];

    console.log("\n🎯 Player guesses:");
    roundGuesses.forEach((guess) => {
      console.log(`   ${guess.playerId}: ${guess.distance}km from Paris`);
    });

    const roundResults = calculatePlacementPoints(roundGuesses, 3);

    console.log("\n🏆 Round 1 Results (with tie handling):");
    roundResults.forEach((result) => {
      const tieIndicator =
        result.placement === 1 &&
        roundResults.filter((r) => r.placement === 1).length > 1
          ? " 🤝 TIED!"
          : "";
      console.log(
        `   #${result.placement} ${result.playerId}: ${result.placementPoints} points${tieIndicator}`,
      );
    });

    // Verify round tie handling
    expect(roundResults[0].placement).toBe(1); // Alice: 1st place
    expect(roundResults[1].placement).toBe(1); // Bob: ALSO 1st place (tied)
    expect(roundResults[2].placement).toBe(3); // Charlie: 3rd place (2nd skipped)

    console.log("\n✅ Round tie handling: WORKING CORRECTLY");
    console.log("   - Alice and Bob both get 1st place (tied at 100km)");
    console.log(
      "   - Charlie gets 3rd place (2nd place is skipped due to tie)",
    );

    // === GAME-LEVEL TIE SCENARIO ===
    console.log("\n" + "-".repeat(40));
    console.log("🎯 FINAL GAME RESULTS");
    console.log("-".repeat(40));

    // Simulate final scores after multiple rounds
    const playerScores = [
      {
        playerId: "alice",
        playerName: "Alice",
        isComputer: false,
        totalScore: 25,
        finalPlacement: 0,
      },
      {
        playerId: "bob",
        playerName: "Bob",
        isComputer: false,
        totalScore: 25,
        finalPlacement: 0,
      }, // TIED with Alice!
      {
        playerId: "charlie",
        playerName: "Charlie",
        isComputer: true,
        totalScore: 18,
        finalPlacement: 0,
      },
      {
        playerId: "diana",
        playerName: "Diana",
        isComputer: false,
        totalScore: 15,
        finalPlacement: 0,
      },
    ];

    console.log("\n📊 Final scores before placement calculation:");
    playerScores.forEach((player) => {
      console.log(`   ${player.playerName}: ${player.totalScore} points`);
    });

    const finalResults = calculateFinalPlacements(playerScores);

    console.log("\n🏆 FINAL STANDINGS (with tie handling):");
    const winners: string[] = [];
    finalResults.forEach((player, index) => {
      const tieIndicator =
        player.finalPlacement === 1 &&
        finalResults.filter((p) => p.finalPlacement === 1).length > 1
          ? " 👑 CO-WINNER!"
          : "";
      if (player.finalPlacement === 1) winners.push(player.playerName);

      const medal =
        player.finalPlacement === 1
          ? "🥇"
          : player.finalPlacement === 2
            ? "🥈"
            : player.finalPlacement === 3
              ? "🥉"
              : "  ";
      console.log(
        `   ${medal} #${player.finalPlacement} ${player.playerName}: ${player.totalScore} points${tieIndicator}`,
      );
    });

    // Verify final tie handling
    expect(finalResults[0].finalPlacement).toBe(1); // Alice: 1st place
    expect(finalResults[1].finalPlacement).toBe(1); // Bob: ALSO 1st place (tied)
    expect(finalResults[2].finalPlacement).toBe(3); // Charlie: 3rd place (2nd skipped)
    expect(finalResults[3].finalPlacement).toBe(4); // Diana: 4th place

    console.log("\n✅ Final tie handling: WORKING CORRECTLY");
    console.log(
      `   - ${winners.join(" and ")} are co-winners with 25 points each`,
    );
    console.log(
      "   - Charlie gets 3rd place (2nd place is skipped due to tie)",
    );
    console.log("   - Diana gets 4th place");

    // === COMPLEX TIE SCENARIO ===
    console.log("\n" + "-".repeat(40));
    console.log("🎲 COMPLEX TIE SCENARIO");
    console.log("-".repeat(40));

    const complexScores = [
      {
        playerId: "p1",
        playerName: "Player 1",
        isComputer: false,
        totalScore: 30,
        finalPlacement: 0,
      },
      {
        playerId: "p2",
        playerName: "Player 2",
        isComputer: false,
        totalScore: 25,
        finalPlacement: 0,
      },
      {
        playerId: "p3",
        playerName: "Player 3",
        isComputer: false,
        totalScore: 25,
        finalPlacement: 0,
      }, // Tied for 2nd
      {
        playerId: "p4",
        playerName: "Player 4",
        isComputer: false,
        totalScore: 25,
        finalPlacement: 0,
      }, // Tied for 2nd
      {
        playerId: "p5",
        playerName: "Player 5",
        isComputer: false,
        totalScore: 20,
        finalPlacement: 0,
      },
    ];

    const complexResults = calculateFinalPlacements(complexScores);

    console.log("\n📊 Complex scenario: 3-way tie for 2nd place");
    complexResults.forEach((player) => {
      const medal =
        player.finalPlacement === 1
          ? "🥇"
          : player.finalPlacement === 2
            ? "🥈"
            : player.finalPlacement === 3
              ? "🥉"
              : "  ";
      console.log(
        `   ${medal} #${player.finalPlacement} ${player.playerName}: ${player.totalScore} points`,
      );
    });

    expect(complexResults[0].finalPlacement).toBe(1); // Player 1: clear 1st
    expect(complexResults[1].finalPlacement).toBe(2); // Player 2: tied for 2nd
    expect(complexResults[2].finalPlacement).toBe(2); // Player 3: tied for 2nd
    expect(complexResults[3].finalPlacement).toBe(2); // Player 4: tied for 2nd
    expect(complexResults[4].finalPlacement).toBe(5); // Player 5: 5th (3rd and 4th skipped)

    console.log("\n✅ Complex tie handling: WORKING CORRECTLY");
    console.log("   - Player 1 gets 1st place");
    console.log("   - Players 2, 3, 4 all tied for 2nd place");
    console.log("   - Player 5 gets 5th place (3rd and 4th skipped)");

    console.log("\n" + "=".repeat(60));
    console.log("🎉 ALL TIE SCENARIOS WORKING PERFECTLY!");
    console.log("=".repeat(60));
    console.log(
      "✅ Round-level ties: Players with same distance get same placement",
    );
    console.log(
      "✅ Game-level ties: Players with same total score get same final placement",
    );
    console.log(
      "✅ Placement skipping: Subsequent players get correctly adjusted placements",
    );
    console.log("✅ Multiple winners: System tracks all tied winners");
    console.log("=".repeat(60) + "\n");
  });

  it("should demonstrate winner ID handling for ties", () => {
    console.log("\n🏆 WINNER IDENTIFICATION FOR TIES");
    console.log("-".repeat(40));

    const tiedScores = [
      {
        playerId: "alice",
        playerName: "Alice",
        isComputer: false,
        totalScore: 100,
        finalPlacement: 0,
      },
      {
        playerId: "bob",
        playerName: "Bob",
        isComputer: false,
        totalScore: 100,
        finalPlacement: 0,
      },
      {
        playerId: "charlie",
        playerName: "Charlie",
        isComputer: false,
        totalScore: 90,
        finalPlacement: 0,
      },
    ];

    const results = calculateFinalPlacements(tiedScores);

    // Find all winners (those with finalPlacement = 1)
    const winners = results.filter((p) => p.finalPlacement === 1);
    const winnerIds = winners.map((w) => w.playerId);
    const winnerNames = winners.map((w) => w.playerName);

    console.log("🎯 Game results:");
    results.forEach((player) => {
      const crown = player.finalPlacement === 1 ? "👑" : "  ";
      console.log(
        `   ${crown} #${player.finalPlacement} ${player.playerName} (${player.playerId}): ${player.totalScore} points`,
      );
    });

    console.log(`\n🏆 Winner handling:`);
    console.log(
      `   Primary winnerId: "${results[0].playerId}" (${results[0].playerName})`,
    );
    console.log(
      `   All winnerIds: [${winnerIds.map((id) => `"${id}"`).join(", ")}]`,
    );
    console.log(`   Winner names: ${winnerNames.join(" and ")}`);

    expect(winners).toHaveLength(2);
    expect(winnerIds).toContain("alice");
    expect(winnerIds).toContain("bob");
    expect(winnerNames).toEqual(["Alice", "Bob"]);

    console.log("\n✅ Winner identification: WORKING CORRECTLY");
    console.log("   - System properly identifies multiple winners in ties");
    console.log("   - Both winnerId (first) and winnerIds (all) are tracked\n");
  });
});
