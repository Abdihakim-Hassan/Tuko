import React, { useState, useEffect, useRef } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Tag,
  Image as ImageIcon,
  Camera,
  X,
  Search,
  Sparkles,
  CheckCircle2,
  ZoomIn,
  Briefcase,
  Home,
  GraduationCap,
  Activity,
  Edit2,
  Eye,
  Check,
} from 'lucide-react';
import { TodoItem, TodoPriority, TodoCategory } from '../types';
import { loadAllTodos, saveAllTodos } from '../utils/storage';
import { getTodayKey } from '../utils/prayerTimes';

function format24To12Display(time24?: string): string {
  if (!time24 || !time24.includes(':')) return '';
  const [hStr, mStr] = time24.split(':');
  let h = Number(hStr);
  const m = Number(mStr);
  if (isNaN(h) || isNaN(m)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

function parse24To12(time24?: string): { hour12: number; minute: number; ampm: 'AM' | 'PM' } {
  if (!time24 || !time24.includes(':')) {
    return { hour12: 9, minute: 30, ampm: 'PM' };
  }
  const [rawH, rawM] = time24.split(':').map(Number);
  const h24 = Number.isFinite(rawH) ? Math.min(23, Math.max(0, rawH)) : 21;
  const minute = Number.isFinite(rawM) ? Math.min(59, Math.max(0, rawM)) : 30;
  const ampm: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
  let hour12 = h24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute, ampm };
}

function build24TimeFrom12(hour12: number, minute: number, ampm: 'AM' | 'PM'): string {
  let h24 = hour12 % 12;
  if (ampm === 'PM') h24 += 12;
  return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

interface ToDoViewProps {
  todos?: TodoItem[];
  onUpdateTodos?: (nextTodos: TodoItem[]) => void;
  onNotify?: (message: string) => void;
  userRole?: string;
}

const CATEGORIES: {
  id: TodoCategory;
  label: string;
  icon: React.FC<{ className?: string }>;
  color: string;
}[] = [
  {
    id: 'diini',
    label: 'Diini & Cibaado',
    icon: Sparkles,
    color: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/35',
  },
  {
    id: 'shaqo',
    label: 'Shaqo & Ganacsi',
    icon: Briefcase,
    color: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/35',
  },
  {
    id: 'guriga',
    label: 'Qoyska & Guriga',
    icon: Home,
    color: 'text-amber-300 bg-amber-500/15 border-amber-500/35',
  },
  {
    id: 'waxbarasho',
    label: 'Waxbarasho',
    icon: GraduationCap,
    color: 'text-purple-300 bg-purple-500/15 border-purple-500/35',
  },
  {
    id: 'caafimaad',
    label: 'Caafimaad & Jimicsi',
    icon: Activity,
    color: 'text-rose-300 bg-rose-500/15 border-rose-500/35',
  },
  {
    id: 'guud',
    label: 'Guud & Kale',
    icon: Tag,
    color: 'text-slate-300 bg-slate-500/15 border-slate-500/35',
  },
];

const QUICK_PRESETS = [
  {
    title: 'Akhrinta Suuratul Kahf (Jumcaha)',
    category: 'diini',
    priority: 'high' as TodoPriority,
    details: 'Iftiin labada Jimco u dhaxeeya.',
  },
  {
    title: '100 Salawaat ku sali Nabiga ﷺ',
    category: 'diini',
    priority: 'high' as TodoPriority,
    details: 'Allaahumma salli calaa Muxammad.',
  },
  {
    title: 'Adhkaarta & Wardiga Subaxa & Galabta',
    category: 'diini',
    priority: 'medium' as TodoPriority,
    details: 'Ilaalinta Alle iyo xasilooni.',
  },
  {
    title: "Akhrinta Hal Juz oo Qur'aan ah",
    category: 'diini',
    priority: 'medium' as TodoPriority,
    details: "Qur'aanka maalinlaha ah.",
  },
  {
    title: 'Sadaqo bixin ama caawin qof danyar ah',
    category: 'diini',
    priority: 'medium' as TodoPriority,
    details: 'Sadaqadu waxay damisaa carada Rabbi.',
  },
  {
    title: 'Booqasho & Xiriirin Ehelka ama Waalidiinta',
    category: 'guriga',
    priority: 'medium' as TodoPriority,
    details: 'Silatul Raxim.',
  },
];

function formatTodoTime12(time24?: string): string | null {
  if (!time24 || !time24.includes(':')) return null;
  const [rawH, rawM] = time24.split(':').map(Number);
  if (!Number.isFinite(rawH) || !Number.isFinite(rawM)) return time24;
  const ampm = rawH >= 12 ? 'PM' : 'AM';
  let h12 = rawH % 12;
  if (h12 === 0) h12 = 12;
  return `${String(h12).padStart(2, '0')}:${String(rawM).padStart(2, '0')} ${ampm}`;
}

export const ToDoView: React.FC<ToDoViewProps> = ({
  todos: externalTodos,
  onUpdateTodos,
  onNotify,
}) => {
  const [internalTodos, setInternalTodos] = useState<TodoItem[]>(() => loadAllTodos());
  const todos = externalTodos ?? internalTodos;

  const setTodos = (updater: TodoItem[] | ((prev: TodoItem[]) => TodoItem[])) => {
    const next = typeof updater === 'function' ? updater(todos) : updater;
    setInternalTodos(next);
    saveAllTodos(next);
    if (onUpdateTodos) {
      onUpdateTodos(next);
    }
  };

  const [activeFilter, setActiveFilter] = useState<
    'all' | 'pending' | 'completed' | 'with_image' | 'today'
  >('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [localFeedbackMsg, setLocalFeedbackMsg] = useState<string | null>(null);

  // Inline / Modal Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskDetails, setNewTaskDetails] = useState<string>('');
  const [newTaskCategory, setNewTaskCategory] = useState<TodoCategory>('diini');
  const [newTaskPriority, setNewTaskPriority] = useState<TodoPriority>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>(getTodayKey());
  const [newTaskDueTime, setNewTaskDueTime] = useState<string>('');
  const [newTaskImage, setNewTaskImage] = useState<string | null>(null);
  const [newTaskImageCaption, setNewTaskImageCaption] = useState<string>('');
  const [isCompressingImage, setIsCompressingImage] = useState<boolean>(false);

  // Lightbox / Image inspection modal state
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
    caption?: string;
  } | null>(null);

  // Separate file input refs so inline form, modal form, and existing task attachment never collide!
  const inlineFileInputRef = useRef<HTMLInputElement | null>(null);
  const modalFileInputRef = useRef<HTMLInputElement | null>(null);
  const addPhotoToTaskRef = useRef<HTMLInputElement | null>(null);
  const inlineTitleInputRef = useRef<HTMLInputElement | null>(null);
  const [taskToAttachPhoto, setTaskToAttachPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (externalTodos) {
      setInternalTodos(externalTodos);
    }
  }, [externalTodos]);

  const showToast = (msg: string) => {
    setLocalFeedbackMsg(msg);
    setTimeout(() => setLocalFeedbackMsg(null), 3500);
    if (onNotify) onNotify(msg);
  };

  // Client-side lightweight image compressor via HTML5 Canvas
  const processAndCompressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          // Max dimension 720px for fast mobile sync & Firestore <1MB safety
          const maxDim = 720;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedDataUrl);
        };
        img.onerror = () => reject(new Error('Failed to load image for compression'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingImage(true);
    try {
      const compressed = await processAndCompressImage(file);
      setNewTaskImage(compressed);
      showToast('📸 Sawirka waa la diyaariyay! Hadda taabo "KUSOO DAR HAWSHA".');
    } catch {
      showToast('⚠️ Sawirka lama akhrin karo, fadlan isku day sawir kale.');
    } finally {
      setIsCompressingImage(false);
      if (inlineFileInputRef.current) inlineFileInputRef.current.value = '';
      if (modalFileInputRef.current) modalFileInputRef.current.value = '';
    }
  };

  const handleAttachPhotoToExistingTask = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !taskToAttachPhoto) return;

    try {
      const compressed = await processAndCompressImage(file);
      setTodos((prev) =>
        prev.map((t) => (t.id === taskToAttachPhoto ? { ...t, imageUrl: compressed } : t))
      );
      showToast('📸 Sawirka si guul leh ayaa loogu daray hawsha!');
    } catch {
      showToast('⚠️ Sawirka lama xiriirin karo.');
    } finally {
      setTaskToAttachPhoto(null);
      if (addPhotoToTaskRef.current) addPhotoToTaskRef.current.value = '';
    }
  };

  const resetFormFields = () => {
    setEditingTaskId(null);
    setNewTaskTitle('');
    setNewTaskDetails('');
    setNewTaskCategory('diini');
    setNewTaskPriority('medium');
    setNewTaskDueDate(getTodayKey());
    setNewTaskDueTime('');
    setNewTaskImage(null);
    setNewTaskImageCaption('');
  };

  const handleOpenAddModal = () => {
    resetFormFields();
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (todo: TodoItem) => {
    setEditingTaskId(todo.id);
    setNewTaskTitle(todo.task);
    setNewTaskDetails(todo.details || '');
    setNewTaskCategory((todo.category as TodoCategory) || 'diini');
    setNewTaskPriority(todo.priority || 'medium');
    setNewTaskDueDate(todo.dueDate || getTodayKey());
    setNewTaskDueTime(todo.dueTime || '');
    setNewTaskImage(todo.imageUrl || null);
    setNewTaskImageCaption(todo.imageCaption || '');
    setIsAddModalOpen(true);
  };

  const handleCreateOrSaveTask = (e: React.FormEvent) => {
    e.preventDefault();

    const resolvedTitle =
      newTaskTitle.trim() ||
      (newTaskImage ? newTaskImageCaption.trim() || 'Hawl Cusub oo Sawir Leh 📸' : '');

    if (!resolvedTitle) {
      inlineTitleInputRef.current?.focus();
      showToast('✍️ Fadlan marka hore qor magaca hawsha ama dooro sawir!');
      return;
    }

    if (editingTaskId) {
      setTodos((prev) =>
        prev.map((item) =>
          item.id === editingTaskId
            ? {
                ...item,
                task: resolvedTitle,
                details: newTaskDetails.trim() || undefined,
                category: newTaskCategory,
                priority: newTaskPriority,
                dueDate: newTaskDueDate || undefined,
                dueTime: newTaskDueTime || undefined,
                imageUrl: newTaskImage || undefined,
                imageCaption: newTaskImageCaption.trim() || undefined,
              }
            : item
        )
      );
      showToast('✓ Hawsha waa la cusbooneysiiyay!');
    } else {
      const newItem: TodoItem = {
        id: `todo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        task: resolvedTitle,
        details: newTaskDetails.trim() || undefined,
        category: newTaskCategory,
        priority: newTaskPriority,
        dueDate: newTaskDueDate || getTodayKey(),
        dueTime: newTaskDueTime || undefined,
        imageUrl: newTaskImage || undefined,
        imageCaption: newTaskImageCaption.trim() || undefined,
        completed: false,
        createdAt: Date.now(),
      };

      setTodos((prev) => [newItem, ...prev]);
      showToast('✓ Hawl cusub ayaa lagu daray liiskaaga!');
    }

    // Reset filters to 'all' if current filter would hide the newly created task
    if (activeFilter === 'completed') {
      setActiveFilter('all');
    }

    resetFormFields();
    setIsAddModalOpen(false);
  };

  const handleAddPreset = (preset: (typeof QUICK_PRESETS)[0]) => {
    const newItem: TodoItem = {
      id: `todo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      task: preset.title,
      details: preset.details,
      category: preset.category as TodoCategory,
      priority: preset.priority,
      dueDate: getTodayKey(),
      completed: false,
      createdAt: Date.now(),
    };

    setTodos((prev) => [newItem, ...prev]);
    if (activeFilter === 'completed') setActiveFilter('all');
    showToast(`✓ "${preset.title}" ayaa lagu daray hawlahaaga maanta!`);
  };

  const handleToggleComplete = (id: string) => {
    setTodos((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextState = !item.completed;
          try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate(nextState ? [40, 60, 40] : [20]);
            }
          } catch {}
          return {
            ...item,
            completed: nextState,
            completedAt: nextState ? Date.now() : undefined,
          };
        }
        return item;
      })
    );
  };

  const handleDeleteTask = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    showToast('🗑️ Hawsha waa la tirtiray.');
  };

  const handleClearCompletedTasks = () => {
    const remaining = todos.filter((t) => !t.completed);
    setTodos(remaining);
    showToast('🗑️ Hawlihii la qabtay waa la nadiifiyay.');
  };

  const handleMarkAllTasksCompleted = () => {
    const now = Date.now();
    setTodos((prev) =>
      prev.map((t) => ({
        ...t,
        completed: true,
        completedAt: t.completedAt || now,
      }))
    );
    showToast('✓ Dhammaan hawlaha waxaa loo calaamadeeyay in la qabtay!');
  };

  const handleRemoveImageFromTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, imageUrl: undefined, imageCaption: undefined } : t))
    );
  };

  // Calculations
  const totalTasks = todos.length;
  const completedTasks = todos.filter((t) => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Filtered tasks
  const filteredTodos = todos.filter((todo) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = todo.task.toLowerCase().includes(q);
      const matchDetails = todo.details?.toLowerCase().includes(q);
      if (!matchTitle && !matchDetails) return false;
    }

    if (selectedCategoryFilter !== 'all' && todo.category !== selectedCategoryFilter) {
      return false;
    }

    if (activeFilter === 'pending') return !todo.completed;
    if (activeFilter === 'completed') return todo.completed;
    if (activeFilter === 'with_image') return !!todo.imageUrl;
    if (activeFilter === 'today') return todo.dueDate === getTodayKey();

    return true;
  });

  return (
    <div className="space-y-5 sm:space-y-6 pb-14">
      {/* Hidden File Input for Attaching Photo to Existing Task */}
      <input
        type="file"
        ref={addPhotoToTaskRef}
        accept="image/*"
        className="hidden"
        onChange={handleAttachPhotoToExistingTask}
      />

      {/* 1. Header Banner & Stats */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c2630] via-[#09303d] to-[#062029] border border-teal-500/30 p-4 sm:p-6 shadow-2xl">
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-2 rounded-xl bg-teal-500/20 text-teal-300">
                <CheckSquare className="w-5 h-5 text-teal-400" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
                Liiska Hawlaha &amp; Qorshaha (To-Do)
              </span>
            </div>
            <h2 className="text-xl sm:text-3xl font-extrabold text-white">
              Hawlahaaga, Waqtiga &amp; Sawirrada
            </h2>
            <p className="text-xs sm:text-sm text-teal-200/80 font-medium mt-1">
              Qorsheyso cibaadadaada iyo shaqadaada, u xiro saacad xusuusin ah (⏰), kuna lifaaq sawirro.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="flex-1 md:flex-initial px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs sm:text-sm hover:brightness-110 shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 active:scale-95 touch-manipulation cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Ku Dar Hawl Faahfaahsan</span>
            </button>
          </div>
        </div>

        {/* Progress Bar & Counters */}
        <div className="mt-5 pt-4 border-t border-teal-500/20 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-center">
          <div className="p-3 rounded-2xl bg-black/30 border border-teal-500/20">
            <div className="text-[11px] font-bold text-slate-400">Wadarta Hawlaha</div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">{totalTasks}</div>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30">
            <div className="text-[11px] font-bold text-emerald-400">La Qabtay ✓</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-300 font-mono">
              {completedTasks}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30">
            <div className="text-[11px] font-bold text-amber-400">Qabyo ah</div>
            <div className="text-xl sm:text-2xl font-black text-amber-300 font-mono">
              {pendingTasks}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30">
            <div className="text-[11px] font-bold text-cyan-400">Heerka Guusha</div>
            <div className="text-xl sm:text-2xl font-black text-cyan-300 font-mono">
              {completionPercentage}%
            </div>
          </div>
        </div>

        {/* Visual Progress Line */}
        <div className="mt-4">
          <div className="w-full h-2.5 rounded-full bg-black/40 overflow-hidden border border-teal-500/20">
            <div
              className="h-full bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 transition-all duration-500 rounded-full"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Inline Toast Feedback */}
      {localFeedbackMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 text-xs sm:text-sm font-bold flex items-center justify-between gap-2 shadow-lg animate-in fade-in">
          <span>{localFeedbackMsg}</span>
          <button
            type="button"
            onClick={() => setLocalFeedbackMsg(null)}
            className="text-emerald-300 hover:text-white px-2 py-0.5 rounded-lg"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. DIRECT INLINE ADD SECTION (Mobile-First, Complete with Time, Date, Photo & Details) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#0c2e3a] via-[#08242f] to-[#051a22] border-2 border-emerald-400/50 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-emerald-500/25 text-emerald-300 border border-emerald-400/40">
              <Plus className="w-5 h-5 stroke-[3] text-emerald-300" />
            </div>
            <div>
              <h3 className="text-sm sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
                <span>Ku Dar Hawl Cusub, Waqti &amp; Sawir 📸</span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-slate-950 px-2 py-0.5 rounded-full">
                  Degdeg
                </span>
              </h3>
              <p className="text-xs text-teal-200/80">
                Ku qor hawshaada hoose, u xulo waqtiga la rabo, oo ku dar liiskaaga hal taabasho.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleCreateOrSaveTask} className="space-y-3">
          {/* Main Task Title Input */}
          <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
            <div className="relative flex-1">
              <input
                ref={inlineTitleInputRef}
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="✍️ Qor magaca hawsha... (Tusaale: Akhrinta Suuradda Al-Mulk, Shaqo...)"
                className="w-full px-4 py-3.5 rounded-2xl bg-black/60 border border-emerald-400/50 text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-semibold shadow-inner"
              />
            </div>

            {/* Photo Attachment & Submit Button (Full width on mobile for easy thumb tap) */}
            <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0">
              <input
                type="file"
                ref={inlineFileInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => inlineFileInputRef.current?.click()}
                disabled={isCompressingImage}
                className={`px-3.5 py-3.5 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95 touch-manipulation cursor-pointer ${
                  newTaskImage
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-md ring-2 ring-emerald-400/30'
                    : 'bg-teal-500/15 hover:bg-teal-500/25 border-teal-500/35 text-teal-200'
                }`}
                title="Dooro ama kaamirada ku qaad sawir"
              >
                <Camera className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">
                  {isCompressingImage
                    ? 'Diyaarin...'
                    : newTaskImage
                    ? '✓ Sawir Diyaar'
                    : 'Lifaaq Sawir 📸'}
                </span>
              </button>

              <button
                type="submit"
                className="px-4 sm:px-5 py-3.5 rounded-2xl font-black text-xs transition flex items-center justify-center gap-1.5 shadow-lg active:scale-95 touch-manipulation whitespace-nowrap bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 hover:brightness-110 shadow-emerald-500/30 ring-2 ring-emerald-300/60 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3] shrink-0" />
                <span>KUSOO DAR ➕</span>
              </button>
            </div>
          </div>

          {/* Optional Details, Time & Date Row (Mobile-Friendly Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <input
                type="text"
                value={newTaskDetails}
                onChange={(e) => setNewTaskDetails(e.target.value)}
                placeholder="📝 Faahfaahin kooban (Ikhtiyaari)..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-teal-500/30 text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>

            <div className="flex items-center gap-2 bg-black/50 border border-teal-500/30 rounded-xl px-3 py-2">
              <Calendar className="w-4 h-4 text-teal-400 shrink-0" />
              <span className="text-[11px] font-bold text-slate-300 whitespace-nowrap">
                Maalinta:
              </span>
              <input
                type="date"
                style={{ colorScheme: 'dark' }}
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="w-full bg-transparent text-white text-xs font-mono font-bold focus:outline-none"
              />
            </div>
          </div>

          {/* Direct Mobile Alarm-Style 12-Hour Time & Alaarm Box */}
          <div className="p-3.5 rounded-2xl bg-black/60 border-2 border-teal-500/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-amber-200 block">
                    Saacadda &amp; Alaarm-ka Mobile-ka:
                  </span>
                  <span className="text-[10px] text-teal-300/80 font-medium">
                    12-Hour AM/PM Selector (Sida Alaarm-ka)
                  </span>
                </div>
              </div>
              {newTaskDueTime ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-black text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-xl border border-amber-400/40">
                    ⏰ {format24To12Display(newTaskDueTime)} (Alaarm)
                  </span>
                  <button
                    type="button"
                    onClick={() => setNewTaskDueTime('')}
                    className="p-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold"
                    title="Tirtir saacadda"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400 italic bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
                  Aan la dooran (Ikhtiyaari)
                </span>
              )}
            </div>

            {/* 3 Touch Selectors: Saacadda (1-12), Daqiiqadda (00-59), AM/PM */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Saacadda
                </span>
                <select
                  value={parse24To12(newTaskDueTime || '09:30').hour12}
                  onChange={(e) => {
                    const current = parse24To12(newTaskDueTime || '09:30');
                    const h = Number(e.target.value);
                    const time24 = build24TimeFrom12(h, current.minute, current.ampm);
                    setNewTaskDueTime(time24);
                  }}
                  className="w-full bg-slate-900 border border-teal-500/40 rounded-xl px-2.5 py-2.5 text-base font-mono font-black text-white focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                >
                  {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Daqiiqadda
                </span>
                <select
                  value={parse24To12(newTaskDueTime || '09:30').minute}
                  onChange={(e) => {
                    const current = parse24To12(newTaskDueTime || '09:30');
                    const m = Number(e.target.value);
                    const time24 = build24TimeFrom12(current.hour12, m, current.ampm);
                    setNewTaskDueTime(time24);
                  }}
                  className="w-full bg-slate-900 border border-teal-500/40 rounded-xl px-2.5 py-2.5 text-base font-mono font-black text-white focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                >
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Xilliga
                </span>
                <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-xl border border-teal-500/40">
                  {(['AM', 'PM'] as const).map((period) => {
                    const current = parse24To12(newTaskDueTime || '09:30');
                    const isSelected = current.ampm === period && !!newTaskDueTime;
                    return (
                      <button
                        key={period}
                        type="button"
                        onClick={() => {
                          const time24 = build24TimeFrom12(current.hour12, current.minute, period);
                          setNewTaskDueTime(time24);
                        }}
                        className={`py-2 rounded-lg font-mono text-xs font-black transition cursor-pointer ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950 shadow'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {period}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick 1-Tap Presets matching Scene 6 */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-teal-500/20">
              <span className="text-[10px] font-bold text-teal-300 uppercase">
                ⚡ Dooro Degdeg:
              </span>
              {[
                { label: '⏰ 09:30 PM (Alaarm)', time: '21:30' },
                { label: '🌅 04:30 AM (Fajr)', time: '04:30' },
                { label: '🌞 12:30 PM (Duhur)', time: '12:30' },
                { label: '🌤️ 03:30 PM (Casar)', time: '15:30' },
                { label: '🌇 06:00 PM (Maqrib)', time: '18:00' },
                { label: '🌙 07:45 PM (Cishe)', time: '19:45' },
              ].map((preset) => (
                <button
                  key={preset.time}
                  type="button"
                  onClick={() => {
                    setNewTaskDueTime(preset.time);
                    onNotify?.(`Waqtiga waxaa loo dejiyay ${preset.label} ✓`);
                  }}
                  className={`px-2 py-1 rounded-xl text-[10px] font-bold border transition cursor-pointer active:scale-95 ${
                    newTaskDueTime === preset.time
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Attached Image Preview */}
          {newTaskImage && (
            <div className="p-3 rounded-2xl bg-black/60 border border-emerald-500/30 flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-emerald-400/50 shrink-0 bg-black">
                <img src={newTaskImage} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setNewTaskImage(null)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/80 text-rose-400 hover:text-rose-200"
                  title="Ka saar sawirka"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 w-full space-y-1.5">
                <input
                  type="text"
                  value={newTaskImageCaption}
                  onChange={(e) => setNewTaskImageCaption(e.target.value)}
                  placeholder="Qor qoraal gaaban oo sawirka ah (caption)..."
                  className="w-full px-3 py-2 rounded-xl bg-black/70 border border-white/10 text-white text-xs placeholder:text-slate-500"
                />
                <div className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Sawirka waa diyaar. Guji &apos;KUSOO DAR ➕&apos; si aad u keydiso.</span>
                </div>
              </div>
            </div>
          )}

          {/* Category Chips & Priority Selector */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                Qaybta:
              </span>
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = newTaskCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setNewTaskCategory(cat.id)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer touch-manipulation ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                        : 'bg-black/40 text-slate-300 border border-white/10 hover:border-emerald-500/30'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Ahmiyadda:
              </span>
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as TodoPriority)}
                className="px-3 py-1.5 rounded-xl bg-black/70 border border-teal-500/40 text-white text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="high">🔴 Degdeg / Sare</option>
                <option value="medium">🟡 Dhexdhexaad</option>
                <option value="low">🟢 Caadi</option>
              </select>
            </div>
          </div>
        </form>
      </div>

      {/* 3. Quick-Add Islamic & Life Preset Buttons */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-[#07202a] to-[#051a22] border border-teal-500/20 shadow-md">
        <div className="flex items-center gap-2 mb-2.5 text-xs font-bold uppercase tracking-wider text-teal-300/80">
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          <span>Ku dar Hal Taabasho (Hawlo Diini ah &amp; Joogto ah)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {QUICK_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleAddPreset(preset)}
              className="px-3 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-400/25 text-teal-100 text-xs font-bold transition flex items-center gap-2 active:scale-95 touch-manipulation text-left cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">{preset.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Search, Status Filters, Category Selector & Bulk Actions */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Raadi hawl ama qoraal..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-black/40 border border-teal-500/30 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: `Dhammaan (${totalTasks})` },
              { id: 'pending', label: `Qabyo (${pendingTasks})` },
              { id: 'completed', label: `La Qabtay (${completedTasks})` },
              { id: 'with_image', label: 'Sawirro 📸' },
              { id: 'today', label: 'Maanta' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id as typeof activeFilter)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap active:scale-95 touch-manipulation cursor-pointer ${
                  activeFilter === f.id
                    ? 'bg-teal-500 text-slate-950 shadow-md font-black'
                    : 'bg-black/30 text-slate-300 hover:text-white border border-teal-500/20'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter & Bulk Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                selectedCategoryFilter === 'all'
                  ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/50'
                  : 'bg-white/5 text-slate-400 border border-white/5 hover:text-white'
              }`}
            >
              Dhammaan Qaybaha
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryFilter(cat.id)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  selectedCategoryFilter === cat.id
                    ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/50'
                    : 'bg-white/5 text-slate-400 border border-white/5 hover:text-white'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {totalTasks > 0 && (
            <div className="flex items-center gap-2">
              {pendingTasks > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllTasksCompleted}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Dhammaan Sax</span>
                </button>
              )}
              {completedTasks > 0 && (
                <button
                  type="button"
                  onClick={handleClearCompletedTasks}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Nadiifi Kuwa La Qabtay</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 5. Task List (Mobile-First Cards with Edit, Camera, Time & Delete) */}
      <div className="space-y-3">
        {filteredTodos.length === 0 ? (
          <div className="p-8 sm:p-12 text-center rounded-3xl bg-black/20 border border-teal-500/20 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-3xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-300">
              <CheckSquare className="w-7 h-7 text-teal-400" />
            </div>
            <h4 className="text-base sm:text-lg font-bold text-white">Ma jiraan hawlo la helay</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Wax hawl ah kuma jiraan qaybtan. Ku qor hawshaada sanduuqa kore ama taabo badhanka hoose.
            </p>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs transition cursor-pointer"
            >
              + Ku Dar Hawl Cusub
            </button>
          </div>
        ) : (
          filteredTodos.map((todo) => {
            const isCompleted = todo.completed;
            const categoryObj = CATEGORIES.find((c) => c.id === todo.category) || CATEGORIES[5];
            const CatIcon = categoryObj.icon;
            const formattedDueTime = formatTodoTime12(todo.dueTime);

            return (
              <div
                key={todo.id}
                className={`rounded-3xl border transition-all duration-300 overflow-hidden ${
                  isCompleted
                    ? 'bg-slate-900/60 border-emerald-500/25 opacity-85'
                    : 'bg-gradient-to-r from-[#0a2029] to-[#071920] border-teal-500/35 hover:border-teal-400/50 shadow-md'
                }`}
              >
                <div className="p-4 sm:p-5 space-y-3">
                  {/* Top & Content Section */}
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleComplete(todo.id)}
                      className="mt-0.5 p-1.5 rounded-xl bg-black/30 hover:bg-white/10 border border-teal-500/20 transition active:scale-95 touch-manipulation shrink-0 cursor-pointer"
                      title={isCompleted ? 'Dib ugu celi qabyo' : 'Calaamadee in la qabtay'}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <Square className="w-6 h-6 text-teal-300 hover:text-emerald-300" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      {/* Metadata Row */}
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${categoryObj.color}`}
                        >
                          <CatIcon className="w-3 h-3" />
                          <span>{categoryObj.label}</span>
                        </span>

                        {todo.priority === 'high' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            🔴 Degdeg
                          </span>
                        )}
                        {todo.priority === 'medium' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            🟡 Dhexdhexaad
                          </span>
                        )}

                        {formattedDueTime && (
                          <span className="text-[10px] font-mono font-black px-2.5 py-0.5 rounded-lg bg-amber-400/20 text-amber-200 border border-amber-400/35 flex items-center gap-1 shadow-sm">
                            <Clock className="w-3 h-3 text-amber-300" />
                            <span>{formattedDueTime} (Alaarm)</span>
                          </span>
                        )}

                        {todo.dueDate && (
                          <span className="text-[10px] text-teal-300 font-bold font-mono flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-teal-400" />
                            <span>{todo.dueDate === getTodayKey() ? '• Caawa' : todo.dueDate}</span>
                          </span>
                        )}
                      </div>

                      {/* Task Title (Tapping title also toggles completion for easy mobile use) */}
                      <h4
                        onClick={() => handleToggleComplete(todo.id)}
                        className={`text-sm sm:text-base font-extrabold transition cursor-pointer ${
                          isCompleted ? 'text-slate-400 line-through' : 'text-white'
                        }`}
                      >
                        {todo.task}
                      </h4>

                      {todo.details && (
                        <p className="text-xs text-slate-300/90 mt-1 whitespace-pre-line leading-relaxed">
                          {todo.details}
                        </p>
                      )}

                      {/* Attached Image Thumbnail */}
                      {todo.imageUrl && (
                        <div className="mt-3 flex items-center gap-3">
                          <div
                            onClick={() =>
                              setPreviewImage({
                                url: todo.imageUrl!,
                                title: todo.task,
                                caption: todo.imageCaption,
                              })
                            }
                            className="relative group cursor-pointer rounded-2xl overflow-hidden border border-teal-500/40 w-24 h-24 sm:w-28 sm:h-28 bg-black/60 shadow-md shrink-0"
                          >
                            <img
                              src={todo.imageUrl}
                              alt={todo.task}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                              <ZoomIn className="w-5 h-5" />
                            </div>
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/70 text-[9px] font-bold text-teal-300">
                              Sawir
                            </span>
                          </div>

                          <div className="text-xs space-y-1.5">
                            {todo.imageCaption && (
                              <p className="text-xs text-teal-200 font-medium italic">
                                &ldquo;{todo.imageCaption}&rdquo;
                              </p>
                            )}
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewImage({
                                    url: todo.imageUrl!,
                                    title: todo.task,
                                    caption: todo.imageCaption,
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/25 flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Weynee</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleRemoveImageFromTask(todo.id, e)}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-[11px] font-bold text-rose-300 hover:bg-rose-500/25 flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Ka saar</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Mobile-Friendly Action Bar */}
                  <div className="pt-2.5 border-t border-teal-500/15 flex items-center justify-between gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleToggleComplete(todo.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 touch-manipulation cursor-pointer ${
                        isCompleted
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isCompleted ? 'Waa La Qabtay ✓' : 'Calaamadee La Qabtay'}</span>
                    </button>

                    <div className="flex items-center gap-1.5 ml-auto">
                      {!todo.imageUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setTaskToAttachPhoto(todo.id);
                            addPhotoToTaskRef.current?.click();
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-400/30 text-teal-200 text-xs font-bold transition flex items-center gap-1 active:scale-95 touch-manipulation cursor-pointer"
                          title="Ku dar sawir hawshan"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Sawir</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(todo)}
                        className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-teal-500/25 text-slate-200 text-xs font-bold transition flex items-center gap-1 active:scale-95 touch-manipulation cursor-pointer"
                        title="Wax ka beddel hawshan"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-cyan-300" />
                        <span>Beddel</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteTask(todo.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/25 text-rose-300 text-xs font-bold transition flex items-center gap-1 active:scale-95 touch-manipulation cursor-pointer"
                        title="Tirtir hawshan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Tirtir</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 6. Add / Edit Task Modal (Mobile-Scrollable) */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-gradient-to-b from-[#0c242e] via-[#091b22] to-[#06141a] border border-teal-500/30 p-5 sm:p-6 shadow-2xl text-white max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsAddModalOpen(false)}
              type="button"
              className="absolute top-4 right-4 p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition active:scale-95 touch-manipulation cursor-pointer"
              title="Xir"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-teal-500/20 text-teal-300">
                <Plus className="w-6 h-6 text-teal-400 stroke-[3]" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-white">
                  {editingTaskId ? 'Wax ka beddel Hawsha' : 'Ku Dar Hawl Cusub'}
                </h3>
                <p className="text-xs text-teal-300/80 font-medium">
                  Geli magaca hawsha, saacadda xusuusinta, iyo sawirka
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateOrSaveTask} className="space-y-4">
              {/* Task Title */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Magaca Hawsha *
                </label>
                <input
                  type="text"
                  required={!newTaskImage}
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Tusaale: Akhrinta Suuradda Al-Mulk caawa..."
                  className="w-full px-3.5 py-3 rounded-xl bg-black/60 border border-teal-500/40 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              {/* Category Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Qaybta
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = newTaskCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setNewTaskCategory(cat.id)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-teal-500 text-slate-950 font-black border-teal-400 shadow-md'
                            : 'bg-black/40 text-slate-300 border-white/10 hover:border-teal-500/30'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority, Due Date & Due Time Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Ahmiyadda
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as TodoPriority)}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-teal-500/40 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-400"
                  >
                    <option value="high">🔴 Sare / Degdeg</option>
                    <option value="medium">🟡 Dhexdhexaad</option>
                    <option value="low">🟢 Caadi</option>
                  </select>
                </div>

                <div className="sm:col-span-2 p-3.5 rounded-2xl bg-black/60 border border-teal-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Saacadda &amp; Alaarm-ka (12-Hour AM/PM)</span>
                    </label>
                    {newTaskDueTime ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-mono font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-400/40">
                          ⏰ {format24To12Display(newTaskDueTime)} (Alaarm)
                        </span>
                        <button
                          type="button"
                          onClick={() => setNewTaskDueTime('')}
                          className="text-[10px] text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded font-bold cursor-pointer"
                          title="Tirtir saacadda"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Ikhtiyaari</span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Saacadda
                      </span>
                      <select
                        value={parse24To12(newTaskDueTime || '09:30').hour12}
                        onChange={(e) => {
                          const current = parse24To12(newTaskDueTime || '09:30');
                          const h = Number(e.target.value);
                          const time24 = build24TimeFrom12(h, current.minute, current.ampm);
                          setNewTaskDueTime(time24);
                        }}
                        className="w-full bg-slate-900 border border-teal-500/40 rounded-xl px-2 py-2 text-sm font-mono font-black text-white focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                      >
                        {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => (
                          <option key={h} value={h}>
                            {String(h).padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Daqiiqadda
                      </span>
                      <select
                        value={parse24To12(newTaskDueTime || '09:30').minute}
                        onChange={(e) => {
                          const current = parse24To12(newTaskDueTime || '09:30');
                          const m = Number(e.target.value);
                          const time24 = build24TimeFrom12(current.hour12, m, current.ampm);
                          setNewTaskDueTime(time24);
                        }}
                        className="w-full bg-slate-900 border border-teal-500/40 rounded-xl px-2 py-2 text-sm font-mono font-black text-white focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                      >
                        {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                          <option key={m} value={m}>
                            {String(m).padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Xilliga
                      </span>
                      <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-xl border border-teal-500/40">
                        {(['AM', 'PM'] as const).map((period) => {
                          const current = parse24To12(newTaskDueTime || '09:30');
                          const isSelected = current.ampm === period && !!newTaskDueTime;
                          return (
                            <button
                              key={period}
                              type="button"
                              onClick={() => {
                                const time24 = build24TimeFrom12(current.hour12, current.minute, period);
                                setNewTaskDueTime(time24);
                              }}
                              className={`py-1.5 rounded-lg font-mono text-xs font-black transition cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-400 text-slate-950 shadow'
                                  : 'text-slate-300 hover:text-white'
                              }`}
                            >
                              {period}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-teal-500/20">
                    {[
                      { label: '⏰ 09:30 PM (Alaarm)', time: '21:30' },
                      { label: '🌅 04:30 AM (Fajr)', time: '04:30' },
                      { label: '🌞 12:30 PM (Duhur)', time: '12:30' },
                      { label: '🌤️ 03:30 PM (Casar)', time: '15:30' },
                      { label: '🌇 06:00 PM (Maqrib)', time: '18:00' },
                      { label: '🌙 07:45 PM (Cishe)', time: '19:45' },
                    ].map((p) => (
                      <button
                        key={p.time}
                        type="button"
                        onClick={() => setNewTaskDueTime(p.time)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer active:scale-95 ${
                          newTaskDueTime === p.time
                            ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                            : 'bg-white/5 text-slate-300 border-white/10 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Maalinta 📅
                  </label>
                  <input
                    type="date"
                    style={{ colorScheme: 'dark' }}
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-teal-500/40 text-white text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
              </div>

              {/* Notes / Details */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Faahfaahin ama Qoraal Dheeraad ah
                </label>
                <textarea
                  rows={2}
                  value={newTaskDetails}
                  onChange={(e) => setNewTaskDetails(e.target.value)}
                  placeholder="Xusuusin dheeraad ah oo kusaabsan hawshan..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-teal-500/40 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              {/* Image Attachment */}
              <div className="p-4 rounded-2xl bg-black/40 border border-teal-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-teal-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Lifaaqa Sawirka
                    </span>
                  </div>
                  {newTaskImage && (
                    <button
                      type="button"
                      onClick={() => setNewTaskImage(null)}
                      className="text-[11px] text-rose-400 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Tirtir sawirka</span>
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={modalFileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {newTaskImage ? (
                  <div className="space-y-2">
                    <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-teal-500/40 bg-black">
                      <img
                        src={newTaskImage}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <input
                      type="text"
                      value={newTaskImageCaption}
                      onChange={(e) => setNewTaskImageCaption(e.target.value)}
                      placeholder="Qor sharaxaad gaaban oo sawirka ah (caption)..."
                      className="w-full px-3 py-2 rounded-xl bg-black/80 border border-teal-500/30 text-white text-xs placeholder:text-slate-500"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isCompressingImage}
                    onClick={() => modalFileInputRef.current?.click()}
                    className="w-full py-5 rounded-2xl border-2 border-dashed border-teal-500/40 hover:border-teal-400 bg-teal-500/5 hover:bg-teal-500/10 text-teal-200 transition flex flex-col items-center justify-center gap-2 text-xs font-bold active:scale-95 touch-manipulation cursor-pointer"
                  >
                    <div className="p-2.5 rounded-2xl bg-teal-500/20 text-teal-300">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <span>
                      {isCompressingImage
                        ? 'Sawirka waa la diyaarinayaa...'
                        : 'Dooro Sawir ama Kaamirada ku qaad 📸'}
                    </span>
                  </button>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs cursor-pointer"
                >
                  Ka Laabo
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs hover:brightness-110 shadow-lg shadow-emerald-500/20 transition active:scale-95 touch-manipulation cursor-pointer"
                >
                  {editingTaskId ? 'Keydi Isbeddelka ✓' : 'Keydi Hawsha ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Fullscreen Image Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/95 backdrop-blur-lg animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              type="button"
              className="absolute -top-12 right-0 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
              title="Xir sawirka"
            >
              <X className="w-6 h-6" />
            </button>

            <img
              src={previewImage.url}
              alt={previewImage.title}
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-teal-500/30"
            />

            <div className="mt-3 text-center space-y-1">
              <h4 className="text-base font-bold text-white">{previewImage.title}</h4>
              {previewImage.caption && (
                <p className="text-xs text-teal-200 italic">{previewImage.caption}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
