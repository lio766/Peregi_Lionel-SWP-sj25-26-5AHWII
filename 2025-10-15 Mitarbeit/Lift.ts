// Simple Lift System for Deno

enum Direction {
  UP = "UP",
  DOWN = "DOWN",
  IDLE = "IDLE"
}

enum DoorState {
  OPEN = "OPEN",
  CLOSED = "CLOSED"
}

interface Call {
  floor: number;
  direction: Direction;
}

class Lift {
  private currentFloor: number;
  private doorState: DoorState;
  private direction: Direction;
  private internalRequests: Set<number>;
  private externalCalls: Call[];
  private minFloor: number;
  private maxFloor: number;

  constructor(minFloor = 0, maxFloor = 10, startFloor = 0) {
    this.minFloor = minFloor;
    this.maxFloor = maxFloor;
    this.currentFloor = startFloor;
    this.doorState = DoorState.CLOSED;
    this.direction = Direction.IDLE;
    this.internalRequests = new Set<number>();
    this.externalCalls = [];
  }

  getCurrentFloor(): number {
    return this.currentFloor;
  }

  getDoorState(): DoorState {
    return this.doorState;
  }

  // Press button inside the lift
  pressButton(floor: number): void {
    if (floor < this.minFloor || floor > this.maxFloor) {
      console.log(`Floor ${floor} does not exist!`);
      return;
    }
    if (floor === this.currentFloor) {
      console.log(`Already at floor ${floor}`);
      return;
    }
    this.internalRequests.add(floor);
    console.log(`Button pressed for floor ${floor}`);
  }

  // Call lift from a floor with direction
  callLift(floor: number, direction: Direction): void {
    if (floor < this.minFloor || floor > this.maxFloor) {
      console.log(`Floor ${floor} does not exist!`);
      return;
    }
    if (direction === Direction.IDLE) {
      console.log(`Cannot call with IDLE direction`);
      return;
    }
    
    const exists = this.externalCalls.find(
      c => c.floor === floor && c.direction === direction
    );
    
    if (!exists) {
      this.externalCalls.push({ floor, direction });
      console.log(`Lift called to floor ${floor}, going ${direction}`);
    }
  }

  // Open doors (with 1 second delay)
  async openDoors(): Promise<void> {
    if (this.doorState === DoorState.OPEN) {
      console.log(`Doors already open`);
      return;
    }
    console.log(`Doors opening...`);
    await this.sleep(1000); // 1 second
    this.doorState = DoorState.OPEN;
    console.log(`Doors OPEN at floor ${this.currentFloor}`);
    
    this.checkFulfilled();
  }

  // Close doors (with 1 second delay)
  async closeDoors(): Promise<void> {
    if (this.doorState === DoorState.CLOSED) {
      console.log(`Doors already closed`);
      return;
    }
    console.log(`Doors closing...`);
    await this.sleep(1000); // 1 second
    this.doorState = DoorState.CLOSED;
    console.log(`Doors CLOSED`);
  }

  // Helper for delays
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Move to floor (automatic doors, 3 seconds per floor)
  async moveToFloor(targetFloor: number): Promise<void> {
    if (targetFloor < this.minFloor || targetFloor > this.maxFloor) {
      console.log(`Floor ${targetFloor} out of range (${this.minFloor}-${this.maxFloor})`);
      return;
    }

    if (targetFloor === this.currentFloor) {
      console.log(`Already at floor ${targetFloor}`);
      return;
    }

    // Auto-close doors if open
    if (this.doorState === DoorState.OPEN) {
      await this.closeDoors();
    }

    const floorsToTravel = Math.abs(targetFloor - this.currentFloor);
    this.direction = targetFloor > this.currentFloor ? Direction.UP : Direction.DOWN;
    
    console.log(`Moving ${this.direction} from floor ${this.currentFloor} to ${targetFloor}...`);
    
    // Move through each floor (3 seconds per floor)
    const step = this.direction === Direction.UP ? 1 : -1;
    for (let i = 0; i < floorsToTravel; i++) {
      await this.sleep(3000); // 3 seconds per floor
      this.currentFloor += step;
      if (i < floorsToTravel - 1) {
        console.log(`Passing floor ${this.currentFloor}...`);
      }
    }
    
    console.log(`Arrived at floor ${this.currentFloor}`);
    this.direction = Direction.IDLE;
    
    // Auto-open doors
    await this.openDoors();
  }

  // Check fulfilled requests
  private checkFulfilled(): void {
    if (this.internalRequests.has(this.currentFloor)) {
      this.internalRequests.delete(this.currentFloor);
      console.log(`✓ Fulfilled internal request for floor ${this.currentFloor}`);
    }

    this.externalCalls = this.externalCalls.filter(call => {
      if (call.floor === this.currentFloor) {
        if (this.direction === Direction.IDLE || this.direction === call.direction) {
          console.log(`✓ Fulfilled external call at floor ${this.currentFloor}, direction ${call.direction}`);
          return false;
        }
      }
      return true;
    });
  }

  // Show status
  showStatus(): void {
    console.log(`\n--- STATUS ---`);
    console.log(`Floor: ${this.currentFloor}`);
    console.log(`Doors: ${this.doorState}`);
    console.log(`Internal: ${Array.from(this.internalRequests).join(", ") || "None"}`);
    console.log(`External: ${this.externalCalls.map(c => `${c.floor}(${c.direction})`).join(", ") || "None"}`);
    console.log(`--------------\n`);
  }
}

// Helper to read input
async function ask(question: string): Promise<string> {
  const buf = new Uint8Array(1024);
  await Deno.stdout.write(new TextEncoder().encode(question));
  const n = await Deno.stdin.read(buf);
  return new TextDecoder().decode(buf.subarray(0, n || 0)).trim();
}

// Main program
async function main() {
  const lift = new Lift(0, 10, 0);

  console.log("\n=== LIFT SIMULATOR ===");
  console.log(`Floors: 0-10, Starting at floor ${lift.getCurrentFloor()}\n`);

  let running = true;

  while (running) {
    console.log("1. Move to floor");
    console.log("2. Press button inside");
    console.log("3. Call from floor");
    console.log("4. Open doors");
    console.log("5. Close doors");
    console.log("6. Status");
    console.log("7. Exit");

    const choice = await ask("\nChoice: ");
    console.log();

    switch (choice) {
      case "1": {
        const f = await ask("Which floor? ");
        const floor = parseInt(f);
        if (!isNaN(floor)) await lift.moveToFloor(floor);
        else console.log("Invalid number");
        break;
      }

      case "2": {
        const f = await ask("Which floor? ");
        const floor = parseInt(f);
        if (!isNaN(floor)) lift.pressButton(floor);
        else console.log("Invalid number");
        break;
      }

      case "3": {
        const f = await ask("From which floor? ");
        const floor = parseInt(f);
        if (isNaN(floor)) {
          console.log("Invalid number");
          break;
        }
        const d = await ask("Direction (UP/DOWN)? ");
        const dir = d.toUpperCase();
        if (dir === "UP") lift.callLift(floor, Direction.UP);
        else if (dir === "DOWN") lift.callLift(floor, Direction.DOWN);
        else console.log("Invalid direction");
        break;
      }

      case "4":
        await lift.openDoors();
        break;

      case "5":
        await lift.closeDoors();
        break;

      case "6":
        lift.showStatus();
        break;

      case "7":
        console.log("Goodbye!");
        running = false;
        break;

      default:
        console.log("Invalid choice");
    }
  }
}

if (import.meta.url === Deno.mainModule) {
  main();
}
