import { PrismaClient } from "model";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

const TARGET = {
    passengers: 20000,
    planes: 250,
    flights: 2500,
    airports: 100,
};

function chunkArray<T>(arr: T[], size: number) {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

async function main() {
    console.log("Starting big seed. DATABASE_URL=", Deno.env.get("DATABASE_URL"));

    // Airports
    const airportsData: { name: string; iataCode: string; city: string }[] = [];
    const usedIatas = new Set<string>();
    while (airportsData.length < TARGET.airports) {
        // generate unique 3-letter IATA-like codes
        const code = faker.string.alpha({ length: 3 }).toUpperCase();
        if (usedIatas.has(code)) continue;
        usedIatas.add(code);
        airportsData.push({ name: `${code} Airport`, iataCode: code, city: faker.location.city() });
    }

    console.log(`Creating ${airportsData.length} airports...`);
    await prisma.airport.createMany({ data: airportsData });

    // Planes
    const planesData = Array.from({ length: TARGET.planes }, () => ({ model: faker.vehicle.model(), capacity: faker.number.int({ min: 50, max: 850 }) }));
    console.log(`Creating ${planesData.length} planes...`);
    await prisma.plane.createMany({ data: planesData });

    // Passengers - create in chunks to avoid building an enormous array
    const passengerChunk = 2000; // 2000 * 10 = 20000
    console.log(`Creating ${TARGET.passengers} passengers in chunks of ${passengerChunk}...`);
    for (let created = 0; created < TARGET.passengers; ) {
        const size = Math.min(passengerChunk, TARGET.passengers - created);
        const batch = Array.from({ length: size }, (_, i) => {
            const idx = created + i + 1;
            const firstName = faker.person.firstName();
            const lastName = faker.person.lastName();
            // deterministic unique email using index to avoid duplicates
            const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${idx}@example.com`;
            return { firstName, lastName, email };
        });
    await prisma.passenger.createMany({ data: batch });
        created += size;
        console.log(`  created ${created}/${TARGET.passengers} passengers`);
    }

    // Refresh airports and planes ids
    const airports = await prisma.airport.findMany({ select: { id: true } });
    const planes = await prisma.plane.findMany({ select: { id: true } });
    const airportIds = airports.map((a) => a.id);
    const planeIds = planes.map((p) => p.id);

    if (!airportIds.length || !planeIds.length) throw new Error("No airports or planes found after creation");

    // Flights: create many with random origin/destination/plane
    console.log(`Creating ${TARGET.flights} flights...`);
    type FlightCreate = { flightNumber: string; departureTime: string; arrivalTime: string; originId: string; destinationId: string; planeId: string };
    const flightsData: FlightCreate[] = [];
    for (let i = 0; i < TARGET.flights; i++) {
        const originId = airportIds[Math.floor(Math.random() * airportIds.length)];
        let destinationId = airportIds[Math.floor(Math.random() * airportIds.length)];
        // ensure origin != destination
        if (destinationId === originId) {
            destinationId = airportIds[(airportIds.indexOf(originId) + 1) % airportIds.length];
        }
        const planeId = planeIds[Math.floor(Math.random() * planeIds.length)];
    const dep = faker.date.future().toISOString();
    const arr = new Date(new Date(dep).getTime() + faker.number.int({ min: 30, max: 6 * 60 }) * 60000).toISOString();
        flightsData.push({ flightNumber: `FL${1000 + i}`, departureTime: dep, arrivalTime: arr, originId, destinationId, planeId });
    }

    // batch create flights in chunks
    const flightChunks = chunkArray(flightsData, 500);
    let fcount = 0;
    for (const ch of flightChunks) {
        await prisma.flight.createMany({ data: ch });
        fcount += ch.length;
        console.log(`  created ${fcount}/${TARGET.flights} flights`);
    }

    // Report final counts
    const counts = await Promise.all([
        prisma.airport.count(),
        prisma.plane.count(),
        prisma.passenger.count(),
        prisma.flight.count(),
    ]);
    console.log("Final counts: airports=%d, planes=%d, passengers=%d, flights=%d", counts[0], counts[1], counts[2], counts[3]);

    console.log("Big seed finished.");
}

main()
    .catch((e) => {
        console.error("Seeding error:", e);
        Deno.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
