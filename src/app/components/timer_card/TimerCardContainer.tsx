'use client'

import { Timer } from '../../interfaces/time'
import { TimerActions } from '../../hooks/timer'
import { LocalTime } from '../../providers/timer'
import { useState } from 'react'
import { TimerCard } from './TimerCard'
import { TimerCardEdit } from './TimerCardEdit'

interface TimerCardContainerProps {
  timer: Timer
  canMoveUp: boolean
  canMoveDown: boolean
  isActive: boolean
  localTimer: LocalTime
  onOperation: (timer: Timer, action: TimerActions) => void
  onDelete: (uuid: string) => void
  onOpenFullScreen: (timer: Timer) => void
  onEdit: (timer: Timer) => void
  onMoveUp: () => void
  onMoveDown: () => void
}

export function TimerCardContainer({
  timer,
  canMoveUp,
  canMoveDown,
  isActive,
  localTimer,
  onDelete,
  onOperation,
  onOpenFullScreen,
  onEdit,
  onMoveUp,
  onMoveDown,
}: TimerCardContainerProps) {
  const [isEditMode, setIsEditMode] = useState<boolean>(false)

  const handleEditClick = () => {
    setIsEditMode(true)
  }

  const handleCancel = () => {
    setIsEditMode(false)
  }

  const handleSave = (updatedTimer: Timer) => {
    setIsEditMode(false)
    onEdit(updatedTimer)
  }

  if (isEditMode) {
    return (
      <TimerCardEdit
        timer={timer}
        isActive={isActive}
        onCancel={handleCancel}
        onSave={handleSave}
      />
    )
  }

  return (
    <TimerCard
      timer={timer}
      isActive={isActive}
      localTimer={localTimer}
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
}
