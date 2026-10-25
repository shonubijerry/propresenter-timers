'use client'

import { Timer, TimerEditInput } from '../../interfaces/time'
import { TimerActions } from '../../hooks/timer'
import { LocalTime } from '../../providers/timer'
import { memo, useCallback, useState } from 'react'
import { TimerCard } from './TimerCard'
import { TimerCardEdit } from './TimerCardEdit'

interface TimerCardContainerProps {
  timer: Timer
  canMoveUp: boolean
  canMoveDown: boolean
  isActive: boolean
  // Only passed to the active card, so the others skip the per-second render
  localTimer: LocalTime | null
  isAnyTimerRunning: boolean
  onOperation: (timer: Timer, action: TimerActions) => void
  onDelete: (uuid: string) => void
  onOpenFullScreen: (timer: Timer) => void
  onSave: (timer: Timer, input: TimerEditInput) => Promise<boolean>
  onReorder: (timerId: string, direction: 'up' | 'down') => void
}

export const TimerCardContainer = memo(function TimerCardContainer({
  timer,
  canMoveUp,
  canMoveDown,
  isActive,
  localTimer,
  isAnyTimerRunning,
  onDelete,
  onOperation,
  onOpenFullScreen,
  onSave,
  onReorder,
}: TimerCardContainerProps) {
  const [isEditMode, setIsEditMode] = useState<boolean>(false)
  const timerId = timer.id.uuid
  const onMoveUp = useCallback(
    () => onReorder(timerId, 'up'),
    [onReorder, timerId]
  )
  const onMoveDown = useCallback(
    () => onReorder(timerId, 'down'),
    [onReorder, timerId]
  )

  const handleEditClick = () => {
    setIsEditMode(true)
  }

  const handleCancel = () => {
    setIsEditMode(false)
  }

  const handleSubmit = async (editedTimer: Timer, input: TimerEditInput) => {
    const saved = await onSave(editedTimer, input)
    if (saved) setIsEditMode(false)
    return saved
  }

  if (isEditMode) {
    return (
      <TimerCardEdit
        timer={timer}
        isActive={isActive}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
      />
    )
  }

  return (
    <TimerCard
      timer={timer}
      isActive={isActive}
      localTimer={localTimer}
      isAnyTimerRunning={isAnyTimerRunning}
      onOperation={onOperation}
      onDelete={onDelete}
      onOpenFullScreen={onOpenFullScreen}
      onEditClick={handleEditClick}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
    />
  )
})
