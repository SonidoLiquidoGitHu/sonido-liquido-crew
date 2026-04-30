"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Music,
  Mic2,
  StickyNote,
  Plus,
  X,
  Loader2,
  Clock,
  MapPin,
  ExternalLink,
  Trash2,
  Edit,
  Save,
  AlertTriangle,
  Bell,
  Lightbulb,
  CheckSquare,
  CalendarDays,
  CalendarRange,
  Download,
  Mail,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Release {
  id: string;
  title: string;
  type: string;
  releaseDate: string;
  artistName?: string;
  coverImageUrl?: string;
}

interface Event {
  id: string;
  title: string;
  eventDate: string;
  venue?: string;
  city?: string;
  status: string;
}

interface CalendarNote {
  id: string;
  date: string;
  content: string;
  color: string;
  category: "note" | "urgent" | "reminder" | "task" | "idea";
  completed?: boolean;
  reminderEmail?: string;
  reminderSent?: boolean;
  createdAt: string;
}

interface DayData {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  releases: Release[];
  events: Event[];
  notes: CalendarNote[];
}

const NOTE_CATEGORIES = [
  { value: "note", label: "Nota", icon: StickyNote, color: "orange" },
  { value: "urgent", label: "Urgente", icon: AlertTriangle, color: "red" },
  { value: "reminder", label: "Recordatorio", icon: Bell, color: "blue" },
  { value: "task", label: "Tarea", icon: CheckSquare, color: "green" },
  { value: "idea", label: "Idea", icon: Lightbulb, color: "yellow" },
] as const;

const NOTE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  orange: { bg: "bg-orange-500/20", border: "border-orange-500/50", text: "text-orange-400" },
  red: { bg: "bg-red-500/20", border: "border-red-500/50", text: "text-red-400" },
  blue: { bg: "bg-blue-500/20", border: "border-blue-500/50", text: "text-blue-400" },
  green: { bg: "bg-green-500/20", border: "border-green-500/50", text: "text-green-400" },
  yellow: { bg: "bg-yellow-500/20", border: "border-yellow-500/50", text: "text-yellow-400" },
  purple: { bg: "bg-purple-500/20", border: "border-purple-500/50", text: "text-purple-400" },
  pink: { bg: "bg-pink-500/20", border: "border-pink-500/50", text: "text-pink-400" },
};

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const WEEKDAYS_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

type ViewMode = "month" | "week";

