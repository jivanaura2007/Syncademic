import React, { useState } from 'react';
import { CheckCircle2, XCircle, Clock, Building, User, Sparkles } from 'lucide-react';
import { AppState, AttendanceRecord, DayOfWeek } from '../../types';
import { Modal } from './Modal';
import { Button } from './Button';
import { Badge } from './Badge';
import { markClassAttendance } from '../../services/storage';
import { useToast } from './Toast';

interface QuickMarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
}

export const QuickMarkModal: React.FC<QuickMarkModalProps> = ({
  isOpen,
  onClose,
  state
}) => {
  const { showToast } = useToast();
  const now = new Date();
  const currentDayIndex = now.getDay();
  const todayStr = now.toISOString().split('T')[0];

  const replacementDay = state.replacementDays.find(r => r.date === todayStr);
  const effectiveDayOfWeek: DayOfWeek = replacementDay
    ? replacementDay.operatesAsDayOfWeek
    : (currentDayIndex >= 1 && currentDayIndex <= 6 ? (currentDayIndex as DayOfWeek) : 1);

  const todaySlots = state.timetableSlots
    .filter(slot => slot.dayOfWeek === effectiveDayOfWeek)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const [marks, setMarks] = useState<Record<string, AttendanceRecord['status']>>({});

  const handleSetMark = (slotId: string, status: AttendanceRecord['status']) => {
    setMarks(prev => ({
      ...prev,
      [slotId]: status
    }));
  };

  const handleSaveAll = () => {
    let count = 0;
    todaySlots.forEach((slot) => {
      const timeFormatted = `${slot.startTime} - ${slot.endTime}`;
      const chosenStatus = marks[slot.id];
      if (chosenStatus) {
        markClassAttendance(slot.subjectId, todayStr, timeFormatted, chosenStatus);
        count++;
      }
    });

    showToast(`Recorded attendance for ${count} ${count === 1 ? 'class' : 'classes'} today`, 'success');
    onClose();
  };

  const handleMarkAllPresent = () => {
    const newMarks: Record<string, AttendanceRecord['status']> = {};
    todaySlots.forEach(s => {
      newMarks[s.id] = 'present';
    });
    setMarks(newMarks);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mark Today's Academic Attendance"
      subtitle={`Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {todaySlots.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#5A5E65]">
            No lecture slots scheduled for today.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#5A5E65]">
                {todaySlots.length} {todaySlots.length === 1 ? 'class' : 'classes'} scheduled
              </span>
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="text-xs font-semibold text-[#007FFF] hover:underline"
              >
                Mark all Present
              </button>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {todaySlots.map((slot) => {
                const subject = state.subjects.find(s => s.id === slot.subjectId);
                const timeFormatted = `${slot.startTime} - ${slot.endTime}`;
                const existingRecord = state.attendanceRecords.find(
                  r => r.subjectId === slot.subjectId && r.date === todayStr && r.timeSlot === timeFormatted
                );
                const currentChoice = marks[slot.id] || existingRecord?.status || 'present';

                return (
                  <div
                    key={slot.id}
                    className="p-3 rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[#1E2022]">
                          {subject?.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white border border-[#E8E7E2] text-[#5A5E65]">
                          {subject?.code}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#848A94] mt-0.5 block">
                        {timeFormatted} • Room {slot.room}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSetMark(slot.id, 'present')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                          currentChoice === 'present'
                            ? 'bg-[#1E7E34] text-white'
                            : 'bg-[#EBF7EE] text-[#1E7E34] hover:bg-[#D4EDDA]'
                        }`}
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetMark(slot.id, 'absent')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                          currentChoice === 'absent'
                            ? 'bg-[#D9381E] text-white'
                            : 'bg-[#FFF1F0] text-[#D9381E] hover:bg-[#FFE4E1]'
                        }`}
                      >
                        Absent
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E8E7E2]">
              <Button variant="outline" size="sm" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="button" onClick={handleSaveAll}>
                Save Attendance
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
