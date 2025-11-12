import { Prisma } from "../prisma/client/browser.ts";
import { prisma } from "./db.ts"

export async function count() {
    return await prisma.flight.count();
}

export async function create(data: Prisma.FlightCreateArgs["data"]) {
    return await prisma.flight.create({ data });
}

export async function getAll() {
    return await prisma.flight.findMany();
}

/**
 * Assign a passenger to a flight (id strings). This is idempotent: if the passenger
 * is already assigned to the flight it will do nothing.
 */
export async function AssignPassengerToFlight(passengerId: string, flightId: string) {
    // check if passenger already on flight
    const exists = await prisma.flight.findFirst({
        where: { id: flightId, passengers: { some: { id: passengerId } } },
        select: { id: true }
    });
    if (exists) return null;

    return await prisma.flight.update({
        where: { id: flightId },
        data: { passengers: { connect: { id: passengerId } } }
    });
}