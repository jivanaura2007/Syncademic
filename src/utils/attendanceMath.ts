import { Subject, BunkCalculation } from '../types';

/**
 * Calculates detailed attendance and bunk statistics for a subject
 */
export function calculateSubjectAttendance(subject: Subject): BunkCalculation {
  const { attendedClasses, totalClasses, targetAttendance } = subject;
  const targetFraction = (targetAttendance || 75) / 100;

  if (totalClasses === 0) {
    return {
      subjectId: subject.id,
      currentPercentage: 100,
      requiredPercentage: targetAttendance || 75,
      safeBunks: 0,
      classesNeededToRecover: 0,
      status: 'safe',
      summaryText: 'No classes conducted yet'
    };
  }

  const currentPercentage = Math.round((attendedClasses / totalClasses) * 1000) / 10; // 1 decimal place

  if (currentPercentage >= targetAttendance) {
    // How many classes can be missed without dropping below target?
    // Formula: floor((Attended - Target * Total) / Target)
    const maxMissable = Math.floor((attendedClasses - targetFraction * totalClasses) / targetFraction);
    const safeBunks = Math.max(0, maxMissable);

    let status: 'safe' | 'warning' = 'safe';
    let summaryText = '';

    if (safeBunks === 0) {
      status = 'warning';
      summaryText = 'On the edge: Attending next class is strongly advised';
    } else if (safeBunks === 1) {
      summaryText = 'You can safely miss 1 class';
    } else {
      summaryText = `You can safely miss ${safeBunks} classes`;
    }

    return {
      subjectId: subject.id,
      currentPercentage,
      requiredPercentage: targetAttendance,
      safeBunks,
      classesNeededToRecover: 0,
      status,
      summaryText
    };
  } else {
    // How many consecutive classes must be attended to reach target?
    // Formula: ceil((Target * Total - Attended) / (1 - Target))
    let classesNeededToRecover = 1;
    if (targetFraction >= 1) {
      classesNeededToRecover = attendedClasses < totalClasses ? (totalClasses - attendedClasses) : 0;
    } else {
      const needed = Math.ceil((targetFraction * totalClasses - attendedClasses) / (1 - targetFraction));
      classesNeededToRecover = Math.max(1, needed);
    }

    const isCritical = currentPercentage < (targetAttendance - 10);

    return {
      subjectId: subject.id,
      currentPercentage,
      requiredPercentage: targetAttendance,
      safeBunks: 0,
      classesNeededToRecover,
      status: isCritical ? 'critical' : 'warning',
      summaryText: `Must attend next ${classesNeededToRecover} ${classesNeededToRecover === 1 ? 'class' : 'classes'} to reach ${targetAttendance}%`
    };
  }
}

/**
 * Simulates future attendance when attending or missing upcoming classes
 */
export function simulateAttendance(
  currentAttended: number,
  currentTotal: number,
  additionalAttended: number,
  additionalMissed: number
): {
  projectedAttended: number;
  projectedTotal: number;
  projectedPercentage: number;
} {
  const projectedAttended = currentAttended + additionalAttended;
  const projectedTotal = currentTotal + additionalAttended + additionalMissed;

  if (projectedTotal === 0) {
    return { projectedAttended: 0, projectedTotal: 0, projectedPercentage: 100 };
  }

  const projectedPercentage = Math.round((projectedAttended / projectedTotal) * 1000) / 10;
  return { projectedAttended, projectedTotal, projectedPercentage };
}

/**
 * Overall aggregate attendance statistics across all subjects
 */
export function calculateOverallAttendance(subjects: Subject[]): {
  overallPercentage: number;
  totalAttended: number;
  totalConducted: number;
  subjectsAboveThreshold: number;
  subjectsBelowThreshold: number;
  criticalSubjectsCount: number;
  status: 'safe' | 'warning' | 'critical';
} {
  if (subjects.length === 0) {
    return {
      overallPercentage: 100,
      totalAttended: 0,
      totalConducted: 0,
      subjectsAboveThreshold: 0,
      subjectsBelowThreshold: 0,
      criticalSubjectsCount: 0,
      status: 'safe'
    };
  }

  let totalAttended = 0;
  let totalConducted = 0;
  let subjectsAboveThreshold = 0;
  let subjectsBelowThreshold = 0;
  let criticalSubjectsCount = 0;

  for (const sub of subjects) {
    totalAttended += sub.attendedClasses;
    totalConducted += sub.totalClasses;

    const calc = calculateSubjectAttendance(sub);
    if (calc.currentPercentage >= calc.requiredPercentage) {
      subjectsAboveThreshold++;
    } else {
      subjectsBelowThreshold++;
      if (calc.status === 'critical') {
        criticalSubjectsCount++;
      }
    }
  }

  const overallPercentage = totalConducted > 0 
    ? Math.round((totalAttended / totalConducted) * 1000) / 10 
    : 100;

  let status: 'safe' | 'warning' | 'critical' = 'safe';
  if (criticalSubjectsCount > 0 || overallPercentage < 70) {
    status = 'critical';
  } else if (subjectsBelowThreshold > 0 || overallPercentage < 75) {
    status = 'warning';
  }

  return {
    overallPercentage,
    totalAttended,
    totalConducted,
    subjectsAboveThreshold,
    subjectsBelowThreshold,
    criticalSubjectsCount,
    status
  };
}
