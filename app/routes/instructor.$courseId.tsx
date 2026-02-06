import { useState, useRef, useEffect } from "react";
import { Link, useFetcher } from "react-router";
import { toast } from "sonner";
import type { Route } from "./+types/instructor.$courseId";
import {
  getCourseById,
  getCourseWithDetails,
  updateCourse,
  updateCourseStatus,
  getLessonCountForCourse,
} from "~/services/courseService";
import {
  createModule,
  updateModuleTitle,
  deleteModule,
  getModuleById,
} from "~/services/moduleService";
import {
  createLesson,
  updateLessonTitle,
  deleteLesson,
  getLessonById,
} from "~/services/lessonService";
import { getEnrollmentCountForCourse } from "~/services/enrollmentService";
import { getCurrentUserId } from "~/lib/session";
import { getUserById } from "~/services/userService";
import { CourseStatus, UserRole } from "~/db/schema";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  ArrowLeft,
  BookOpen,
  Circle,
  Clock,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { data } from "react-router";

export function meta({ data: loaderData }: Route.MetaArgs) {
  const title = loaderData?.course?.title ?? "Edit Course";
  return [
    { title: `Edit: ${title} — Ralph` },
    { name: "description", content: `Edit course: ${title}` },
  ];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const currentUserId = await getCurrentUserId(request);

  if (!currentUserId) {
    throw data("Select a user from the DevUI panel to manage courses.", {
      status: 401,
    });
  }

  const user = getUserById(currentUserId);

  if (!user || user.role !== UserRole.Instructor) {
    throw data("Only instructors can access this page.", {
      status: 403,
    });
  }

  const courseId = parseInt(params.courseId, 10);
  if (isNaN(courseId)) {
    throw data("Invalid course ID.", { status: 400 });
  }

  const course = getCourseWithDetails(courseId);

  if (!course) {
    throw data("Course not found.", { status: 404 });
  }

  if (course.instructorId !== currentUserId) {
    throw data("You can only edit your own courses.", { status: 403 });
  }

  const lessonCount = getLessonCountForCourse(courseId);
  const enrollmentCount = getEnrollmentCountForCourse(courseId);

  return { course, lessonCount, enrollmentCount };
}

