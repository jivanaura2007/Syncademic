import { AppState, Subject, TimetableSlot, AttendanceRecord, AcademicNote, AcademicEvent, UniversityHoliday, ReplacementDay, FacultyLeave, SemesterMilestone } from '../types';

export const initialSubjects: Subject[] = [
  {
    id: 'sub-1',
    code: 'CS301',
    name: 'Data Structures & Algorithms',
    faculty: 'Dr. Anand Raman',
    room: 'LH-204',
    credits: 4,
    color: '#007FFF', // Blue
    targetAttendance: 75,
    totalClasses: 32,
    attendedClasses: 28, // 87.5% -> Safe bunks = floor((28 - 0.75*32)/0.75) = floor((28 - 24)/0.75) = floor(4/0.75) = 5
    syllabus: 'Unit 1: Trees & Balanced BSTs (AVL, Red-Black). Unit 2: Graph Algorithms (Dijkstra, Bellman-Ford, Kruskal). Unit 3: Dynamic Programming.',
    notesCount: 4
  },
  {
    id: 'sub-2',
    code: 'CS302',
    name: 'Operating Systems',
    faculty: 'Prof. Meera Sen',
    room: 'LH-102',
    credits: 4,
    color: '#FF6347', // Coral
    targetAttendance: 75,
    totalClasses: 30,
    attendedClasses: 21, // 70% -> Needs ceil((0.75*30 - 21)/(1 - 0.75)) = ceil((22.5 - 21)/0.25) = ceil(1.5/0.25) = 6 classes to recover
    syllabus: 'Unit 1: Process Management & CPU Scheduling. Unit 2: Concurrency, Semaphores & Deadlocks. Unit 3: Virtual Memory & Page Replacement.',
    notesCount: 3
  },
  {
    id: 'sub-3',
    code: 'CS303',
    name: 'Database Management Systems',
    faculty: 'Dr. Vikram Varma',
    room: 'CS-Lab 3',
    credits: 4,
    color: '#35A853', // Green
    targetAttendance: 75,
    totalClasses: 28,
    attendedClasses: 24, // 85.7% -> Safe bunks = floor((24 - 0.75*28)/0.75) = floor(3/0.75) = 4
    syllabus: 'Unit 1: Relational Algebra & SQL. Unit 2: Normalization (1NF to BCNF). Unit 3: Transactions, ACID, & Concurrency Control.',
    notesCount: 5
  },
  {
    id: 'sub-4',
    code: 'CS304',
    name: 'Computer Networks',
    faculty: 'Prof. Rajesh Kulkarni',
    room: 'LH-301',
    credits: 3,
    color: '#F4C430', // Yellow
    targetAttendance: 80,
    totalClasses: 25,
    attendedClasses: 21, // 84% -> Safe bunks = floor((21 - 0.8*25)/0.8) = floor(1/0.8) = 1
    syllabus: 'Unit 1: OSI & TCP/IP Reference Models. Unit 2: Data Link Layer & MAC protocols. Unit 3: Routing Protocols (OSPF, BGP). Unit 4: TCP/UDP & Congestion Control.',
    notesCount: 3
  },
  {
    id: 'sub-5',
    code: 'CS305',
    name: 'Discrete Mathematics',
    faculty: 'Dr. Savita Roy',
    room: 'LH-105',
    credits: 3,
    color: '#8E44AD', // Purple
    targetAttendance: 75,
    totalClasses: 24,
    attendedClasses: 19, // 79.1% -> Safe bunks = floor((19 - 0.75*24)/0.75) = floor(1/0.75) = 1
    syllabus: 'Unit 1: Propositional & Predicate Logic. Unit 2: Set Theory & Relations. Unit 3: Combinatorics & Recurrence Relations. Unit 4: Graph Theory.',
    notesCount: 2
  },
  {
    id: 'sub-6',
    code: 'CS306P',
    name: 'Systems Programming Lab',
    faculty: 'Prof. Meera Sen & Lab TA',
    room: 'OS-Lab 1',
    credits: 2,
    color: '#16A085', // Teal
    targetAttendance: 75,
    totalClasses: 12,
    attendedClasses: 11, // 91.6% -> Safe bunks = floor((11 - 0.75*12)/0.75) = floor(2/0.75) = 2
    syllabus: 'POSIX system calls, fork/exec, pipe/FIFO IPC, multithreaded synchronization with pthread mutex, socket programming in C.',
    notesCount: 2
  }
];

