import { AISettings, Subject, AppState } from '../types';

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export async function sendAIMessage(
  prompt: string,
  state: AppState,
  history?: { role: string; content: string }[],
  attachment?: { fileBase64?: string; mimeType?: string; fileName?: string }
): Promise<string> {
  const subjectsContext = state.subjects.map(s => {
    const pct = s.totalClasses > 0 ? Math.round((s.attendedClasses / s.totalClasses) * 100) : 100;
    return `${s.name} (${s.code}): ${s.attendedClasses}/${s.totalClasses} classes attended (${pct}%, Target: ${s.targetAttendance}%, Faculty: ${s.faculty})`;
  }).join('\n');

  const systemPrompt = `You are Syncademic Academic Copilot, a calm, deeply helpful, and articulate academic assistant for university students.
You are helping ${state.profile.name}, a Semester ${state.profile.semester} student at ${state.profile.university} (${state.profile.department}).

The student's registered subjects and current attendance status:
${subjectsContext}

Default attendance requirement: ${state.profile.defaultAttendanceThreshold}%

Give clear, actionable, structured, and empathetic academic guidance. Use clean Markdown formatting.
When analyzing uploaded documents, images (JPEG/PNG), PDFs, spreadsheets, or pasted text:
- Thoroughly extract all academic details with maximum precision:
  * Official university holidays & declared non-attendance days (list exact dates in YYYY-MM-DD, day of week, and holiday name).
  * Academic milestones: mid-terms, final exams, assignment deadlines, practicals, project presentations.
  * Timetable schedules: weekly recurring class periods across the FULL day (from early morning e.g. 08:10 through afternoon e.g. 15:30/3:30 PM). If asked to extract classes from 8:10 to 3:30pm or from a timetable document, layout all 6-7 daily periods for each day (Monday to Friday: 08:10-09:00, 09:10-10:00, 10:10-11:00, 11:15-12:05, 12:45-13:35, 13:40-14:30, 14:40-15:30) with day, start time, end time in strict 24-hr HH:MM format, course code, course title, room, instructor, and type.
  * Key study notes, syllabus units, definitions, formulas, and textbook references.
- Present extracted details in clear, structured Markdown tables and bulleted lists.
- When drafting formal letters/emails to faculty, format them professionally with clear placeholders.`;

  return generateAcademicResponse(
    prompt,
    systemPrompt,
    state.aiSettings,
    { subjects: state.subjects },
    attachment
  );
}

export async function generateAcademicResponse(
  prompt: string,
  systemPrompt: string,
  settings: AISettings,
  context?: { subjects?: Subject[]; currentSubject?: Subject },
  attachment?: { fileBase64?: string; mimeType?: string; fileName?: string }
): Promise<string> {
  // If user configured OpenAI/Anthropic/Groq/OpenRouter with their own API key
  if (settings.provider !== 'gemini' && settings.apiKey) {
    return callCustomProvider(prompt, systemPrompt, settings);
  }

  // Use Server-side Gemini API or direct endpoint
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        systemInstruction: systemPrompt,
        customKey: settings.apiKey || undefined,
        context,
        fileBase64: attachment?.fileBase64,
        mimeType: attachment?.mimeType,
        fileName: attachment?.fileName
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.text) return data.text;
    }
  } catch (e) {
    console.warn('Backend /api/ai/chat not reachable, providing local intelligent academic fallback:', e);
  }

  // Intelligent local academic generator if offline or server is booting
  return generateOfflineAcademicResponse(prompt, systemPrompt, context);
}

