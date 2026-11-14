import { listTasks, currentTask, takeTask, leaveTask, pickFree, addTask, finishTask } from "./tasks.ts";
import { json, body } from "./today.ts";
import { cleanName } from "./database.ts";

const msgFor = (es: boolean, t: any, name: string) => {
  const others = t.people.filter((p: string) => p.toLowerCase() !== name.toLowerCase()).slice(0, 2);
  const where = t.place || (es ? "la mesa de entrada" : "the front table");
  const w = others.length ? (es ? " con " : " with ") + others.join(es ? " y " : " and ") : "";
  return es ? `Ve a ${where}. ${t.title}${w}.` : `Head to ${where}. ${t.title}${w}.`;
};

export function handleTasksGet(url: URL, headers: Record<string, string>): Response {
  const name = cleanName(url.searchParams.get("name") || "");
  return json({ tasks: listTasks(), mine: name ? currentTask(name) : null }, 200, headers);
}

export async function handleTaskTake(req: Request, headers: Record<string, string>): Promise<Response> {
  const b = await body(req);
  const name = cleanName(String(b.name || ""));
  if (!name) return json({ error: "Name needed" }, 400, headers);
  const r = takeTask(name, Number(b.task_id));
  if ("error" in r) return json({ error: r.error }, 409, headers);
  return json({ task: r.task, tasks: listTasks(), mine: currentTask(name) }, 200, headers);
}

export async function handleTaskDone(req: Request, headers: Record<string, string>): Promise<Response> {
  const b = await body(req);
  const name = cleanName(String(b.name || ""));
  if (!name) return json({ error: "Name needed" }, 400, headers);
  leaveTask(name);
  const next = b.next ? pickFree(name) : null;
  if (next) takeTask(name, next.id);
  return json({ tasks: listTasks(), mine: currentTask(name) }, 200, headers);
}

export async function handleTaskFree(req: Request, headers: Record<string, string>): Promise<Response> {
  const b = await body(req);
  const name = cleanName(String(b.name || ""));
  if (!name) return json({ error: "Name needed" }, 400, headers);
  const es = b.lang === "es";
  const pick = pickFree(name);
  if (!pick) {
    const m = es ? "Ahora no hay tareas libres. Pregunta en la mesa de entrada." : "No open tasks right now. Ask at the front table.";
    return json({ task: null, message: m, speak_url: speakUrl(m, es), tasks: listTasks(), mine: currentTask(name) }, 200, headers);
  }
  const r = takeTask(name, pick.id);
  const t = "task" in r ? r.task : pick;
  const m = msgFor(es, t, name);
  return json({ task: t, message: m, speak_url: speakUrl(m, es), tasks: listTasks(), mine: currentTask(name) }, 200, headers);
}

const speakUrl = (m: string, es: boolean) => process.env.ELEVENLABS_API_KEY ? "/api/speak?lang=" + (es ? "es" : "en") + "&text=" + encodeURIComponent(m) : null;

export async function handleStaffTaskAdd(req: Request, headers: Record<string, string>): Promise<Response> {
  const b = await body(req);
  const id = addTask(String(b.title || ""), String(b.place || ""), Number(b.needed) || 1);
  return id ? json({ id, tasks: listTasks() }, 200, headers) : json({ error: "Title needed" }, 400, headers);
}

export async function handleStaffTaskDone(req: Request, headers: Record<string, string>): Promise<Response> {
  const b = await body(req);
  const ok = finishTask(Number(b.id));
  return json({ success: ok, tasks: listTasks() }, ok ? 200 : 404, headers);
}
