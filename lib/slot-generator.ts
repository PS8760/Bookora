import { PrismaClient, AppointmentType, WorkingHours, FlexibleScheduleWindow } from "@/prisma/generated/prisma";

interface SlotGenerationParams {
  appointmentType: AppointmentType & {
    workingHours: WorkingHours[];
    flexibleScheduleWindows: FlexibleScheduleWindow[];
  };
  startDate: Date;
  endDate: Date;
}

export async function generateSlots(
  prisma: PrismaClient,
  params: SlotGenerationParams
): Promise<number> {
  const { appointmentType, startDate, endDate } = params;
  const slotsToCreate: any[] = [];

  if (appointmentType.scheduleType === "weekly") {
    // Generate slots from working hours
    const { workingHours, durationMinutes, maxCapacity } = appointmentType;
    const organiserTimezone = appointmentType.organiserTimezone;

    // Iterate through each day in the range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay(); // 0=Sunday, 6=Saturday

      // Find working hours for this day
      const dayWorkingHours = workingHours.filter((wh) => wh.dayOfWeek === dayOfWeek);

      for (const wh of dayWorkingHours) {
        // Parse start and end times
        const [startHour, startMinute] = wh.startTime.split(":").map(Number);
        const [endHour, endMinute] = wh.endTime.split(":").map(Number);

        // Create a date object for this day with the working hours
        const dayStart = new Date(currentDate);
        dayStart.setHours(startHour, startMinute, 0, 0);

        const dayEnd = new Date(currentDate);
        dayEnd.setHours(endHour, endMinute, 0, 0);

        // Generate slots for this working hour window
        let slotStart = new Date(dayStart);
        while (slotStart < dayEnd) {
          const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

          if (slotEnd <= dayEnd) {
            // Convert to UTC (assuming the times are in organiser's timezone)
            // For simplicity, we assume the times are already in UTC or the conversion is handled elsewhere
            slotsToCreate.push({
              appointmentTypeId: appointmentType.id,
              providerId: null, // Will be assigned later or based on provider
              startUtc: new Date(slotStart),
              endUtc: new Date(slotEnd),
              maxCapacity,
              remaining: maxCapacity,
              status: "available",
            });
          }

          slotStart = new Date(slotStart.getTime() + durationMinutes * 60000);
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
    }
  } else if (appointmentType.scheduleType === "flexible") {
    // Generate slots from flexible schedule windows
    const { flexibleScheduleWindows, durationMinutes, maxCapacity } = appointmentType;

    for (const window of flexibleScheduleWindows) {
      // Skip windows that end before our start date or start after our end date
      if (window.windowEndUtc < startDate || window.windowStartUtc > endDate) {
        continue;
      }

      let slotStart = new Date(
        Math.max(window.windowStartUtc.getTime(), startDate.getTime())
      );
      const windowEnd = new Date(
        Math.min(window.windowEndUtc.getTime(), endDate.getTime())
      );

      while (slotStart < windowEnd) {
        const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

        if (slotEnd <= windowEnd) {
          slotsToCreate.push({
            appointmentTypeId: appointmentType.id,
            providerId: null,
            startUtc: new Date(slotStart),
            endUtc: new Date(slotEnd),
            maxCapacity,
            remaining: maxCapacity,
            status: "available",
            flexibleWindowId: window.id,
          });
        }

        slotStart = new Date(slotStart.getTime() + durationMinutes * 60000);
      }
    }
  }

  // Batch insert slots, skipping duplicates
  if (slotsToCreate.length > 0) {
    // Use createMany with skipDuplicates
    const result = await prisma.slot.createMany({
      data: slotsToCreate,
      skipDuplicates: true,
    });

    return result.count;
  }

  return 0;
}

// Generate slots for the next N days from today
export async function generateSlotsForNextDays(
  prisma: PrismaClient,
  appointmentTypeId: string,
  days: number = 60
): Promise<number> {
  const appointmentType = await prisma.appointmentType.findUnique({
    where: { id: appointmentTypeId },
    include: {
      workingHours: true,
      flexibleScheduleWindows: true,
    },
  });

  if (!appointmentType) {
    throw new Error("Appointment type not found");
  }

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  return generateSlots(prisma, {
    appointmentType,
    startDate,
    endDate,
  });
}
