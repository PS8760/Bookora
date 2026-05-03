export const MISSING_FIELD_PROMPTS: Record<string, string> = {
  title: "What should I name this appointment?",
  date: "What date should this be scheduled for?",
  time: "What time should this start? (e.g., 10 AM, 2:30 PM)",
  duration: "How long should each slot be? (e.g., 30 minutes, 1 hour)",
  recurringDays: "Which days should this repeat? (e.g., Monday, Wednesday, Friday)",
  recurringEndDate: "When should recurring appointments end? Say a date or 'no end date'.",
  slotCount: "How many slots should I create?",
  slotGap: "How many minutes between each slot?",
  organiserName: "Which organiser would you like to book with?",
};

export const ORGANISER_EXAMPLES = [
  "Create an appointment Doctor Visit on Monday at 10 AM for 30 minutes",
  "Create a weekly appointment Team Standup every Monday Tuesday Thursday at 9 AM",
  "Create 5 slots on Friday starting 10 AM every 30 minutes",
  "Update appointment Team Standup change time to 10 AM",
  "Cancel all Team Standup appointments",
];

export const USER_EXAMPLES = [
  "Book an appointment on Tuesday at 3 PM",
  "Book appointment with Dr. Smith on Friday",
  "Book the next available appointment",
  "Book appointment on Monday at 11 AM for annual checkup",
  "Reschedule my Doctor appointment to Wednesday at 2 PM",
];