export const initialTimetableSlots: TimetableSlot[] = [
  // Monday (1)
  { id: 'tt-1', dayOfWeek: 1, startTime: '09:00', endTime: '10:00', subjectId: 'sub-1', room: 'LH-204', faculty: 'Dr. Anand Raman', type: 'lecture' },
  { id: 'tt-2', dayOfWeek: 1, startTime: '10:15', endTime: '11:15', subjectId: 'sub-2', room: 'LH-102', faculty: 'Prof. Meera Sen', type: 'lecture' },
  { id: 'tt-3', dayOfWeek: 1, startTime: '11:30', endTime: '12:30', subjectId: 'sub-3', room: 'CS-Lab 3', faculty: 'Dr. Vikram Varma', type: 'lecture' },
  { id: 'tt-4', dayOfWeek: 1, startTime: '14:00', endTime: '16:00', subjectId: 'sub-6', room: 'OS-Lab 1', faculty: 'Prof. Meera Sen & Lab TA', type: 'lab' },

  // Tuesday (2)
  { id: 'tt-5', dayOfWeek: 2, startTime: '09:00', endTime: '10:00', subjectId: 'sub-4', room: 'LH-301', faculty: 'Prof. Rajesh Kulkarni', type: 'lecture' },
  { id: 'tt-6', dayOfWeek: 2, startTime: '10:15', endTime: '11:15', subjectId: 'sub-5', room: 'LH-105', faculty: 'Dr. Savita Roy', type: 'lecture' },
  { id: 'tt-7', dayOfWeek: 2, startTime: '11:30', endTime: '12:30', subjectId: 'sub-1', room: 'LH-204', faculty: 'Dr. Anand Raman', type: 'lecture' },
  { id: 'tt-8', dayOfWeek: 2, startTime: '14:00', endTime: '15:00', subjectId: 'sub-2', room: 'LH-102', faculty: 'Prof. Meera Sen', type: 'tutorial' },

  // Wednesday (3)
  { id: 'tt-9', dayOfWeek: 3, startTime: '09:00', endTime: '10:00', subjectId: 'sub-3', room: 'CS-Lab 3', faculty: 'Dr. Vikram Varma', type: 'lecture' },
  { id: 'tt-10', dayOfWeek: 3, startTime: '10:15', endTime: '11:15', subjectId: 'sub-4', room: 'LH-301', faculty: 'Prof. Rajesh Kulkarni', type: 'lecture' },
  { id: 'tt-11', dayOfWeek: 3, startTime: '11:30', endTime: '12:30', subjectId: 'sub-5', room: 'LH-105', faculty: 'Dr. Savita Roy', type: 'lecture' },
  { id: 'tt-12', dayOfWeek: 3, startTime: '14:00', endTime: '16:00', subjectId: 'sub-3', room: 'CS-Lab 3', faculty: 'Dr. Vikram Varma', type: 'lab' },

  // Thursday (4)
  { id: 'tt-13', dayOfWeek: 4, startTime: '09:00', endTime: '10:00', subjectId: 'sub-1', room: 'LH-204', faculty: 'Dr. Anand Raman', type: 'lecture' },
  { id: 'tt-14', dayOfWeek: 4, startTime: '10:15', endTime: '11:15', subjectId: 'sub-2', room: 'LH-102', faculty: 'Prof. Meera Sen', type: 'lecture' },
  { id: 'tt-15', dayOfWeek: 4, startTime: '11:30', endTime: '12:30', subjectId: 'sub-4', room: 'LH-301', faculty: 'Prof. Rajesh Kulkarni', type: 'lecture' },

  // Friday (5)
  { id: 'tt-16', dayOfWeek: 5, startTime: '09:00', endTime: '10:00', subjectId: 'sub-5', room: 'LH-105', faculty: 'Dr. Savita Roy', type: 'lecture' },
  { id: 'tt-17', dayOfWeek: 5, startTime: '10:15', endTime: '11:15', subjectId: 'sub-3', room: 'CS-Lab 3', faculty: 'Dr. Vikram Varma', type: 'lecture' },
  { id: 'tt-18', dayOfWeek: 5, startTime: '11:30', endTime: '12:30', subjectId: 'sub-1', room: 'LH-204', faculty: 'Dr. Anand Raman', type: 'tutorial' },
  { id: 'tt-19', dayOfWeek: 5, startTime: '14:00', endTime: '15:30', subjectId: 'sub-2', room: 'LH-102', faculty: 'Prof. Meera Sen', type: 'lecture' },

  // Saturday (6)
  { id: 'tt-20', dayOfWeek: 6, startTime: '09:30', endTime: '11:30', subjectId: 'sub-6', room: 'OS-Lab 1', faculty: 'Lab Assistant', type: 'lab' },
  { id: 'tt-21', dayOfWeek: 6, startTime: '11:45', endTime: '12:45', subjectId: 'sub-4', room: 'LH-301', faculty: 'Prof. Rajesh Kulkarni', type: 'tutorial' }
];