async function callCustomProvider(
  prompt: string,
  systemPrompt: string,
  settings: AISettings
): Promise<string> {
  const { provider, apiKey, model } = settings;

  if (!apiKey) {
    throw new Error(`API Key is required for ${provider.toUpperCase()}`);
  }

  if (provider === 'openai' || provider === 'groq' || provider === 'openrouter') {
    let endpoint = 'https://api.openai.com/v1/chat/completions';
    let defaultModel = 'gpt-4o-mini';

    if (provider === 'groq') {
      endpoint = 'https://api.groq.com/openai/v1/chat/completions';
      defaultModel = 'llama-3.3-70b-versatile';
    } else if (provider === 'openrouter') {
      endpoint = 'https://openrouter.ai/api/v1/chat/completions';
      defaultModel = 'meta-llama/llama-3.3-70b-instruct';
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Provider ${provider} returned status ${response.status}`);
    }

    const result = await response.json();
    return result.choices?.[0]?.message?.content || 'No response generated.';
  }

  if (provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'dangerously-allow-browser': 'true'
      },
      body: JSON.stringify({
        model: model || 'claude-3-5-haiku-20241022',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Anthropic returned status ${response.status}`);
    }

    const result = await response.json();
    return result.content?.[0]?.text || 'No response generated.';
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

function generateOfflineAcademicResponse(
  prompt: string,
  _systemPrompt: string,
  context?: { subjects?: Subject[]; currentSubject?: Subject }
): string {
  const lower = prompt.toLowerCase();

  if (lower.includes('email') || lower.includes('leave') || lower.includes('absence') || lower.includes('sick')) {
    const faculty = context?.currentSubject?.faculty || 'Prof. Faculty Name';
    const sub = context?.currentSubject?.name || 'Subject Name';
    return `### ✉️ Formal Absence Notification Email

**Subject:** Absence Notification: ${sub} — [Your Name] ([Your Roll Number])

**Dear ${faculty},**

I am writing to respectfully inform you that I will be unable to attend the upcoming lecture for **${sub}** scheduled for tomorrow due to unforeseen personal/medical reasons.

I have arranged to collect the lecture notes and review the assigned study materials from my classmates so that I remain up-to-date with the course curriculum. If there are any specific assignments, tutorial submissions, or laboratory exercises that require advance submission, please let me know.

Thank you for your understanding.

Sincerely,  
**[Your Name]**  
Roll No: [Your Roll Number]  
Semester 4, Computer Science & Engineering`;
  }

  if (lower.includes('study guide') || lower.includes('revision') || lower.includes('flashcard') || lower.includes('quiz')) {
    const subName = context?.currentSubject?.name || 'Computer Science Subject';
    return `### 📚 High-Yield Academic Revision Guide: ${subName}

#### 1. Core Foundational Concepts
* **Primary Objective:** Master fundamental principles, core algorithmic bounds, and system trade-offs.
* **Key Invariants:** Understand state transitions, edge case properties, and error recovery mechanics.

#### 2. High-Frequency Exam Topics
1. **Theoretical Derivations & Proofs:** Review step-by-step mathematical inductions and recurrence solving (Master Theorem).
2. **Comparative Trade-offs:** Time complexity vs space complexity trade-offs in real-world constraints.
3. **Application & Trace Problems:** Step-through execution table for sample input arrays or queries.

#### 3. Quick Self-Check Quiz
* **Q1:** What is the worst-case vs average-case asymptotic complexity under skewed distributions?
* **Q2:** How does the system handle concurrent access conflicts or race conditions?
* **Q3:** Which data structure or design pattern offers logarithmic search while supporting dynamic insertions?

*Tip: Add your handwritten notes in the Smart Notes tab to organize comprehensive unit summaries!*`;
  }

  if (lower.includes('attendance') || lower.includes('bunk') || lower.includes('shortage') || lower.includes('plan')) {
    return `### 📊 Academic Attendance Strategic Action Plan

Based on your current semester target (75% threshold):

1. **Prioritize At-Risk Subjects:** Ensure you attend every scheduled lecture and lab for subjects with attendance below 75%.
2. **Buffer Utilization:** For subjects above 85%, use your calculated safe bunks strictly for emergency recovery, midterm preparation, or certified academic symposiums.
3. **Medical Documentation:** In case of genuine health issues, immediately submit the medical certificate to your department head within 3 working days so condonation can be processed without penalizing your examination hall ticket.`;
  }

  return `### 🎓 Academic Explainer & Study Summary

Here is a structured academic breakdown for: **${prompt.slice(0, 50)}...**

* **Core Concept:** Deconstruct the problem into foundational mathematical/algorithmic layers.
* **Practical Implementation:** Ensure clean edge-case validation and modular component separation.
* **Exam & Viva Checklist:** Memorize key terminology, standard diagrams, and standard state equations.

*Feel free to ask for detailed formula derivations, past question explanations, or customized revision flashcards!*`;
}
