import { PrismaClient } from "./prisma/client/client.ts";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

const ensurePassengers = 200; // Reduziert für Test
const _ensureAirports = 100;
const ensurePlanes = 25; // Reduziert für Test

async function main() {
  console.log("🌱 Starting seed...");

  try {
    // Passengers
    const passengerCount = await prisma.passenger.count();
    console.log(`📊 Current passengers: ${passengerCount}`);
    
    if (passengerCount < ensurePassengers) {
      console.log(`🚀 Creating ${ensurePassengers - passengerCount} passengers...`);
      for (let i = 0; i < ensurePassengers - passengerCount; i++) {
        const first = faker.person.firstName();
        const last = faker.person.lastName();
        const email = `${first.toLowerCase()}.${last.toLowerCase()}.${crypto.randomUUID().slice(0,8)}@example.com`;
        
        await prisma.passenger.create({
          data: {
            firstName: first,
            lastName: last,
            email,
          },
        });
        
        if ((i + 1) % 50 === 0) {
          console.log(`✅ Created ${i + 1} passengers...`);
        }
      }
      console.log(`🎉 Finished creating passengers!`);
    } else {
      console.log(`✅ Already have enough passengers: ${passengerCount}`);
    }

    // Planes
    const planeCount = await prisma.plane.count();
    console.log(`📊 Current planes: ${planeCount}`);
    
    const planes_to_create = ensurePlanes - planeCount;
    if (planes_to_create > 0) {
      console.log(`✈️ Creating ${planes_to_create} planes...`);
      for (let i = 0; i < planes_to_create; i++) {
        await prisma.plane.create({
          data: {
            model: faker.airline.airplane().name,
            capacity: faker.number.int({ min: 10, max: 850 }),
          },
        });
        console.log(`✅ Created plane ${i + 1}/${planes_to_create}`);
      }
      console.log(`🎉 Finished creating planes!`);
    } else {
      console.log(`✅ Already have enough planes: ${planeCount}`);
    }

    // Airports
    const airportCount = await prisma.airport.count();
    console.log(`📊 Current airports: ${airportCount}`);
    const airports_to_create = _ensureAirports - airportCount;
    if (airports_to_create > 0) {
      console.log(`🛫 Creating ${airports_to_create} airports...`);
      let created = 0;
      // keep trying until we created enough (handle unique iata collisions)
      while (created < airports_to_create) {
        const fake_airport = faker.airline.airport();
        try {
          await prisma.airport.create({
            data: {
              name: fake_airport.name,
              iataCode: fake_airport.iataCode ?? `${faker.string.alpha({ length: 3 }).toUpperCase()}`,
              city: faker.location.city(),
            },
          });
          created++;
          if (created % 10 === 0) console.log(`✅ Created ${created}/${airports_to_create} airports...`);
        } catch (_e) {
          // likely unique constraint on iataCode; skip and continue
        }
      }
      console.log(`🎉 Finished creating airports!`);
    } else {
      console.log(`✅ Already have enough airports: ${airportCount}`);
    }

    // Flights
    // Create a reasonable number of flights based on planes (e.g., 10 flights per plane)
    const planes = await prisma.plane.findMany();
    const airports = await prisma.airport.findMany();
    const desiredFlights = planes.length * 10;
    const flightCount = await prisma.flight.count();
    console.log(`📊 Current flights: ${flightCount}`);
    const flights_to_create = Math.max(0, desiredFlights - flightCount);
    if (flights_to_create > 0 && airports.length >= 2 && planes.length > 0) {
      console.log(`✈️ Creating ${flights_to_create} flights...`);
      for (let i = 0; i < flights_to_create; i++) {
        // pick distinct origin and destination
        const origin = airports[Math.floor(Math.random() * airports.length)];
        let destination = airports[Math.floor(Math.random() * airports.length)];
        while (destination.id === origin.id) {
          destination = airports[Math.floor(Math.random() * airports.length)];
        }
        const plane = planes[Math.floor(Math.random() * planes.length)];

        const departure = new Date(Date.now() + Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 90)); // within 90 days
        const durationHours = Math.floor(Math.random() * 12) + 1;
        const arrival = new Date(departure.getTime() + durationHours * 60 * 60 * 1000);
        const flightNumber = `${origin.iataCode}${Math.floor(Math.random() * 9000) + 1000}`;

        await prisma.flight.create({
          data: {
            flightNumber,
            departureTime: departure,
            arrivalTime: arrival,
            origin: { connect: { id: origin.id } },
            destination: { connect: { id: destination.id } },
            plane: { connect: { id: plane.id } },
          },
        });

        if ((i + 1) % 50 === 0) console.log(`✅ Created ${i + 1}/${flights_to_create} flights...`);
      }
      console.log(`🎉 Finished creating flights!`);
    } else {
      console.log(`✅ Already have enough flights or not enough airports/planes to create flights`);
    }

    console.log("🌱 Seed completed successfully!");
    
  } catch (error) {
    console.error("❌ Error during seed:", error);
  } finally {
    await prisma.$disconnect();
    console.log("🔌 Database connection closed.");
  }
}

// Execute the seed
main();