export const initialHolidays: UniversityHoliday[] = [
  { id: 'hol-1', date: '2026-08-15', name: 'Independence Day', type: 'national', description: 'National Holiday — University Closed' },
  { id: 'hol-2', date: '2026-09-05', name: 'Janmashtami / University Recess', type: 'university', description: 'Institutional Holiday' },
  { id: 'hol-3', date: '2026-10-02', name: 'Gandhi Jayanti', type: 'national', description: 'National Holiday' },
  { id: 'hol-4', date: '2026-10-20', name: 'Dussehra / Mid-Semester Break', type: 'exam_break', description: 'Mid-term break week begins' }
];

export const initialReplacementDays: ReplacementDay[] = [
  { id: 'rep-1', date: '2026-08-22', operatesAsDayOfWeek: 1, reason: 'Replacement for Monday holiday (Independence Day make-up)' }
];

export const initialFacultyLeaves: FacultyLeave[] = [
  { id: 'fl-1', facultyName: 'Prof. Meera Sen', subjectId: 'sub-2', date: '2026-08-20', timeSlot: '10:15 - 11:15', reason: 'Department Senate Meeting' }
];

export const initialNotes: AcademicNote[] = [
  {
    id: 'note-1',
    title: 'AVL Trees & Dynamic Balancing Rotations',
    description: 'Complete derivation of LL, RR, LR, and RL rotations with code snippet examples and height balance property analysis.',
    subjectId: 'sub-1',
    semester: 4,
    category: 'notes',
    fileType: 'pdf',
    fileSize: '2.4 MB',
    fileName: 'DSA_Unit1_AVL_Trees.pdf',
    tags: ['trees', 'balanced-bst', 'rotations', 'algorithms'],
    isWrittenNote: false,
    gdriveId: 'gdrive-dsa-avl-01',
    gdriveUrl: 'https://drive.google.com/file/d/1gdrive-dsa-avl-01/view',
    createdAt: '2026-08-10',
    updatedAt: '2026-08-12'
  },
  {
    id: 'note-2',
    title: 'Quick Revision Sheet — Dynamic Programming Patterns',
    description: 'Summary of the 5 main DP patterns: 0/1 Knapsack, Longest Common Subsequence, Matrix Chain Multiplication, Interval DP, and Tree DP.',
    subjectId: 'sub-1',
    semester: 4,
    category: 'notes',
    fileType: 'text',
    fileName: 'DP_Patterns_Revision.md',
    contentText: `# Dynamic Programming Core Patterns

## 1. 0/1 Knapsack Pattern
- State: \`dp[i][w]\` = max value considering first \`i\` items with weight capacity \`w\`.
- Recurrence:
  \`\`\`cpp
  if (weights[i-1] <= w)
      dp[i][w] = max(val[i-1] + dp[i-1][w - weights[i-1]], dp[i-1][w]);
  else
      dp[i][w] = dp[i-1][w];
  \`\`\`
- Space Optimization: Can be reduced to 1D array by traversing backwards from \`W\` down to \`weights[i-1]\`.

## 2. Longest Common Subsequence (LCS)
- State: \`dp[i][j]\` = length of LCS of \`s1[0..i-1]\` and \`s2[0..j-1]\`.
- Base case: \`dp[0][j] = dp[i][0] = 0\`.
- Recurrence:
  \`\`\`cpp
  if (s1[i-1] == s2[j-1])
      dp[i][j] = 1 + dp[i-1][j-1];
  else
      dp[i][j] = max(dp[i-1][j], dp[i][j-1]);
  \`\`\`
`,
    tags: ['algorithms', 'dp', 'revision', 'exam-prep'],
    isWrittenNote: true,
    createdAt: '2026-08-14',
    updatedAt: '2026-08-17'
  },
  {
    id: 'note-3',
    title: 'Operating Systems — Process Synchronization & Deadlocks',
    description: 'Lecture slides covering Peterson\'s solution, Bakery algorithm, Mutex locks, Semaphores, and Banker\'s Deadlock Avoidance Algorithm.',
    subjectId: 'sub-2',
    semester: 4,
    category: 'presentations',
    fileType: 'pptx',
    fileSize: '5.8 MB',
    fileName: 'OS_Module2_Concurrency_Bankers.pptx',
    tags: ['os', 'synchronization', 'deadlocks', 'semaphores'],
    isWrittenNote: false,
    gdriveId: 'gdrive-os-slides-02',
    gdriveUrl: 'https://drive.google.com/file/d/1gdrive-os-slides-02/view',
    createdAt: '2026-08-08',
    updatedAt: '2026-08-08'
  },
  {
    id: 'note-4',
    title: 'DBMS Assignment 2 — Complex SQL & Normalization Solutions',
    description: 'Submitted solutions for BCNF decomposition proofs, multivalued dependencies, and nested subquery optimization with relational algebra diagrams.',
    subjectId: 'sub-3',
    semester: 4,
    category: 'assignments',
    fileType: 'pdf',
    fileSize: '1.8 MB',
    fileName: 'DBMS_Assignment_2_Solutions.pdf',
    tags: ['dbms', 'sql', 'bcnf', 'assignment'],
    isWrittenNote: false,
    gdriveId: 'gdrive-dbms-a2',
    gdriveUrl: 'https://drive.google.com/file/d/1gdrive-dbms-a2/view',
    createdAt: '2026-08-15',
    updatedAt: '2026-08-15'
  },
  {
    id: 'note-5',
    title: 'Computer Networks — Subnetting & CIDR Calculation Cheatsheet',
    description: 'Step-by-step formula for subnet mask calculation, wildcard masks, usable host ranges, and broadcast address determination.',
    subjectId: 'sub-4',
    semester: 4,
    category: 'notes',
    fileType: 'pdf',
    fileSize: '890 KB',
    fileName: 'CN_Subnetting_Cheatsheet.pdf',
    tags: ['networks', 'ip-addressing', 'subnetting', 'cheatsheet'],
    isWrittenNote: false,
    createdAt: '2026-08-05',
    updatedAt: '2026-08-05'
  },
  {
    id: 'note-6',
    title: 'Previous Years Mid-Sem Question Papers (2022-2025)',
    description: 'Compiled past 3 years mid-semester question papers for Discrete Mathematics with marked high-frequency questions.',
    subjectId: 'sub-5',
    semester: 4,
    category: 'pyqs',
    fileType: 'pdf',
    fileSize: '4.2 MB',
    fileName: 'Discrete_Math_PYQ_Midsem.pdf',
    tags: ['pyq', 'discrete-math', 'past-papers', 'midsem'],
    isWrittenNote: false,
    createdAt: '2026-08-02',
    updatedAt: '2026-08-02'
  }
];

