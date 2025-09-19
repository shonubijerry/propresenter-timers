"use client";

import { formatSecondsToTime, formatTime } from "@/lib/formatter";
import { useEffect, useState } from "react";
import { Timer } from "./interfaces/time";
import useTimerHook, { TimerActions } from "./hooks/timer";
import CreateTimerModal from "./components/CreateTimerModal";

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [timers, setTimers] = useState<Timer[]>([]);
  const [currentTimer, setCurrentTimer] = useState<Timer | null>();
  const { seconds, minutes, hours, isRunning, handleLocalTimer } = useTimerHook(
    {
      expiryTimestamp: new Date().valueOf(),
    }
  );

  const updateTimers = (timer: Timer) => {
    setTimers([
      ...timers,
      {
        ...timer,
        state: "stopped",
        remainingSeconds: timer.countdown?.duration ?? 0,
        time: formatSecondsToTime(timer.countdown?.duration ?? 0),
      },
    ]);
  };

  const fetchTimers = async () => {
    const res = await fetch("/api/timers", {
      cache: "no-store",
    });
    const data = (await res.json()) as Timer[];
    console.log(data);

    setTimers(data);
    return data;
  };

  useEffect(() => {
    fetchTimers();
  }, []);

  useEffect(() => {
    const loadTimers = async () => {
      const fetched = await fetchTimers(); // make sure this returns timers
      console.log(fetched);

      setTimers(fetched);
      const runningTimer = fetched.find((d) => d.state === "running");

      if (runningTimer) {
        setCurrentTimer(runningTimer);
        handleLocalTimer("start", runningTimer.remainingSeconds);
      }
    };

    loadTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (uuid: string) => {
    await fetch(`/api/timers/${uuid}`, { method: "DELETE" });
    setTimers((prev) => prev.filter((t) => t.id.uuid !== uuid));

    if (currentTimer?.id.uuid === uuid) {
      setCurrentTimer(null);
      handleLocalTimer("stop");
    }
  };

  const handleOperation = async (timer: Timer, action: TimerActions) => {
    if (isRunning && action === "start") {
      return;
    }

    if (!isRunning && action === "stop") {
      return;
    }
    setCurrentTimer(timer);

    if (action === "reset") {
      setCurrentTimer(null);
    }

    await fetch(`/api/timers/${timer.id.uuid}/${action}`);
    handleLocalTimer(action, timer.remainingSeconds);
    await fetchTimers();
  };

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">ProPresenter Timers</h1>
      <button
        onClick={() => setIsModalOpen(true)}
        className="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        + Create Timer
      </button>
      <ul className="space-y-4">
        {timers.map((timer) => (
          <li
            key={timer.id.uuid}
            className="p-4 border rounded flex justify-between items-center"
          >
            <div>
              <h2 className="font-semibold">{timer.id.name}</h2>
              {timer.countdown && (
                <p>Duration: {timer.countdown.duration / 60}m</p>
              )}
            </div>
            {timer.countdown ? (
              <div className="flex gap-2">
                {currentTimer?.id?.uuid === timer.id.uuid && (
                  <h2 className="px-3 py-1 text-xl">
                    {formatTime(hours, minutes, seconds)}
                  </h2>
                )}
                <button
                  disabled={isRunning}
                  className="px-3 py-1 bg-green-600 text-white rounded"
                  onClick={() => handleOperation(timer, "start")}
                >
                  Start
                </button>
                <button
                  className="px-3 py-1 bg-yellow-600 text-white rounded"
                  onClick={() => handleOperation(timer, "stop")}
                >
                  Stop
                </button>
                <button
                  className="px-3 py-1 bg-blue-600 text-white rounded"
                  onClick={() => handleOperation(timer, "reset")}
                >
                  Reset
                </button>
                <button
                  className="px-3 py-1 bg-red-600 text-white rounded"
                  onClick={() => handleDelete(timer.id.uuid)}
                >
                  Delete
                </button>
              </div>
            ) : (
              <div>Timer Config Not Supported</div>
            )}
          </li>
        ))}
      </ul>
      <CreateTimerModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={updateTimers}
      />
    </main>
  );
}
