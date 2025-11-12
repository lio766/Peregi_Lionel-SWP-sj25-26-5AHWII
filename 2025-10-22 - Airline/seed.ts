import { PrismaClient } from "./prisma/client/client.ts";

const prisma = new PrismaClient();

async function seed() {
    console.log("Seeding DB... DATABASE_URL=", Deno.env.get("DATABASE_URL"));

    // Airports
    const vienna = await prisma.airport.upsert({
        where: { iataCode: "VIE" },
        update: {},
        create: { name: "Vienna International Airport", iataCode: "VIE", city: "Vienna" }
    });

    const heathrow = await prisma.airport.upsert({
        where: { iataCode: "LHR" },
        update: {},
        create: { name: "Heathrow Airport", iataCode: "LHR", city: "London" }
    });

    // Planes (we use fixed ids so upsert works idempotent)
    const plane1 = await prisma.plane.upsert({
        where: { id: "plane-1" },
        update: {},
        create: { id: "plane-1", model: "Boeing 737", capacity: 180 }
    });

    const plane2 = await prisma.plane.upsert({
        where: { id: "plane-2" },
        update: {},
        create: { id: "plane-2", model: "Airbus A320", capacity: 150 }
    });

    // Passengers
    const alice = await prisma.passenger.upsert({
        where: { email: "alice@example.com" },
        update: {},
        create: { firstName: "Alice", lastName: "Muster", email: "alice@example.com" }
    });

    const bob = await prisma.passenger.upsert({
        where: { email: "bob@example.com" },
        update: {},
        create: { firstName: "Bob", lastName: "Tester", email: "bob@example.com" }
    });

    const carol = await prisma.passenger.upsert({
        where: { email: "carol@example.com" },
        update: {},
        create: { firstName: "Carol", lastName: "Example", email: "carol@example.com" }
    });

    // Flights
    await prisma.flight.upsert({
        where: { id: "flight-1" },
        update: {},
        create: {
            id: "flight-1",
            flightNumber: "GRG101",
            departureTime: new Date("2025-12-01T09:00:00Z"),
            arrivalTime: new Date("2025-12-01T11:00:00Z"),
            origin: { connect: { id: vienna.id } },
            destination: { connect: { id: heathrow.id } },
            plane: { connect: { id: plane1.id } },
            passengers: { connect: [{ id: alice.id }, { id: bob.id }] }
        }
    });

    await prisma.flight.upsert({
        where: { id: "flight-2" },
        update: {},
        create: {
            id: "flight-2",
            flightNumber: "GRG102",
            departureTime: new Date("2025-12-02T13:00:00Z"),
            arrivalTime: new Date("2025-12-02T15:00:00Z"),
            origin: { connect: { id: heathrow.id } },
            destination: { connect: { id: vienna.id } },
            plane: { connect: { id: plane2.id } },
            passengers: { connect: [{ id: bob.id }, { id: carol.id }] }
        }
    });

    console.log("Seed finished.");
}

seed()
    .catch((e) => {
        console.error("Seeding error:", e);
        Deno.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
// end of seed.ts