export async function action({ params, request }: Route.ActionArgs) {
  const currentUserId = await getCurrentUserId(request);

  if (!currentUserId) {
    throw data("You must be logged in.", { status: 401 });
  }

  const user = getUserById(currentUserId);
  if (!user || user.role !== UserRole.Instructor) {
    throw data("Only instructors can edit courses.", { status: 403 });
  }

  const courseId = parseInt(params.courseId, 10);
  if (isNaN(courseId)) {
    throw data("Invalid course ID.", { status: 400 });
  }

  const course = getCourseById(courseId);
  if (!course) {
    throw data("Course not found.", { status: 404 });
  }

  if (course.instructorId !== currentUserId) {
    throw data("You can only edit your own courses.", { status: 403 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "update-title") {
    const title = (formData.get("title") as string)?.trim();
    if (!title) {
      return data({ error: "Title cannot be empty." }, { status: 400 });
    }
    updateCourse(courseId, title, course.description);
    return { success: true, field: "title" };
  }

  if (intent === "update-description") {
    const description = (formData.get("description") as string)?.trim();
    if (!description) {
      return data(
        { error: "Description cannot be empty." },
        { status: 400 }
      );
    }
    updateCourse(courseId, course.title, description);
    return { success: true, field: "description" };
  }

  if (intent === "update-status") {
    const status = formData.get("status") as CourseStatus;
    if (
      !status ||
      ![CourseStatus.Draft, CourseStatus.Published, CourseStatus.Archived].includes(status)
    ) {
      return data({ error: "Invalid status." }, { status: 400 });
    }
    updateCourseStatus(courseId, status);
    return { success: true, field: "status" };
  }

  if (intent === "add-module") {
    const title = (formData.get("title") as string)?.trim();
    if (!title) {
      return data({ error: "Module title cannot be empty." }, { status: 400 });
    }
    createModule(courseId, title, null);
    return { success: true, field: "module" };
  }

  if (intent === "rename-module") {
    const moduleId = parseInt(formData.get("moduleId") as string, 10);
    const title = (formData.get("title") as string)?.trim();
    if (isNaN(moduleId)) {
      return data({ error: "Invalid module ID." }, { status: 400 });
    }
    if (!title) {
      return data({ error: "Module title cannot be empty." }, { status: 400 });
    }
    const mod = getModuleById(moduleId);
    if (!mod || mod.courseId !== courseId) {
      return data({ error: "Module not found in this course." }, { status: 404 });
    }
    updateModuleTitle(moduleId, title);
    return { success: true, field: "module" };
  }

  if (intent === "delete-module") {
    const moduleId = parseInt(formData.get("moduleId") as string, 10);
    if (isNaN(moduleId)) {
      return data({ error: "Invalid module ID." }, { status: 400 });
    }
    const mod = getModuleById(moduleId);
    if (!mod || mod.courseId !== courseId) {
      return data({ error: "Module not found in this course." }, { status: 404 });
    }
    deleteModule(moduleId);
    return { success: true, field: "module" };
  }

  if (intent === "add-lesson") {
    const moduleId = parseInt(formData.get("moduleId") as string, 10);
    const title = (formData.get("title") as string)?.trim();
    if (isNaN(moduleId)) {
      return data({ error: "Invalid module ID." }, { status: 400 });
    }
    if (!title) {
      return data({ error: "Lesson title cannot be empty." }, { status: 400 });
    }
    const mod = getModuleById(moduleId);
    if (!mod || mod.courseId !== courseId) {
      return data({ error: "Module not found in this course." }, { status: 404 });
    }
    createLesson(moduleId, title, null, null, null, null);
    return { success: true, field: "lesson" };
  }

  if (intent === "rename-lesson") {
    const lessonId = parseInt(formData.get("lessonId") as string, 10);
    const title = (formData.get("title") as string)?.trim();
    if (isNaN(lessonId)) {
      return data({ error: "Invalid lesson ID." }, { status: 400 });
    }
    if (!title) {
      return data({ error: "Lesson title cannot be empty." }, { status: 400 });
    }
    const lesson = getLessonById(lessonId);
    if (!lesson) {
      return data({ error: "Lesson not found." }, { status: 404 });
    }
    // Verify lesson belongs to a module in this course
    const mod = getModuleById(lesson.moduleId);
    if (!mod || mod.courseId !== courseId) {
      return data({ error: "Lesson not found in this course." }, { status: 404 });
    }
    updateLessonTitle(lessonId, title);
    return { success: true, field: "lesson" };
  }

  if (intent === "delete-lesson") {
    const lessonId = parseInt(formData.get("lessonId") as string, 10);
    if (isNaN(lessonId)) {
      return data({ error: "Invalid lesson ID." }, { status: 400 });
    }
    const lesson = getLessonById(lessonId);
    if (!lesson) {
      return data({ error: "Lesson not found." }, { status: 404 });
    }
    const mod = getModuleById(lesson.moduleId);
    if (!mod || mod.courseId !== courseId) {
      return data({ error: "Lesson not found in this course." }, { status: 404 });
    }
    deleteLesson(lessonId);
    return { success: true, field: "lesson" };
  }

  throw data("Invalid action.", { status: 400 });
}

function InlineEditableTitle({
  value,
  courseId,
}: {
  value: string;
  courseId: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const fetcher = useFetcher();

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      toast.success("Title saved.");
    }
  }, [fetcher.state, fetcher.data]);

  // Update local state when server responds with new data
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  function handleSave() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== value) {
      fetcher.submit(
        { intent: "update-title", title: trimmed },
        { method: "post" }
      );
    }
    setIsEditing(false);
  }

  function handleCancel() {
    setEditValue(value);
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-3xl font-bold outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="group flex w-full items-start gap-2 rounded-md px-3 py-1.5 text-left hover:bg-muted"
    >
      <h1 className="flex-1 text-3xl font-bold">{value}</h1>
      <Pencil className="mt-2 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function InlineEditableDescription({
  value,
  courseId,
}: {
  value: string;
  courseId: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fetcher = useFetcher();

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
      // Auto-resize
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [isEditing]);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      toast.success("Description saved.");
    }
  }, [fetcher.state, fetcher.data]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  function handleSave() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== value) {
      fetcher.submit(
        { intent: "update-description", description: trimmed },
        { method: "post" }
      );
    }
    setIsEditing(false);
  }

  function handleCancel() {
    setEditValue(value);
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  }

  if (isEditing) {
    return (
      <div>
        <textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => {
            setEditValue(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          rows={3}
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Press Ctrl+Enter to save, Escape to cancel
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="group flex w-full items-start gap-2 rounded-md px-3 py-1.5 text-left hover:bg-muted"
    >
      <p className="flex-1 text-sm text-muted-foreground">{value}</p>
      <Pencil className="mt-0.5 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function InlineEditableModuleTitle({
  value,
  moduleId,
}: {
  value: string;
  moduleId: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const fetcher = useFetcher();

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  function handleSave() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== value) {
      fetcher.submit(
        { intent: "rename-module", moduleId: String(moduleId), title: trimmed },
        { method: "post" }
      );
    }
    setIsEditing(false);
  }

  function handleCancel() {
    setEditValue(value);
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full rounded-md border border-input bg-background px-2 py-1 text-base font-semibold outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="group flex items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-muted"
    >
      <h3 className="font-semibold">{value}</h3>
      <Pencil className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function DeleteModuleButton({ moduleId, moduleTitle }: { moduleId: number; moduleTitle: string }) {
  const [confirming, setConfirming] = useState(false);
  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      toast.success("Module deleted.");
    }
  }, [fetcher.state, fetcher.data]);

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-destructive">Delete "{moduleTitle}"?</span>
        <Button
          variant="destructive"
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            fetcher.submit(
              { intent: "delete-module", moduleId: String(moduleId) },
              { method: "post" }
            );
            setConfirming(false);
          }}
        >
          Confirm
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}

