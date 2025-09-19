export interface Timer {
  allows_overrun: boolean;
  countdown?: { duration: number };
  count_down_to_time?: {
    time_of_day: number;
    period: "pm" | "am";
  };
  id: { index: number; name: string; uuid: string };
  state: "stopped" | "running" | "complete";
  time: string;
  remainingSeconds: number;
}