export const initialEvents: AcademicEvent[] = [
  {
    id: 'ev-1',
    title: 'Data Structures & Algorithms Midterm Exam',
    date: '2026-09-14',
    time: '10:00 AM - 12:00 PM',
    type: 'exam',
    subjectId: 'sub-1',
    description: 'Covers Units 1 & 2: Trees, Heaps, Graph traversals, and Greedy algorithms. Room: Examination Hall A.',
    priority: 'high',
    completed: false
  },
  {
    id: 'ev-2',
    title: 'Operating Systems — Shell Implementation Project Submission',
    date: '2026-08-28',
    time: '11:59 PM',
    type: 'project',
    subjectId: 'sub-2',
    description: 'Submit GitHub repository with custom C shell supporting pipes (|), I/O redirection (<, >), and background processes (&).',
    priority: 'high',
    completed: false
  },
  {
    id: 'ev-3',
    title: 'DBMS Assignment 3 (ER Modeling & Normalization Proofs)',
    date: '2026-08-25',
    time: '05:00 PM',
    type: 'assignment',
    subjectId: 'sub-3',
    description: 'Submit PDF on portal and handwritten relational schema normalization to 3NF/BCNF.',
    priority: 'medium',
    completed: false
  },
  {
    id: 'ev-4',
    title: 'Computer Networks Packet Tracer Lab Evaluation',
    date: '2026-09-02',
    time: '02:00 PM',
    type: 'exam',
    subjectId: 'sub-4',
    description: 'Practical evaluation on OSPF routing configuration and VLAN tagging.',
    priority: 'medium',
    completed: false
  },
  {
    id: 'ev-5',
    title: 'Annual Technical Symposium (HackSync 2026)',
    date: '2026-09-26',
    endDate: '2026-09-27',
    type: 'event',
    description: 'College-wide 36-hour hackathon and competitive programming event.',
    priority: 'low',
    completed: false
  }
];