export function CalendarDashboard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [releases, setReleases] = useState<Release[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [notes, setNotes] = useState<CalendarNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteCategory, setNewNoteCategory] = useState<CalendarNote["category"]>("note");
  const [newNoteReminderEmail, setNewNoteReminderEmail] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [editingNote, setEditingNote] = useState<CalendarNote | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [showExportModal, setShowExportModal] = useState(false);

  // Load notes from localStorage
  useEffect(() => {
    const savedNotes = localStorage.getItem("calendar-notes");
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (e) {
        console.error("Error loading notes:", e);
      }
    }
  }, []);

  // Save notes to localStorage
  const saveNotesToStorage = (updatedNotes: CalendarNote[]) => {
    localStorage.setItem("calendar-notes", JSON.stringify(updatedNotes));
    setNotes(updatedNotes);
  };

  // Fetch releases and events
  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch releases
      const releasesRes = await fetch("/api/releases?pageSize=100");
      const releasesData = await releasesRes.json();
      if (releasesData.success) {
        const items = releasesData.data?.items || releasesData.data || [];
        setReleases(items);
      }

      // Fetch upcoming releases
      const upcomingRes = await fetch("/api/upcoming-releases");
      const upcomingData = await upcomingRes.json();
      if (upcomingData.success && upcomingData.data) {
        const upcomingReleases = upcomingData.data.map((r: any) => ({
          id: r.id,
          title: r.title,
          type: r.type || "upcoming",
          releaseDate: r.releaseDate,
          artistName: r.artistName,
          coverImageUrl: r.coverImageUrl,
        }));
        setReleases((prev) => [...prev, ...upcomingReleases]);
      }

      // Fetch events
      const eventsRes = await fetch("/api/events");
      const eventsData = await eventsRes.json();
      if (eventsData.success) {
        setEvents(eventsData.data || []);
      }
    } catch (error) {
      console.error("Error fetching calendar data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Generate calendar days for month view
  const generateMonthDays = (): DayData[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDayOfMonth.getDay();

    const days: DayData[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Previous month days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push(createDayData(date, false, today));
    }

    // Current month days
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const date = new Date(year, month, day);
      days.push(createDayData(date, true, today));
    }

    // Next month days to fill the grid
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push(createDayData(date, false, today));
    }

    return days;
  };

  // Generate week days
  const generateWeekDays = (): DayData[] => {
    const days: DayData[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get start of week (Sunday)
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(createDayData(date, true, today));
    }

    return days;
  };

  const createDayData = (date: Date, isCurrentMonth: boolean, today: Date): DayData => {
    const dateStr = formatDateString(date);

    const dayReleases = releases.filter((r) => {
      const releaseDate = new Date(r.releaseDate);
      return formatDateString(releaseDate) === dateStr;
    });

    const dayEvents = events.filter((e) => {
      const eventDate = new Date(e.eventDate);
      return formatDateString(eventDate) === dateStr;
    });

    const dayNotes = notes.filter((n) => n.date === dateStr);

    return {
      date,
      isCurrentMonth,
      isToday: date.getTime() === today.getTime(),
      releases: dayReleases,
      events: dayEvents,
      notes: dayNotes,
    };
  };

  const formatDateString = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  const goToPreviousMonth = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
    }
  };

  const goToNextMonth = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get category info
  const getCategoryInfo = (category: CalendarNote["category"]) => {
    return NOTE_CATEGORIES.find((c) => c.value === category) || NOTE_CATEGORIES[0];
  };

  // Add/Update note
  const handleAddNote = async () => {
    if (!selectedDay || !newNoteContent.trim()) return;

    setSavingNote(true);

    const categoryInfo = getCategoryInfo(newNoteCategory);
    const newNote: CalendarNote = {
      id: editingNote?.id || `note-${Date.now()}`,
      date: formatDateString(selectedDay),
      content: newNoteContent.trim(),
      color: categoryInfo.color,
      category: newNoteCategory,
      completed: editingNote?.completed || false,
      reminderEmail: newNoteReminderEmail.trim() || undefined,
      reminderSent: editingNote?.reminderSent || false,
      createdAt: editingNote?.createdAt || new Date().toISOString(),
    };

    // Send reminder email if configured
    if (newNoteReminderEmail.trim() && !editingNote?.reminderSent) {
      try {
        await fetch("/api/admin/calendar/send-reminder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: newNoteReminderEmail.trim(),
            date: newNote.date,
            content: newNote.content,
            category: newNote.category,
          }),
        });
        newNote.reminderSent = true;
      } catch (e) {
        console.error("Error sending reminder:", e);
      }
    }

    if (editingNote) {
      const updatedNotes = notes.map((n) => (n.id === editingNote.id ? newNote : n));
      saveNotesToStorage(updatedNotes);
    } else {
      saveNotesToStorage([...notes, newNote]);
    }

    resetNoteForm();
    setSavingNote(false);
  };

  const resetNoteForm = () => {
    setNewNoteContent("");
    setNewNoteCategory("note");
    setNewNoteReminderEmail("");
    setShowNoteModal(false);
    setEditingNote(null);
  };

  // Toggle task completion
  const toggleTaskCompletion = (noteId: string) => {
    const updatedNotes = notes.map((n) =>
      n.id === noteId ? { ...n, completed: !n.completed } : n
    );
    saveNotesToStorage(updatedNotes);
  };

  // Delete note
  const handleDeleteNote = (noteId: string) => {
    const updatedNotes = notes.filter((n) => n.id !== noteId);
    saveNotesToStorage(updatedNotes);
  };

  // Edit note
  const handleEditNote = (note: CalendarNote) => {
    setEditingNote(note);
    setNewNoteContent(note.content);
    setNewNoteCategory(note.category);
    setNewNoteReminderEmail(note.reminderEmail || "");
    setSelectedDay(new Date(note.date));
    setShowNoteModal(true);
  };

  const openAddNoteModal = (date: Date) => {
    setSelectedDay(date);
    setEditingNote(null);
    setNewNoteContent("");
    setNewNoteCategory("note");
    setNewNoteReminderEmail("");
    setShowNoteModal(true);
  };

  const getColorClasses = (colorName: string) => {
    return NOTE_COLORS[colorName] || NOTE_COLORS.orange;
  };

  // Generate Google Calendar URL
  const generateGoogleCalendarUrl = (item: { title: string; date: string; description?: string; location?: string }) => {
    const startDate = new Date(item.date);
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 2);

    const formatGoogleDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: item.title,
      dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
      details: item.description || "",
      location: item.location || "",
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  // Export to ICS
  const exportToICS = () => {
    const icsEvents: string[] = [];

    // Add releases
    releases.forEach((release) => {
      const date = new Date(release.releaseDate);
      icsEvents.push(createICSEvent({
        uid: `release-${release.id}`,
        title: `🎵 Lanzamiento: ${release.title}`,
        date,
        description: `Lanzamiento de ${release.artistName || "Sonido Líquido"}`,
      }));
    });

    // Add events
    events.forEach((event) => {
      const date = new Date(event.eventDate);
      icsEvents.push(createICSEvent({
        uid: `event-${event.id}`,
        title: `🎤 ${event.title}`,
        date,
        description: `Evento en ${event.venue || ""}, ${event.city || ""}`,
        location: `${event.venue || ""}, ${event.city || ""}`,
      }));
    });

    // Add notes
    notes.forEach((note) => {
      const date = new Date(note.date);
      const categoryInfo = getCategoryInfo(note.category);
      icsEvents.push(createICSEvent({
        uid: note.id,
        title: `📝 ${categoryInfo.label}: ${note.content.slice(0, 50)}`,
        date,
        description: note.content,
      }));
    });

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Sonido Líquido Crew//Calendar//ES
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Sonido Líquido Crew
${icsEvents.join("\n")}
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sonido-liquido-calendario-${formatDateString(new Date())}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  const createICSEvent = ({ uid, title, date, description, location }: {
    uid: string;
    title: string;
    date: Date;
    description?: string;
    location?: string;
  }) => {
    const formatICSDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const endDate = new Date(date);
    endDate.setHours(endDate.getHours() + 2);

    return `BEGIN:VEVENT
UID:${uid}@sonidoliquido.com
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(date)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${title.replace(/,/g, "\\,")}
DESCRIPTION:${(description || "").replace(/\n/g, "\\n").replace(/,/g, "\\,")}
${location ? `LOCATION:${location.replace(/,/g, "\\,")}` : ""}
END:VEVENT`;
  };

  const calendarDays = viewMode === "month" ? generateMonthDays() : generateWeekDays();

  // Get upcoming items for the sidebar (next 30 days)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(today.getDate() + 30);

  const upcomingReleases = releases
    .filter((r) => {
      const date = new Date(r.releaseDate);
      return date >= today && date <= thirtyDaysLater;
    })
    .sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime());

  const upcomingEvents = events
    .filter((e) => {
      const date = new Date(e.eventDate);
      return date >= today && date <= thirtyDaysLater;
    })
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

  const upcomingNotes = notes
    .filter((n) => {
      const date = new Date(n.date);
      return date >= today && date <= thirtyDaysLater;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Group notes by category for sidebar
  const notesByCategory = useMemo(() => {
    const grouped: Record<string, CalendarNote[]> = {};
    upcomingNotes.forEach((note) => {
      if (!grouped[note.category]) grouped[note.category] = [];
      grouped[note.category].push(note);
    });
    return grouped;
  }, [upcomingNotes]);

  // Get week range text
  const getWeekRangeText = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const startMonth = startOfWeek.toLocaleDateString("es-MX", { month: "short" });
    const endMonth = endOfWeek.toLocaleDateString("es-MX", { month: "short" });
    const year = startOfWeek.getFullYear();

    if (startMonth === endMonth) {
      return `${startOfWeek.getDate()} - ${endOfWeek.getDate()} ${startMonth} ${year}`;
    }
    return `${startOfWeek.getDate()} ${startMonth} - ${endOfWeek.getDate()} ${endMonth} ${year}`;
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      {/* Calendar */}
      <div className="xl:col-span-3 bg-slc-card border border-slc-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slc-border">
          <div className="flex items-center gap-4">
            <h2 className="font-oswald text-xl uppercase flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              Calendario
            </h2>
            <span className="text-lg font-medium">
              {viewMode === "month"
                ? currentDate.toLocaleDateString("es-MX", { month: "long", year: "numeric" })
                : getWeekRangeText()}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Toggle */}
            <div className="flex bg-slc-dark rounded-lg p-1">
              <button
                onClick={() => setViewMode("month")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors ${
                  viewMode === "month" ? "bg-primary text-white" : "text-slc-muted hover:text-white"
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                Mes
              </button>
              <button
                onClick={() => setViewMode("week")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors ${
                  viewMode === "week" ? "bg-primary text-white" : "text-slc-muted hover:text-white"
                }`}
              >
                <CalendarRange className="w-4 h-4" />
                Semana
              </button>
            </div>

            <Button variant="outline" size="sm" onClick={() => setShowExportModal(true)}>
              <Download className="w-4 h-4 mr-1" />
              Exportar
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoy
            </Button>
            <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className={`grid border-b border-slc-border ${viewMode === "month" ? "grid-cols-7" : "grid-cols-7"}`}>
          {(viewMode === "week" ? WEEKDAYS_FULL : WEEKDAYS).map((day, idx) => (
            <div
              key={day}
              className={`py-2 text-center text-xs font-medium text-slc-muted uppercase ${
                viewMode === "week" ? "px-2" : ""
              }`}
            >
              {viewMode === "week" && calendarDays[idx] ? (
                <div>
                  <div>{day}</div>
                  <div className={`text-lg font-bold mt-1 ${calendarDays[idx].isToday ? "text-primary" : "text-white"}`}>
                    {calendarDays[idx].date.getDate()}
                  </div>
                </div>
              ) : (
                day
              )}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className={`grid ${viewMode === "month" ? "grid-cols-7" : "grid-cols-7"}`}>
            {calendarDays.map((day, index) => {
              const minHeight = viewMode === "week" ? "min-h-[300px]" : "min-h-[100px]";
              const maxItemsToShow = viewMode === "week" ? 10 : 3;

              return (
                <div
                  key={index}
                  className={`${minHeight} p-1 border-b border-r border-slc-border/50 group ${
                    !day.isCurrentMonth && viewMode === "month" ? "bg-slc-dark/30" : ""
                  } ${day.isToday ? "bg-primary/5" : ""}`}
                >
                  {/* Day number (month view only) */}
                  {viewMode === "month" && (
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`w-7 h-7 flex items-center justify-center text-sm rounded-full ${
                          day.isToday
                            ? "bg-primary text-white font-bold"
                            : day.isCurrentMonth
                            ? "text-white"
                            : "text-slc-muted/50"
                        }`}
                      >
                        {day.date.getDate()}
                      </span>
                      <button
                        onClick={() => openAddNoteModal(day.date)}
                        className="w-5 h-5 flex items-center justify-center rounded text-slc-muted hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Agregar nota"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Week view add button */}
                  {viewMode === "week" && (
                    <button
                      onClick={() => openAddNoteModal(day.date)}
                      className="w-full mb-2 py-1 flex items-center justify-center gap-1 rounded text-xs text-slc-muted hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Plus className="w-3 h-3" />
                      Agregar
                    </button>
                  )}

                  {/* Items */}
                  <div className={`space-y-1 overflow-y-auto ${viewMode === "week" ? "max-h-[260px]" : "max-h-[70px]"}`}>
                    {/* Releases */}
                    {day.releases.slice(0, maxItemsToShow).map((release) => (
                      <div
                        key={release.id}
                        className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/20 border border-green-500/30 rounded text-xs cursor-pointer hover:bg-green-500/30 transition-colors"
                        title={release.title}
                        onClick={() => window.open(generateGoogleCalendarUrl({
                          title: `🎵 ${release.title}`,
                          date: release.releaseDate,
                          description: `Lanzamiento: ${release.title}`,
                        }), "_blank")}
                      >
                        <Music className="w-3 h-3 text-green-500 flex-shrink-0" />
                        <span className="text-green-400 truncate">{release.title}</span>
                      </div>
                    ))}

                    {/* Events */}
                    {day.events.slice(0, maxItemsToShow).map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500/20 border border-red-500/30 rounded text-xs cursor-pointer hover:bg-red-500/30 transition-colors"
                        title={event.title}
                        onClick={() => window.open(generateGoogleCalendarUrl({
                          title: `🎤 ${event.title}`,
                          date: event.eventDate,
                          description: `Evento: ${event.title}`,
                          location: `${event.venue || ""}, ${event.city || ""}`,
                        }), "_blank")}
                      >
                        <Mic2 className="w-3 h-3 text-red-500 flex-shrink-0" />
                        <span className="text-red-400 truncate">{event.title}</span>
                      </div>
                    ))}

                    {/* Notes */}
                    {day.notes.slice(0, maxItemsToShow).map((note) => {
                      const colors = getColorClasses(note.color);
                      const categoryInfo = getCategoryInfo(note.category);
                      const CategoryIcon = categoryInfo.icon;

                      return (
                        <div
                          key={note.id}
                          className={`flex items-center gap-1 px-1.5 py-0.5 ${colors.bg} border ${colors.border} rounded text-xs cursor-pointer hover:opacity-80 transition-opacity ${
                            note.completed ? "opacity-50 line-through" : ""
                          }`}
                          title={note.content}
                          onClick={() => note.category === "task" ? toggleTaskCompletion(note.id) : handleEditNote(note)}
                        >
                          <CategoryIcon className={`w-3 h-3 ${colors.text} flex-shrink-0`} />
                          <span className={`${colors.text} truncate`}>{note.content}</span>
                          {note.reminderEmail && (
                            <Mail className="w-2.5 h-2.5 text-slc-muted flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}

                    {/* More indicator */}
                    {day.releases.length + day.events.length + day.notes.length > maxItemsToShow && (
                      <div className="text-xs text-slc-muted text-center">
                        +{day.releases.length + day.events.length + day.notes.length - maxItemsToShow} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 p-3 border-t border-slc-border text-xs text-slc-muted">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500/30 border border-green-500/50" />
            <span>Lanzamientos</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500/30 border border-red-500/50" />
            <span>Eventos</span>
          </div>
          {NOTE_CATEGORIES.map((cat) => (
            <div key={cat.value} className="flex items-center gap-1">
              <cat.icon className={`w-3 h-3 ${NOTE_COLORS[cat.color].text}`} />
              <span>{cat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Quick add note */}
        <div className="bg-slc-card border border-slc-border rounded-xl p-4">
          <h3 className="font-oswald text-sm uppercase mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            Agregar Nota
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {NOTE_CATEGORIES.map((cat) => (
              <Button
                key={cat.value}
                variant="outline"
                size="sm"
                className={`flex items-center gap-1 ${NOTE_COLORS[cat.color].text} border-current/30 hover:bg-current/10`}
                onClick={() => {
                  setNewNoteCategory(cat.value);
                  openAddNoteModal(new Date());
                }}
              >
                <cat.icon className="w-3 h-3" />
                {cat.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Upcoming releases */}
        <div className="bg-slc-card border border-slc-border rounded-xl p-4">
          <h3 className="font-oswald text-sm uppercase mb-3 flex items-center gap-2">
            <Music className="w-4 h-4 text-green-500" />
            Próximos Lanzamientos
          </h3>
          {upcomingReleases.length === 0 ? (
            <p className="text-sm text-slc-muted">No hay lanzamientos próximos</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {upcomingReleases.slice(0, 5).map((release) => (
                <div
                  key={release.id}
                  className="p-2 bg-slc-dark rounded-lg border border-slc-border/50 group cursor-pointer hover:border-green-500/30"
                  onClick={() => window.open(generateGoogleCalendarUrl({
                    title: release.title,
                    date: release.releaseDate,
                  }), "_blank")}
                >
                  <p className="text-sm font-medium truncate">{release.title}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-green-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(release.releaseDate).toLocaleDateString("es-MX", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                    <ExternalLink className="w-3 h-3 text-slc-muted opacity-0 group-hover:opacity-100" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming events */}
        <div className="bg-slc-card border border-slc-border rounded-xl p-4">
          <h3 className="font-oswald text-sm uppercase mb-3 flex items-center gap-2">
            <Mic2 className="w-4 h-4 text-red-500" />
            Próximos Eventos
          </h3>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-slc-muted">No hay eventos próximos</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {upcomingEvents.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className="p-2 bg-slc-dark rounded-lg border border-slc-border/50 group cursor-pointer hover:border-red-500/30"
                  onClick={() => window.open(generateGoogleCalendarUrl({
                    title: event.title,
                    date: event.eventDate,
                    location: `${event.venue}, ${event.city}`,
                  }), "_blank")}
                >
                  <p className="text-sm font-medium truncate">{event.title}</p>
                  <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {new Date(event.eventDate).toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                  {event.venue && (
                    <p className="text-xs text-slc-muted flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {event.venue}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes by category */}
        {Object.keys(notesByCategory).length > 0 && (
          <div className="bg-slc-card border border-slc-border rounded-xl p-4">
            <h3 className="font-oswald text-sm uppercase mb-3 flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-orange-500" />
              Notas Próximas
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {Object.entries(notesByCategory).map(([category, categoryNotes]) => {
                const categoryInfo = getCategoryInfo(category as CalendarNote["category"]);
                const colors = NOTE_COLORS[categoryInfo.color];
                const CategoryIcon = categoryInfo.icon;

                return (
                  <div key={category}>
                    <div className={`flex items-center gap-1 text-xs ${colors.text} mb-1`}>
                      <CategoryIcon className="w-3 h-3" />
                      {categoryInfo.label} ({categoryNotes.length})
                    </div>
                    <div className="space-y-1">
                      {categoryNotes.slice(0, 3).map((note) => (
                        <div
                          key={note.id}
                          className={`p-2 rounded-lg border ${colors.bg} ${colors.border} group relative ${
                            note.completed ? "opacity-50" : ""
                          }`}
                        >
                          <p className={`text-sm ${colors.text} ${note.completed ? "line-through" : ""}`}>
                            {note.content}
                          </p>
                          <p className="text-xs text-slc-muted flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            {new Date(note.date).toLocaleDateString("es-MX", {
                              day: "numeric",
                              month: "short",
                            })}
                            {note.reminderEmail && (
                              <span className="flex items-center gap-0.5 ml-2">
                                <Mail className="w-3 h-3" />
                                {note.reminderSent ? "Enviado" : "Pendiente"}
                              </span>
                            )}
                          </p>
                          <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {note.category === "task" && (
                              <button
                                onClick={() => toggleTaskCompletion(note.id)}
                                className="p-1 rounded hover:bg-slc-dark/50"
                                title={note.completed ? "Marcar pendiente" : "Marcar completada"}
                              >
                                <CheckSquare className={`w-3 h-3 ${note.completed ? "text-green-500" : "text-slc-muted"}`} />
                              </button>
                            )}
                            <button
                              onClick={() => handleEditNote(note)}
                              className="p-1 rounded hover:bg-slc-dark/50"
                            >
                              <Edit className="w-3 h-3 text-slc-muted" />
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="p-1 rounded hover:bg-red-500/20"
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-slc-card border border-slc-border rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-oswald text-lg uppercase">
                {editingNote ? "Editar Nota" : "Nueva Nota"}
              </h3>
              <Button variant="ghost" size="icon" onClick={resetNoteForm}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Date */}
              <div>
                <label className="text-xs text-slc-muted uppercase mb-1 block">Fecha</label>
                <input
                  type="date"
                  value={selectedDay ? formatDateString(selectedDay) : ""}
                  onChange={(e) => setSelectedDay(new Date(e.target.value))}
                  className="w-full px-3 py-2 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs text-slc-muted uppercase mb-2 block">Categoría</label>
                <div className="grid grid-cols-5 gap-2">
                  {NOTE_CATEGORIES.map((cat) => {
                    const colors = NOTE_COLORS[cat.color];
                    return (
                      <button
                        key={cat.value}
                        onClick={() => setNewNoteCategory(cat.value)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                          newNoteCategory === cat.value
                            ? `${colors.bg} ${colors.border} ${colors.text}`
                            : "border-slc-border text-slc-muted hover:border-slc-muted"
                        }`}
                      >
                        <cat.icon className="w-4 h-4" />
                        <span className="text-[10px]">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="text-xs text-slc-muted uppercase mb-1 block">Contenido</label>
                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Escribe tu nota aquí..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slc-dark border border-slc-border rounded-lg resize-none focus:outline-none focus:border-primary"
                />
              </div>

              {/* Email Reminder */}
              <div>
                <label className="text-xs text-slc-muted uppercase mb-1 block flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  Recordatorio por Email (opcional)
                </label>
                <input
                  type="email"
                  value={newNoteReminderEmail}
                  onChange={(e) => setNewNoteReminderEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full px-3 py-2 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                />
                <p className="text-xs text-slc-muted mt-1">
                  Se enviará un recordatorio al guardar la nota
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {editingNote && (
                  <Button
                    variant="outline"
                    className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                    onClick={() => {
                      handleDeleteNote(editingNote.id);
                      resetNoteForm();
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </Button>
                )}
                <Button
                  className="flex-1"
                  onClick={handleAddNote}
                  disabled={savingNote || !newNoteContent.trim()}
                >
                  {savingNote ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {editingNote ? "Guardar Cambios" : "Agregar Nota"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-slc-card border border-slc-border rounded-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-oswald text-lg uppercase">Exportar Calendario</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowExportModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={exportToICS}
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar archivo ICS
                <span className="text-xs text-slc-muted ml-auto">Apple, Outlook</span>
              </Button>

              <a
                href={`https://calendar.google.com/calendar/render?cid=webcal://${typeof window !== "undefined" ? window.location.host : ""}/api/calendar/ics`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-start w-full px-4 py-2 border border-slc-border rounded-lg hover:bg-slc-dark transition-colors"
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                Agregar a Google Calendar
                <ExternalLink className="w-3 h-3 ml-auto text-slc-muted" />
              </a>

              <p className="text-xs text-slc-muted text-center pt-2">
                El archivo ICS incluye todos los lanzamientos, eventos y notas
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
