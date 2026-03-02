import { create } from 'zustand'

interface GPSPosition {
  lat: number
  lng: number
  accuracy: number
}

interface VisitState {
  activeAssignmentId: string | null
  checkinTime: Date | null
  checkinGPS: GPSPosition | null
  timerRunning: boolean
  elapsedSeconds: number

  startVisit: (assignmentId: string, gps: GPSPosition | null) => void
  endVisit: () => void
  setTimerRunning: (running: boolean) => void
  setElapsedSeconds: (seconds: number) => void
}

export const useVisitStore = create<VisitState>((set) => ({
  activeAssignmentId: null,
  checkinTime: null,
  checkinGPS: null,
  timerRunning: false,
  elapsedSeconds: 0,

  startVisit: (assignmentId, gps) =>
    set({
      activeAssignmentId: assignmentId,
      checkinTime: new Date(),
      checkinGPS: gps,
      timerRunning: true,
      elapsedSeconds: 0,
    }),

  endVisit: () =>
    set({
      activeAssignmentId: null,
      checkinTime: null,
      checkinGPS: null,
      timerRunning: false,
      elapsedSeconds: 0,
    }),

  setTimerRunning: (timerRunning) => set({ timerRunning }),
  setElapsedSeconds: (elapsedSeconds) => set({ elapsedSeconds }),
}))