export const initialAttendanceRecords: AttendanceRecord[] = [
  // Today or recent dates
  { id: 'rec-1', subjectId: 'sub-1', date: '2026-08-18', timeSlot: '09:00 - 10:00', status: 'present', updatedAt: '2026-08-18T09:05:00' },
  { id: 'rec-2', subjectId: 'sub-2', date: '2026-08-18', timeSlot: '10:15 - 11:15', status: 'absent', note: 'Missed due to campus placement orientation', updatedAt: '2026-08-18T11:20:00' },
  { id: 'rec-3', subjectId: 'sub-3', date: '2026-08-18', timeSlot: '11:30 - 12:30', status: 'present', updatedAt: '2026-08-18T12:00:00' },
  { id: 'rec-4', subjectId: 'sub-6', date: '2026-08-18', timeSlot: '14:00 - 16:00', status: 'present', updatedAt: '2026-08-18T15:30:00' }
];

export const initialExtractionMetrics: import('../types').ExtractionMetricRecord[] = [
  {
    id: 'met-1',
    fileName: 'CSE_Sem4_Official_Schedule.xlsx',
    format: 'excel',
    target: 'timetable',
    timestamp: '2026-08-20T10:15:00Z',
    success: true,
    confidenceScore: 99,
    itemsExtracted: 22,
    processingTimeMs: 1120,
    fileSize: '48 KB',
    notes: 'Flawless grid mapping. All 6 days and subjects detected with exact classroom labels.',
    detectedFields: {
      slotsCount: 22,
      subjectsCount: 6,
      hasRoomNumbers: true,
      hasFacultyNames: true
    }
  },
  {
    id: 'met-2',
    fileName: 'University_Academic_Calendar_2026.pdf',
    format: 'pdf',
    target: 'academic_calendar',
    timestamp: '2026-08-18T14:30:00Z',
    success: true,
    confidenceScore: 96,
    itemsExtracted: 18,
    processingTimeMs: 1480,
    fileSize: '312 KB',
    notes: 'Extracted mid-term and end-term exam dates, holiday weeks, and registration windows.',
    detectedFields: {
      holidaysCount: 12,
      eventsCount: 6,
      hasDateRanges: true
    }
  },
  {
    id: 'met-3',
    fileName: 'Department_Holiday_Circular_EvenSem.pdf',
    format: 'pdf',
    target: 'holiday_list',
    timestamp: '2026-08-15T09:00:00Z',
    success: true,
    confidenceScore: 94,
    itemsExtracted: 14,
    processingTimeMs: 1350,
    fileSize: '185 KB',
    notes: 'Detected national holidays and institutional recess dates accurately.',
    detectedFields: {
      holidaysCount: 14,
      hasDateRanges: false
    }
  },
  {
    id: 'met-4',
    fileName: 'Timetable_Noticeboard_CamScan.jpg',
    format: 'image',
    target: 'timetable',
    timestamp: '2026-08-12T16:45:00Z',
    success: true,
    confidenceScore: 88,
    itemsExtracted: 20,
    processingTimeMs: 2240,
    fileSize: '1.8 MB',
    notes: 'OCR processed noticeboard photo. Handled slight perspective tilt with 88% confidence.',
    warnings: ['Minor glare on Friday afternoon column resolved via neural contrast compensation.'],
    detectedFields: {
      slotsCount: 20,
      subjectsCount: 6,
      hasRoomNumbers: true
    }
  },
  {
    id: 'met-5',
    fileName: 'Batch_B_Elective_Slots.csv',
    format: 'csv',
    target: 'timetable',
    timestamp: '2026-08-10T11:20:00Z',
    success: true,
    confidenceScore: 98,
    itemsExtracted: 16,
    processingTimeMs: 890,
    fileSize: '14 KB',
    notes: 'Pure CSV tabular stream parsed with zero formatting ambiguity.',
    detectedFields: {
      slotsCount: 16,
      subjectsCount: 4,
      hasFacultyNames: true
    }
  },
  {
    id: 'met-6',
    fileName: 'Pasted_Dean_Circular_Text.txt',
    format: 'text',
    target: 'academic_calendar',
    timestamp: '2026-08-08T08:10:00Z',
    success: true,
    confidenceScore: 92,
    itemsExtracted: 9,
    processingTimeMs: 760,
    fileSize: '3 KB',
    notes: 'Extracted exam schedule milestones from raw announcement email text.',
    detectedFields: {
      eventsCount: 9,
      hasDateRanges: true
    }
  }
];

