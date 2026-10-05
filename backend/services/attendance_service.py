import math
from typing import Dict, Any, List
from backend.database.models import Subject

def calculate_subject_bunk_stats(subject: Subject) -> Dict[str, Any]:
    """Authoritative mathematical calculation for attendance percentage, safe bunks, and recovery"""
    attended = subject.attended_classes or 0
    total = subject.total_classes or 0
    target_pct = subject.target_attendance or 75
    target_frac = target_pct / 100.0

    if total == 0:
        return {
            "subjectId": subject.id,
            "currentPercentage": 100.0,
            "requiredPercentage": target_pct,
            "safeBunks": 0,
            "classesNeededToRecover": 0,
            "status": "safe",
            "summaryText": "No classes conducted yet"
        }

    current_pct = round((attended / total) * 100, 1)

    if current_pct >= target_pct:
        # Formula: floor((Attended - Target * Total) / Target)
        if target_frac > 0:
            max_missable = math.floor((attended - target_frac * total) / target_frac)
            safe_bunks = max(0, max_missable)
        else:
            safe_bunks = 999

        status = "safe" if safe_bunks > 0 else "warning"
        summary_text = f"You can safely miss {safe_bunks} classes" if safe_bunks > 1 else ("You can safely miss 1 class" if safe_bunks == 1 else "On the edge: Attending next class is advised")

        return {
            "subjectId": subject.id,
            "currentPercentage": current_pct,
            "requiredPercentage": target_pct,
            "safeBunks": safe_bunks,
            "classesNeededToRecover": 0,
            "status": status,
            "summaryText": summary_text
        }
    else:
        # Formula: ceil((Target * Total - Attended) / (1 - Target))
        if target_frac >= 1.0:
            classes_needed = max(1, total - attended)
        else:
            needed = math.ceil((target_frac * total - attended) / (1.0 - target_frac))
            classes_needed = max(1, needed)

        is_critical = current_pct < (target_pct - 10)
        status = "critical" if is_critical else "warning"

        return {
            "subjectId": subject.id,
            "currentPercentage": current_pct,
            "requiredPercentage": target_pct,
            "safeBunks": 0,
            "classesNeededToRecover": classes_needed,
            "status": status,
            "summaryText": f"Must attend next {classes_needed} {'class' if classes_needed == 1 else 'classes'} to reach {target_pct}%"
        }

def calculate_overall_attendance_summary(subjects: List[Subject]) -> Dict[str, Any]:
    """Calculates overall aggregated attendance metrics across all subjects"""
    if not subjects:
        return {
            "overallPercentage": 100.0,
            "totalAttended": 0,
            "totalConducted": 0,
            "subjects": []
        }

    total_attended = sum(s.attended_classes or 0 for s in subjects)
    total_conducted = sum(s.total_classes or 0 for s in subjects)
    overall_pct = round((total_attended / total_conducted) * 100, 1) if total_conducted > 0 else 100.0

    subjects_summary = [calculate_subject_bunk_stats(s) for s in subjects]

    return {
        "overallPercentage": overall_pct,
        "totalAttended": total_attended,
        "totalConducted": total_conducted,
        "subjects": subjects_summary
    }