function AddModuleForm() {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fetcher = useFetcher();

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  // Reset form after successful submission
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      setTitle("");
      setIsAdding(false);
      toast.success("Module added.");
    }
  }, [fetcher.state, fetcher.data]);

  function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    fetcher.submit(
      { intent: "add-module", title: trimmed },
      { method: "post" }
    );
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      setTitle("");
      setIsAdding(false);
    }
  }

  if (!isAdding) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsAdding(true)}
        className="mt-4"
      >
        <Plus className="mr-1.5 size-4" />
        Add Module
      </Button>
    );
  }

  return (
    <div className="mt-4 flex items-center gap-2">
      <Input
        ref={inputRef}
        type="text"
        placeholder="Module title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        className="max-w-xs"
      />
      <Button size="sm" onClick={handleSubmit} disabled={!title.trim()}>
        Add
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setTitle("");
          setIsAdding(false);
        }}
      >
        Cancel
      </Button>
    </div>
  );
}

function InlineEditableLessonTitle({
  value,
  lessonId,
}: {
  value: string;
  lessonId: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const fetcher = useFetcher();

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  function handleSave() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== value) {
      fetcher.submit(
        { intent: "rename-lesson", lessonId: String(lessonId), title: trimmed },
        { method: "post" }
      );
    }
    setIsEditing(false);
  }

  function handleCancel() {
    setEditValue(value);
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="group flex items-center gap-1.5 rounded-md px-1 py-0.5 text-left text-sm hover:bg-muted"
    >
      <span className="flex-1">{value}</span>
      <Pencil className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function DeleteLessonButton({ lessonId, lessonTitle }: { lessonId: number; lessonTitle: string }) {
  const [confirming, setConfirming] = useState(false);
  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      toast.success("Lesson deleted.");
    }
  }, [fetcher.state, fetcher.data]);

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-destructive">Delete?</span>
        <Button
          variant="destructive"
          size="sm"
          className="h-6 text-xs"
          onClick={() => {
            fetcher.submit(
              { intent: "delete-lesson", lessonId: String(lessonId) },
              { method: "post" }
            );
            setConfirming(false);
          }}
        >
          Confirm
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="size-3.5" />
    </Button>
  );
}

