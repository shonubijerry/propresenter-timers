import { useStopwatch, useTimer } from "react-timer-hook";

interface Props {
  expiryTimestamp: number;
}

type TimerActionsMap = {
  start: (newExpiryTimestamp: Date, newAutoStart?: boolean) => void;
  stop: () => void;
  reset: (newExpiryTimestamp: Date, newAutoStart?: boolean) => void;
};

export type TimerActions = keyof TimerActionsMap;

export default function useTimerHook({ expiryTimestamp }: Props) {
  const overtime  = useStopwatch({ autoStart: false });
  const { seconds, minutes, hours, isRunning, pause, restart } = useTimer({
    autoStart: false,
    expiryTimestamp: new Date(expiryTimestamp),
    onExpire: () => {
      overtime.start();
    },
  });

  const timerActionsMap: TimerActionsMap = {
    start: restart,
    stop: pause,
    reset: restart,
  };

  const handleLocalTimer = async (action: TimerActions, duration?: number) => {
    if (action === "stop") {
      timerActionsMap[action]();
      return;
    }

    const timestamp = new Date().valueOf();

    timerActionsMap[action](
      new Date(timestamp + (duration ?? 0) * 1000),
      action === "start"
    );
  };

  return {
    seconds,
    minutes,
    hours,
    isRunning,
    handleLocalTimer,
    restart,
    overtime
  };
}