export const initialSemesterMilestones: SemesterMilestone[] = [
  {
    id: 'ms-1',
    title: 'Mid-Semester Attendance Audit (75% Statutory Checkpoint)',
    category: 'attendance',
    targetDate: '2026-08-30',
    targetMetric: 'Maintain >= 75% in all registered courses',
    priority: 'high',
    completed: true,
    completedAt: '2026-08-30T10:00:00Z',
    notes: 'Official semester check completed. OS flagged for recovery attendance.'
  },
  {
    id: 'ms-2',
    title: 'OS Shell Project — Architecture & Redirection',
    category: 'project',
    targetDate: '2026-08-28',
    subjectId: 'sub-2',
    targetMetric: 'Code submission on GitHub + test suite',
    priority: 'high',
    completed: true,
    completedAt: '2026-08-28T19:30:00Z',
    notes: 'Pipes and I/O redirection implemented and validated.'
  },
  {
    id: 'ms-3',
    title: 'DBMS Assignment 3 Normalization Solutions',
    category: 'assignment',
    targetDate: '2026-08-25',
    subjectId: 'sub-3',
    targetMetric: 'Submission score >= 90%',
    priority: 'medium',
    completed: true,
    completedAt: '2026-08-25T16:00:00Z',
    notes: 'BCNF decomposition proofs submitted to portal.'
  },
  {
    id: 'ms-4',
    title: 'Computer Networks Packet Tracer Lab Viva & Topology Evaluation',
    category: 'exam',
    targetDate: '2026-09-02',
    subjectId: 'sub-4',
    targetMetric: 'Target Grade A (>= 85%)',
    priority: 'high',
    completed: false,
    notes: 'Review OSPF multi-area routing and VLAN configurations.'
  },
  {
    id: 'ms-5',
    title: 'Data Structures & Algorithms Midterm Theory Exam',
    category: 'exam',
    targetDate: '2026-09-14',
    subjectId: 'sub-1',
    targetMetric: 'Target: 45 / 50 Marks',
    priority: 'high',
    completed: false,
    notes: 'Units 1 & 2: Trees, AVL, Heaps, Graph traversals & DP.'
  },
  {
    id: 'ms-6',
    title: 'Elevate OS Attendance to Safe 75% Statutory Buffer',
    category: 'attendance',
    targetDate: '2026-09-20',
    subjectId: 'sub-2',
    targetMetric: 'Attend 6 consecutive lectures without absence',
    priority: 'high',
    completed: false,
    notes: 'Currently at 70%. Need 6 consecutive sessions to cross statutory 75%.'
  },
  {
    id: 'ms-7',
    title: 'Semester 4 Final SGPA Target Achievement',
    category: 'academic',
    targetDate: '2026-11-20',
    targetMetric: 'Cumulative SGPA >= 8.8',
    priority: 'medium',
    completed: false,
    notes: 'Maintain distinction targets across all core subjects and laboratory units.'
  }
];

