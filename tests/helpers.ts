import type { Task } from '../src/core/types'

let nextId = 1

export function makeTask(overrides: Partial<Task> = {}): Task {
  const id = overrides.id ?? nextId++
  return {
    id,
    parentId: null,
    title: `Task ${id}`,
    notes: null,
    status: 'open',
    priority: 2,
    areaId: null,
    areaName: null,
    dueDate: null,
    dueTime: null,
    dueAt: null,
    people: [],
    tags: [],
    sourceText: null,
    createdAt: '2026-09-20T08:00:00.000Z',
    updatedAt: '2026-09-20T08:00:00.000Z',
    lastActivityAt: '2026-09-20T08:00:00.000Z',
    completedAt: null,
    startDate: null,
    estimateMin: null,
    waiting: false,
    myDayDate: null,
    recurrenceId: null,
    recurrence: null,
    ...overrides
  }
}

export const titles = (tasks: Task[]): string[] => tasks.map((t) => t.title)
