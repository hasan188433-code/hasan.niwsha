export interface CycleLog {
  id: string;
  startDate: string; // YYYY-MM-DD
  periodLengthDays: number; // e.g., 5
  cycleLengthDays: number; // e.g., 28
  symptoms?: string[];
  mood?: string;
  notes?: string;
  painLevel?: number; // 0 to 5
}

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

export interface CyclePhaseInfo {
  phase: CyclePhase;
  title: string;
  subtitle: string;
  dayInPhase: number;
  dayInCycle: number;
  description: string;
  hormones: {
    estrogen: 'low' | 'rising' | 'peak' | 'dropping';
    progesterone: 'low' | 'low' | 'rising' | 'peak';
    energyLevel: 'low' | 'rising' | 'high' | 'declining';
  };
  medicalTips: string[];
  nutritionTips: string[];
  careTips: string[];
  partnerCareAdvice: string; // How Hasan should pamper & care for Niousha
  colorTheme: string;
  icon: string;
}

export interface CycleStatus {
  currentDayInCycle: number;
  currentPhase: CyclePhase;
  phaseInfo: CyclePhaseInfo;
  daysUntilNextPeriod: number;
  nextPeriodDate: Date;
  ovulationDate: Date;
  fertileWindowStart: Date;
  fertileWindowEnd: Date;
  isPeriodToday: boolean;
  cycleLength: number;
  periodLength: number;
}