function AddLessonForm({ moduleId }: { moduleId: number }) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fetcher = useFetcher();

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      setTitle("");
      setIsAdding(false);
      toast.success("Lesson added.");
    }
  }, [fetcher.state, fetcher.data]);

  function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    fetcher.submit(
      { intent: "add-lesson", moduleId: String(moduleId), title: trimmed },
      { method: "post" }
    );
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      setTitle("");
      setIsAdding(false);
    }
  }

  if (!isAdding) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsAdding(true)}
        className="mt-2 text-muted-foreground"
      >
        <Plus className="mr-1 size-3.5" />
        Add Lesson
      </Button>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <Input
        ref={inputRef}
        type="text"
        placeholder="Lesson title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        className="max-w-xs text-sm"
      />
      <Button size="sm" className="h-8" onClick={handleSubmit} disabled={!title.trim()}>
        Add
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8"
        onClick={() => {
          setTitle("");
          setIsAdding(false);
        }}
      >
        Cancel
      </Button>
    </div>
  );
}

function statusBadgeColor(status: string) {
  switch (status) {
    case CourseStatus.Published:
      return "text-green-800 dark:text-green-400";
    case CourseStatus.Draft:
      return "text-yellow-800 dark:text-yellow-400";
    case CourseStatus.Archived:
      return "text-gray-800 dark:text-gray-400";
    default:
      return "";
  }
}

export default function InstructorCourseEditor({
  loaderData,
}: Route.ComponentProps) {
  const { course, lessonCount, enrollmentCount } = loaderData;
  const statusFetcher = useFetcher();

  useEffect(() => {
    if (statusFetcher.state === "idle" && statusFetcher.data?.success) {
      toast.success("Course status updated.");
    }
  }, [statusFetcher.state, statusFetcher.data]);

  function handleStatusChange(newStatus: string) {
    statusFetcher.submit(
      { intent: "update-status", status: newStatus },
      { method: "post" }
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link to="/instructor" className="hover:text-foreground">
          My Courses
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{course.title}</span>
      </nav>

      <Link
        to="/instructor"
        className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 size-4" />
        Back to My Courses
      </Link>

      {/* Course Header with inline editing */}
      <div className="mb-8">
        <InlineEditableTitle value={course.title} courseId={course.id} />
        <div className="mt-2">
          <InlineEditableDescription
            value={course.description}
            courseId={course.id}
          />
        </div>

        {/* Stats row */}
        <div className="mt-4 flex flex-wrap items-center gap-4 px-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <BookOpen className="size-4" />
            {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="size-4" />
            {enrollmentCount}{" "}
            {enrollmentCount === 1 ? "student" : "students"}
          </span>
          <span className="text-xs text-muted-foreground">
            Slug: /courses/{course.slug}
          </span>
        </div>
      </div>

      {/* Status + Actions */}
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Status:</span>
          <Select
            value={course.status}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CourseStatus.Draft}>Draft</SelectItem>
              <SelectItem value={CourseStatus.Published}>
                Published
              </SelectItem>
              <SelectItem value={CourseStatus.Archived}>
                Archived
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Link to={`/courses/${course.slug}`}>
          <Button variant="outline" size="sm">
            View Public Page
          </Button>
        </Link>
      </div>

      {/* Course Content */}
      <div>
        <h2 className="mb-4 text-2xl font-bold">Course Content</h2>
        {course.modules.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <BookOpen className="mx-auto mb-3 size-8 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                No modules yet. Add your first module to start building content.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {course.modules.map((mod) => (
              <Card key={mod.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <InlineEditableModuleTitle
                        value={mod.title}
                        moduleId={mod.id}
                      />
                      <p className="mt-1 px-2 text-sm text-muted-foreground">
                        {mod.lessons.length}{" "}
                        {mod.lessons.length === 1 ? "lesson" : "lessons"}
                      </p>
                    </div>
                    <DeleteModuleButton
                      moduleId={mod.id}
                      moduleTitle={mod.title}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {mod.lessons.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">
                      No lessons yet.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {mod.lessons.map((lesson) => (
                        <li key={lesson.id}>
                          <div className="flex items-center gap-3 px-3 py-1.5 text-sm">
                            <Circle className="size-4 shrink-0 text-muted-foreground" />
                            <div className="flex-1">
                              <InlineEditableLessonTitle
                                value={lesson.title}
                                lessonId={lesson.id}
                              />
                            </div>
                            {lesson.durationMinutes && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="size-3" />
                                {lesson.durationMinutes}m
                              </span>
                            )}
                            <DeleteLessonButton
                              lessonId={lesson.id}
                              lessonTitle={lesson.title}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <AddLessonForm moduleId={mod.id} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <AddModuleForm />
      </div>
    </div>
  );
}
