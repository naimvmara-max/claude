// A calendar file (.ics) for a booked meeting: opening it adds the meeting to Outlook, Google
// Calendar or Apple Calendar, whichever is on the computer. Times are local (Sweden and Norway
// share a time zone). No guests, so nothing is sent to anyone.

const pad = (n) => String(n).padStart(2, '0');
const stamp = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const text = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => `\\${c}`);

/** @param {{title:string, date:string, time:string, minutes?:number, description?:string, uid?:string}} m */
export function meetingIcs(m) {
  const start = new Date(`${m.date}T${m.time || '09:00'}:00`);
  const end = new Date(start.getTime() + (m.minutes || 30) * 60000);
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Jarvis//Agentic OS//SV', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${m.uid || `${stamp(start)}-${Math.random().toString(36).slice(2)}@jarvis`}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${text(m.title)}`,
    `DESCRIPTION:${text(m.description)}`,
    'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', `DESCRIPTION:${text(m.title)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}

/** Hand the file to the browser; opening it adds the meeting to the calendar. */
export function downloadIcs(name, ics) {
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
