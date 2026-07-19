"use client";
import { showAlert } from "@/utils/alert";

import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { teachingJournalsService } from "@/services/teaching-journals";
import { schedulesService } from "@/services/schedules";
import { classesService } from "@/services/classes";
import { subjectsService } from "@/services/subjects";
import type { TeachingJournal, Schedule, Class, Subject } from "@/types";
import { BookOpen, Plus, Calendar, ArrowLeft, Check, Info, Trash2, Edit2, Printer, FileText, Eye } from "lucide-react";
import { toast } from "sonner";
import { PrintHeader } from "@/components/PrintHeader";
import { cn, formatDate } from "@/lib/utils";

export default function MobileTeachingJournalsPage() {
  const searchParams = useSearchParams();

  // Mode & Tab states
  const [activeTab, setActiveTab] = useState<"journals" | "daily" | "monthly">("journals");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJournal, setEditingJournal] = useState<TeachingJournal | null>(null);
  const [detailJournal, setDetailJournal] = useState<TeachingJournal | null>(null);

  // Query Lookups
  const { data: rawJournals = [], isLoading: loadingJournals, refetch: refetchJournals } = useQuery<TeachingJournal[]>({ 
    queryKey: ["journals"],
    queryFn: () => teachingJournalsService.getAll(),
  });

  const { data: rawSchedules = [], isLoading: loadingSchedules } = useQuery<Schedule[]>({ 
    queryKey: ["schedules"],
    queryFn: () => schedulesService.getAll(),
  });

  const { data: classes = [], isLoading: loadingClasses } = useQuery<Class[]>({ 
    queryKey: ["classes"],
    queryFn: () => classesService.getAll(),
  });

  const { data: subjects = [], isLoading: loadingSubjects } = useQuery<Subject[]>({ 
    queryKey: ["subjects"],
    queryFn: () => subjectsService.getAll(),
  });

  const schedules = useMemo(() => {
    return rawSchedules.map((sched) => ({
      ...sched,
      class: classes.find((c) => c.id === sched.classId),
      subject: subjects.find((sub) => sub.id === sched.subjectId),
    }));
  }, [rawSchedules, classes, subjects]);

  const journals = useMemo(() => {
    return rawJournals.map((j) => {
      const sched = schedules.find((s) => s.id === j.scheduleId);
      return {
        ...j,
        schedule: sched,
      };
    });
  }, [rawJournals, schedules]);

  const loading = loadingJournals || loadingSchedules || loadingClasses || loadingSubjects;

  // Form states
  const [scheduleId, setScheduleId] = useState<string>("");
  const [journalDate, setJournalDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [topic, setTopic] = useState("");
  const [learningObjectives, setLearningObjectives] = useState("");
  const [teachingMethod, setTeachingMethod] = useState("Ceramah");
  const [reflection, setReflection] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Recap Filter states
  const [recapClassId, setRecapClassId] = useState<string>("");
  const [recapDate, setRecapDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [recapMonth, setRecapMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    if (classes.length > 0 && !recapClassId) {
      setRecapClassId(String(classes[0].id));
    }
  }, [classes, recapClassId]);

  useEffect(() => {
    const queryScheduleId = searchParams.get("scheduleId");
    if (queryScheduleId) {
      setScheduleId(queryScheduleId);
      setIsFormOpen(true);
    } else if (schedules.length > 0 && !scheduleId) {
      setScheduleId(String(schedules[0].id));
    }
  }, [searchParams, schedules, scheduleId]);

  const handleEdit = (journal: TeachingJournal) => {
    setEditingJournal(journal);
    setScheduleId(String(journal.scheduleId));
    setJournalDate(journal.journalDate);
    setTopic(journal.topic);
    setLearningObjectives(journal.learningObjectives);
    setTeachingMethod(journal.teachingMethod);
    setReflection(journal.reflection || "");
    setNotes(journal.notes || "");
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus jurnal ini?")) return;
    try {
      await teachingJournalsService.delete(id);
      toast.success("Jurnal berhasil dihapus");
      showAlert("Berhasil", "Jurnal berhasil dihapus!", "success");
      refetchJournals();
    } catch (err) {
      toast.error("Gagal menghapus jurnal");
    }
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingJournal(null);
    setTopic("");
    setLearningObjectives("");
    setTeachingMethod("Ceramah");
    setReflection("");
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleId || !topic || !learningObjectives || !teachingMethod) {
      toast.error("Silakan isi semua bidang wajib (Jadwal, Topik, Tujuan, Metode)");
      return;
    }

    setSubmitting(true);
    try {
      const selectedSchedule = schedules.find((s) => s.id === Number(scheduleId));

      const payload = {
        scheduleId: Number(scheduleId),
        teacherId: selectedSchedule?.teacherId || 0,
        journalDate,
        topic,
        learningObjectives,
        teachingMethod,
        reflection: reflection || undefined,
        notes: notes || undefined,
      };

      if (editingJournal) {
        await teachingJournalsService.update(editingJournal.id, payload);
        toast.success("Jurnal berhasil diperbarui!");
        showAlert("Berhasil", "Jurnal berhasil diperbarui!", "success");
      } else {
        await teachingJournalsService.create(payload);
        toast.success("Jurnal baru berhasil disimpan!");
        showAlert("Berhasil", "Jurnal baru berhasil disimpan!", "success");
      }

      handleCancel();
      refetchJournals();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan jurnal");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const className = classes.find((c) => String(c.id) === String(recapClassId))?.name ?? "—";
    const cleanClassName = className.replace(/[^a-zA-Z0-9]/g, "_");
    if (activeTab === "daily") {
      document.title = `Jurnal_Mengajar_Harian_Kelas_${cleanClassName}_${recapDate}`;
    } else {
      document.title = `Jurnal_Mengajar_Bulanan_Kelas_${cleanClassName}_${recapMonth}`;
    }
    window.print();
    document.title = originalTitle;
  };

  // Client-side filtering for daily/monthly recaps
  const getFilteredJournals = (type: "daily" | "monthly") => {
    return journals
      .filter((j) => {
        const sched = schedules.find((s) => s.id === j.scheduleId);
        const matchesClass = recapClassId ? String(sched?.classId) === String(recapClassId) : true;
        const matchesDate = type === "daily" ? j.journalDate === recapDate : j.journalDate.startsWith(recapMonth);
        return matchesClass && matchesDate;
      })
      .sort((a, b) => a.journalDate.localeCompare(b.journalDate));
  };

  const dailyJournals = getFilteredJournals("daily");
  const monthlyJournals = getFilteredJournals("monthly");
  const selectedClassName = classes.find((c) => String(c.id) === String(recapClassId))?.name ?? "—";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        <span className="text-xs text-gray-500 dark:text-gray-400">Memuat halaman...</span>
      </div>
    );
  }

  return (
    <div className="space-y-      {/* HEADER SECTION */}
      <div className="flex justify-between items-center bg-white dark:bg-gray-900 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm no-print">
        <div className="flex items-center gap-2">
          {isFormOpen || detailJournal ? (
            <button
              onClick={detailJournal ? () => setDetailJournal(null) : handleCancel}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          )}
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {isFormOpen 
              ? (editingJournal ? "Edit Jurnal Mengajar" : "Input Jurnal") 
              : (detailJournal ? "Detail Jurnal Mengajar" : "Jurnal Mengajar")}
          </span>
        </div>

        <div className="flex gap-2">
          {!isFormOpen && !detailJournal && activeTab !== "journals" && (
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-indigo-600 transition-colors"
              title="Cetak PDF"
            >
              <Printer className="h-4 w-4" />
            </button>
          )}
          {!isFormOpen && !detailJournal && (
            <button
              onClick={() => setIsFormOpen(true)}
              className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Input
            </button>
          )}
        </div>
      </div>

      {/* TABS SELECTOR (no-print) */}
      {!isFormOpen && !detailJournal && (
        <div className="flex bg-white dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm no-print">
          {(["journals", "daily", "monthly"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-2 text-[11px] font-bold rounded-lg transition-all text-center",
                activeTab === tab
                  ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              )}
            >
              {tab === "journals" ? "Semua Jurnal" : tab === "daily" ? "Rekap Harian" : "Rekap Bulanan"}
            </button>
          ))}
        </div>
      )}
 )}

      {/* FILTER PANEL FOR RECAPS */}
      {!isFormOpen && !detailJournal && activeTab !== "journals" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm grid grid-cols-2 gap-3 no-print">
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-gray-400">Kelas</label>
            <select
              value={recapClassId}
              onChange={(e) => setRecapClassId(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {activeTab === "daily" ? (
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-gray-400">Tanggal</label>
              <input
                type="date"
                value={recapDate}
                onChange={(e) => setRecapDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
              />
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-gray-400">Bulan</label>
              <input
                type="month"
                value={recapMonth}
                onChange={(e) => setRecapMonth(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
              />
            </div>
          )}
        </div>
      )}

      {/* JOURNAL FORM VIEW */}
      {isFormOpen && (
        <form onSubmit={handleSubmit} className="space-y-4 no-print">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
                Pilih Jadwal Mengajar <span className="text-red-500">*</span>
              </label>
              <select
                value={scheduleId}
                onChange={(e) => setScheduleId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
              >
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.dayOfWeek} • Kelas {s.class?.name} • Mapel {s.subject?.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
                Tanggal Jurnal <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={journalDate}
                onChange={(e) => setJournalDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
                Topik / Materi Pembelajaran <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Materi yang dibahas"
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
                Tujuan Pembelajaran <span className="text-red-500">*</span>
              </label>
              <textarea
                value={learningObjectives}
                onChange={(e) => setLearningObjectives(e.target.value)}
                placeholder="Target pencapaian siswa..."
                rows={3}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
                Metode Pembelajaran <span className="text-red-500">*</span>
              </label>
              <select
                value={teachingMethod}
                onChange={(e) => setTeachingMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
              >
                <option value="Ceramah">Ceramah / Ekspositori</option>
                <option value="Diskusi">Diskusi Kelompok</option>
                <option value="Tanya Jawab">Tanya Jawab</option>
                <option value="Praktikum">Praktikum / Eksperimen</option>
                <option value="Project Based Learning">Project Based Learning (PjBL)</option>
                <option value="Problem Based Learning">Problem Based Learning (PBL)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
                Refleksi Pembelajaran (Opsional)
              </label>
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="Evaluasi kelas..."
                rows={2}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
                Catatan Lainnya (Opsional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tugas rumah, info tambahan, dll"
                rows={2}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 py-3 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
              ) : (
                <>
                  <Check className="h-4.5 w-4.5" />
                  Simpan Jurnal
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* JOURNAL LIST VIEW */}
      {!isFormOpen && activeTab === "journals" && (
        <div className="space-y-3 no-print">
          {journals.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center text-xs text-gray-500 dark:text-gray-400 shadow-sm">
              <Info className="h-8 w-8 text-indigo-400 mx-auto mb-2" />
              Belum ada riwayat pengisian jurnal mengajar.
            </div>
          ) : (
            journals.map((journal) => (
              <div
                key={journal.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                      {journal.topic}
                    </h4>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                      Kelas {journal.schedule?.class?.name} • Mapel {journal.schedule?.subject?.name}
                    </p>
                    <div className="flex items-center gap-1 text-[9px] text-gray-400 mt-2 font-medium">
                      <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                      {formatDate(journal.journalDate)}
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => setDetailJournal(journal)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      title="Detail"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleEdit(journal)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(journal.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 pt-3 border-t border-gray-100 dark:border-gray-800/80 text-[10px]">
                  <div>
                    <span className="font-semibold text-gray-500 dark:text-gray-400">Tujuan:</span>{" "}
                    <span className="text-gray-700 dark:text-gray-300">{journal.learningObjectives}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-500 dark:text-gray-400">Metode:</span>{" "}
                    <span className="text-gray-700 dark:text-gray-300">{journal.teachingMethod}</span>
                  </div>
                  {journal.reflection && (
                    <div>
                      <span className="font-semibold text-gray-500 dark:text-gray-400">Refleksi:</span>{" "}
                      <span className="text-gray-700 dark:text-gray-300">{journal.reflection}</span>
                    </div>
                  )}
                  {journal.notes && (
                    <div>
                      <span className="font-semibold text-gray-500 dark:text-gray-400">Catatan:</span>{" "}
                      <span className="text-gray-700 dark:text-gray-300">{journal.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* JOURNAL DETAIL VIEW */}
      {!isFormOpen && detailJournal && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm space-y-4 text-xs no-print">
          <div className="flex justify-between items-start pb-3 border-b border-gray-100 dark:border-gray-800">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Jadwal</span>
              <span className="text-gray-950 dark:text-white font-bold text-sm">
                Kelas {detailJournal.schedule?.class?.name || "-"} • Mapel {detailJournal.schedule?.subject?.name || "-"}
              </span>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-1">
                <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                {formatDate(detailJournal.journalDate)}
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const j = detailJournal;
                  setDetailJournal(null);
                  handleEdit(j);
                }}
                className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2.5 py-1.5 rounded-lg font-bold"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[9px] uppercase font-bold text-gray-400 block">Topik / Materi</span>
              <p className="text-gray-950 dark:text-white font-semibold text-sm mt-0.5">{detailJournal.topic}</p>
            </div>

            <div>
              <span className="text-[9px] uppercase font-bold text-gray-400 block">Tujuan Pembelajaran</span>
              <p className="text-gray-700 dark:text-gray-300 mt-0.5 whitespace-pre-wrap">{detailJournal.learningObjectives}</p>
            </div>

            <div>
              <span className="text-[9px] uppercase font-bold text-gray-400 block">Metode Pembelajaran</span>
              <p className="text-gray-700 dark:text-gray-300 mt-0.5">{detailJournal.teachingMethod}</p>
            </div>

            {detailJournal.reflection && (
              <div>
                <span className="text-[9px] uppercase font-bold text-gray-400 block">Refleksi</span>
                <p className="text-gray-700 dark:text-gray-300 mt-0.5 whitespace-pre-wrap">{detailJournal.reflection}</p>
              </div>
            )}

            {detailJournal.notes && (
              <div>
                <span className="text-[9px] uppercase font-bold text-gray-400 block">Catatan</span>
                <p className="text-gray-700 dark:text-gray-300 mt-0.5 whitespace-pre-wrap">{detailJournal.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DAILY RECAP VIEW */}
      {!isFormOpen && !detailJournal && activeTab === "daily" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm print:p-0 print:border-none print:shadow-none">

            
            {/* Kop Surat */}
            <PrintHeader 
              title="Laporan Jurnal Mengajar Harian Guru" 
              subtitle={`Kelas: ${selectedClassName}`}
              metadata={[
                { label: "Tanggal", value: formatDate(recapDate) },
                { label: "Kelas", value: selectedClassName },
                { label: "Total Kegiatan", value: `${dailyJournals.length} Kelas Pembelajaran` }
              ]}
            />

            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 mb-3 print:hidden">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4.5 w-4.5 text-indigo-600" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Agenda Harian: {formatDate(recapDate)}
                </span>
              </div>
              <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                {dailyJournals.length} Kelas
              </span>
            </div>

            {dailyJournals.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs">Tidak ada jurnal mengajar tercatat untuk kelas dan tanggal ini.</div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300">
                      <th className="p-2 font-bold w-8 text-center">No</th>
                      <th className="p-2 font-bold w-24">Mapel</th>
                      <th className="p-2 font-bold w-28">Topik</th>
                      <th className="p-2 font-bold">Tujuan</th>
                      <th className="p-2 font-bold w-20">Metode</th>
                      <th className="p-2 font-bold w-28">Refleksi / Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {dailyJournals.map((j, idx) => (
                      <tr key={j.id} className="hover:bg-gray-50 dark:hover:bg-gray-850">
                        <td className="p-2 text-center">{idx + 1}</td>
                        <td className="p-2 font-medium text-gray-900 dark:text-gray-100">{j.schedule?.subject?.name}</td>
                        <td className="p-2">{j.topic}</td>
                        <td className="p-2 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{j.learningObjectives}</td>
                        <td className="p-2">{j.teachingMethod}</td>
                        <td className="p-2 text-gray-500 text-[10px]">
                          {j.reflection && <p><span className="font-semibold">Refleksi:</span> {j.reflection}</p>}
                          {j.notes && <p className="mt-0.5"><span className="font-semibold">Catatan:</span> {j.notes}</p>}
                          {!j.reflection && !j.notes && "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MONTHLY RECAP VIEW */}
      {!isFormOpen && !detailJournal && activeTab === "monthly" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm print:p-0 print:border-none print:shadow-none">
            
            {/* Kop Surat */}
            <PrintHeader 
              title="Laporan Jurnal Mengajar Bulanan Guru" 
              subtitle={`Kelas: ${selectedClassName}`}
              metadata={[
                { label: "Bulan / Tahun", value: recapMonth },
                { label: "Kelas", value: selectedClassName },
                { label: "Total KBM", value: `${monthlyJournals.length} Kegiatan Belajar Mengajar` }
              ]}
            />

            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 mb-3 print:hidden">
              <div className="flex items-center gap-1.5">
                <FileText className="h-4.5 w-4.5 text-indigo-600" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Agenda Bulanan: {recapMonth}
                </span>
              </div>
              <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                {monthlyJournals.length} KBM
              </span>
            </div>

            {monthlyJournals.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs">Tidak ada jurnal mengajar tercatat untuk kelas dan bulan ini.</div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300">
                      <th className="p-2 font-bold w-8 text-center">No</th>
                      <th className="p-2 font-bold w-20">Tanggal</th>
                      <th className="p-2 font-bold w-24">Mapel</th>
                      <th className="p-2 font-bold w-28">Topik</th>
                      <th className="p-2 font-bold">Tujuan</th>
                      <th className="p-2 font-bold w-20">Metode</th>
                      <th className="p-2 font-bold w-28">Catatan / Refleksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {monthlyJournals.map((j, idx) => (
                      <tr key={j.id} className="hover:bg-gray-50 dark:hover:bg-gray-850">
                        <td className="p-2 text-center">{idx + 1}</td>
                        <td className="p-2">{formatDate(j.journalDate)}</td>
                        <td className="p-2 font-medium text-gray-900 dark:text-gray-100">{j.schedule?.subject?.name}</td>
                        <td className="p-2">{j.topic}</td>
                        <td className="p-2 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{j.learningObjectives}</td>
                        <td className="p-2">{j.teachingMethod}</td>
                        <td className="p-2 text-gray-500 text-[10px]">
                          {j.reflection && <p><span className="font-semibold">Refleksi:</span> {j.reflection}</p>}
                          {j.notes && <p className="mt-0.5"><span className="font-semibold">Catatan:</span> {j.notes}</p>}
                          {!j.reflection && !j.notes && "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
