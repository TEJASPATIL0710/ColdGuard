export const SAFE_MIN_TEMP = 2
export const SAFE_MAX_TEMP = 8
export const IDEAL_TEMP = 4.2
export const TICK_MS = 1500
export const HISTORY_LIMIT = 24
export const FULL_BACKUP_HOURS = 72

export const ROUTE_POINTS = [
  'Hub Dispatch',
  'Pune Highway',
  'Village Clinic',
  'Field Vaccination Camp',
]

export const MODE_LABELS = {
  stable: 'Stable Transit',
  failure: 'Thermal Excursion',
  recovery: 'Recovery Cycle',
}

export const METRIC_CARDS = [
  {
    key: 'stability',
    label: 'Temperature stability',
    target: 'Target +/-0.5 deg C',
  },
  {
    key: 'backup',
    label: 'Backup time',
    target: 'Goal 24 to 72 hrs',
  },
  {
    key: 'energy',
    label: 'Energy use',
    target: 'Lower is better',
  },
  {
    key: 'carbon',
    label: 'Carbon reduction',
    target: 'Vs diesel transport',
  },
]