export const sampleDemoAppState: AppState = {
  profile: {
    name: 'Aarav Sharma',
    email: 'aarav.sharma@university.edu',
    university: 'National Institute of Technology',
    department: 'Computer Science & Engineering',
    semester: 4,
    section: 'CS-B',
    rollNumber: '2024CSB1042',
    defaultAttendanceThreshold: 75
  },
  subjects: initialSubjects,
  attendanceRecords: initialAttendanceRecords,
  timetableSlots: initialTimetableSlots,
  replacementDays: initialReplacementDays,
  holidays: initialHolidays,
  facultyLeaves: initialFacultyLeaves,
  notes: initialNotes,
  events: initialEvents,
  aiSettings: {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    apiKey: ''
  },
  googleDriveSettings: {
    connected: true,
    accountEmail: 'aarav.sharma@university.edu',
    accountName: 'Aarav Sharma',
    rootFolder: 'Syncademic Vault',
    autoSync: true,
    lastSynced: '2026-08-19T06:30:00'
  },
  isAuthenticated: true,
  semesterStartDate: '2026-07-15',
  semesterEndDate: '2026-11-30',
  extractionMetrics: initialExtractionMetrics,
  semesterMilestones: initialSemesterMilestones
};

export const cleanInitialAppState: AppState = {
  profile: {
    name: '',
    email: '',
    university: '',
    department: '',
    semester: 1,
    section: '',
    rollNumber: '',
    defaultAttendanceThreshold: 75
  },
  subjects: [],
  attendanceRecords: [],
  timetableSlots: [],
  replacementDays: [],
  holidays: initialHolidays,
  facultyLeaves: [],
  notes: [],
  events: [],
  aiSettings: {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    apiKey: ''
  },
  googleDriveSettings: {
    connected: false,
    accountEmail: '',
    accountName: '',
    rootFolder: 'Syncademic Vault',
    autoSync: false
  },
  isAuthenticated: false,
  semesterStartDate: '',
  semesterEndDate: '',
  extractionMetrics: initialExtractionMetrics,
  semesterMilestones: []
};

export const initialAppState: AppState = cleanInitialAppState;
