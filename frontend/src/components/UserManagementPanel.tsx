"use client";

import { FormEvent, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { KeyRound, Loader2, PencilLine, Plus, Search, UserRound, X } from "lucide-react";
import {
  AccessMatrix, AdminUserCreatePayload, AdminUserUpdatePayload, createManagedUser,
  CurrentUser, getUsers, rotateUserAccessCode, updateManagedUser, UserRole,
} from "@/lib/api";
import { CREATABLE_ROLE_OPTIONS, permissionLabel, ROLE_LABELS, ROLE_OPTIONS } from "@/lib/access";

const userDate = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "America/Bogota" });

interface UserManagementPanelProps {
  token: string;
  currentUserId: number;
  users: CurrentUser[];
  accessMatrix: AccessMatrix | null;
  canManage: boolean;
  pendingResetCount: number;
  onUsersChange: (users: CurrentUser[]) => void;
  onError: (message: string) => void;
}

interface UserEditorDialogProps {
  user: CurrentUser | null;
  currentUserId: number;
  accessMatrix: AccessMatrix | null;
  onClose: () => void;
  onSubmit: (payload: AdminUserCreatePayload | AdminUserUpdatePayload) => Promise<void>;
}

function UserEditorDialog({ user, currentUserId, accessMatrix, onClose, onSubmit }: UserEditorDialogProps) {
  const isEditing = Boolean(user);
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [role, setRole] = useState<UserRole>(user?.role || "buyer");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(user?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modulesConfirmed, setModulesConfirmed] = useState(false);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape" && !saving) onClose(); }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, saving]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!isEditing && password.length < 12) {
      setError("La contraseña temporal debe contener al menos 12 caracteres.");
      return;
    }
    if (requiresModuleConfirmation && !modulesConfirmed) {
      setError("Confirma los módulos y permisos asignados antes de guardar.");
      return;
    }
    setSaving(true); setError("");
    try {
      if (isEditing) {
        await onSubmit({ email: email.trim(), full_name: fullName.trim(), role, is_active: isActive });
      } else {
        await onSubmit({ email: email.trim(), full_name: fullName.trim(), role, password, is_active: isActive });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el usuario");
    } finally { setSaving(false); }
  }

  const roleOptions = isEditing ? ROLE_OPTIONS : CREATABLE_ROLE_OPTIONS;
  const editingSelf = user?.id === currentUserId;
  const rolePermissions = accessMatrix?.[role] || [];
  const requiresModuleConfirmation = !isEditing || role !== user?.role;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="user-editor-title" className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-stone-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-stone-100 p-6 sm:p-8">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Administración de acceso</p><h3 id="user-editor-title" className="mt-1 text-2xl font-black">{isEditing ? "Editar usuario" : "Crear usuario"}</h3><p className="mt-2 text-sm text-stone-500">{isEditing ? "Actualiza identidad, rol y estado de la cuenta." : "La contraseña temporal debe tener al menos 12 caracteres."}</p></div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Cerrar formulario" className="rounded-xl border border-stone-200 p-2 text-stone-500 hover:bg-stone-50"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-semibold text-stone-700">Nombre completo<input autoFocus required value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" /></label>
            <label className="text-sm font-semibold text-stone-700">Correo electrónico<input required type="email" autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" /></label>
            <label className="text-sm font-semibold text-stone-700">Rol<select required disabled={editingSelf} value={role} onChange={(event) => { setRole(event.target.value as UserRole); setModulesConfirmed(false); }} className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-stone-100">{roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{editingSelf && <span className="mt-1 block text-xs font-normal text-stone-500">Otro administrador debe modificar tu rol.</span>}</label>
            {!isEditing && <label className="text-sm font-semibold text-stone-700">Contraseña temporal<input required minLength={12} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} onInvalid={(event) => { event.preventDefault(); setError("La contraseña temporal debe contener al menos 12 caracteres."); }} placeholder="Mínimo 12 caracteres" className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" /></label>}
          </div>
          <fieldset className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:p-5">
            <legend className="px-1 text-sm font-bold text-stone-900">Módulos concedidos a {ROLE_LABELS[role]}</legend>
            {accessMatrix ? <><p className="mt-1 text-xs text-stone-500">{rolePermissions.length} permisos definidos por la matriz RBAC del backend.</p><div className="mt-4 flex flex-wrap gap-2">{rolePermissions.map((permission) => <span key={permission} className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700" title={permission}>{permissionLabel(permission)}</span>)}</div></> : <p role="alert" className="mt-2 text-sm text-amber-800">No fue posible cargar la matriz de acceso. Recarga el panel antes de crear usuarios.</p>}
            {requiresModuleConfirmation && accessMatrix && <label className="mt-5 flex items-start gap-3 border-t border-stone-200 pt-4"><input required type="checkbox" checked={modulesConfirmed} onChange={(event) => setModulesConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-700" /><span className="text-xs leading-5 text-stone-600"><strong className="text-stone-900">Confirmo la asignación.</strong> Revisé los módulos de {ROLE_LABELS[role]} y autorizo este nivel de acceso.</span></label>}
          </fieldset>
          <label className={`mt-6 flex items-start gap-3 rounded-2xl border p-4 ${editingSelf ? "cursor-not-allowed border-stone-200 bg-stone-50" : "border-stone-200"}`}><input type="checkbox" checked={isActive} disabled={editingSelf} onChange={(event) => setIsActive(event.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-700" /><span><span className="block text-sm font-bold">Cuenta activa</span><span className="mt-1 block text-xs text-stone-500">{editingSelf ? "No puedes desactivar tu propia sesión administrativa." : "Las cuentas inactivas no pueden iniciar sesión."}</span></span></label>
          {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-bold text-stone-700 hover:bg-stone-50">Cancelar</button><button type="submit" disabled={saving || !accessMatrix} className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-950 px-5 py-3 text-sm font-bold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear usuario"}</button></div>
        </form>
      </div>
    </div>
  );
}

export function UserManagementPanel({ token, currentUserId, users, accessMatrix, canManage, pendingResetCount, onUsersChange, onError }: UserManagementPanelProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; user: CurrentUser | null } | null>(null);
  const [accessCode, setAccessCode] = useState<{ email: string; value: string } | null>(null);
  const [feedback, setFeedback] = useState("");
  const closeEditor = useCallback(() => setEditor(null), []);

  const filteredUsers = useMemo(() => {
    if (!deferredQuery) return users;
    return users.filter((user) => `${user.full_name || ""} ${user.email} ${ROLE_LABELS[user.role]}`.toLowerCase().includes(deferredQuery));
  }, [deferredQuery, users]);

  async function saveUser(payload: AdminUserCreatePayload | AdminUserUpdatePayload) {
    if (editor?.mode === "create") {
      const created = await createManagedUser(token, payload as AdminUserCreatePayload);
      try {
        onUsersChange(await getUsers(token));
        setFeedback(`Usuario ${created.email} creado y sincronizado correctamente.`);
      } catch {
        onUsersChange([...users, created].toSorted((left, right) => left.email.localeCompare(right.email)));
        setFeedback(`Usuario ${created.email} creado. No fue posible recargar el listado completo; usa “Actualizar usuarios”.`);
      }
      return;
    }
    if (editor?.user) {
      const updated = await updateManagedUser(token, editor.user.id, payload as AdminUserUpdatePayload);
      try { onUsersChange(await getUsers(token)); }
      catch { onUsersChange(users.map((item) => item.id === updated.id ? updated : item)); }
      setFeedback(`Usuario ${updated.email} actualizado correctamente.`);
    }
  }

  async function refreshUsers() {
    setFeedback("");
    try {
      onUsersChange(await getUsers(token));
      setFeedback("Listado de usuarios sincronizado con la base de datos.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo actualizar el listado de usuarios");
    }
  }

  async function rotateCode(user: CurrentUser) {
    if (!window.confirm(`¿Generar un nuevo código temporal para ${user.email}? El anterior dejará de funcionar.`)) return;
    try {
      const result = await rotateUserAccessCode(token, user.id);
      setAccessCode({ email: user.email, value: result.access_code });
    } catch (err) { onError(err instanceof Error ? err.message : "No se pudo generar el código"); }
  }

  return (
    <section aria-labelledby="users-title">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Administración de acceso</p><h2 id="users-title" className="mt-1 text-3xl font-black">Usuarios y perfiles</h2><p className="mt-2 text-sm text-stone-500">{users.length} cuentas visibles · {users.filter((user) => user.is_active).length} activas.</p></div>
        <div className="flex flex-col gap-3 sm:flex-row"><label className="relative"><span className="sr-only">Buscar usuarios</span><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-stone-400" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nombre, correo o rol" className="w-full rounded-xl border border-stone-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 sm:w-64" /></label><button type="button" onClick={refreshUsers} className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-50">Actualizar usuarios</button>{canManage && <button type="button" onClick={() => { setFeedback(""); setEditor({ mode: "create", user: null }); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-stone-800"><Plus className="h-4 w-4" /> Crear usuario</button>}</div>
      </div>

      {feedback && <p role="status" className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{feedback}</p>}
      {pendingResetCount > 0 && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>{pendingResetCount}</strong> solicitudes de recuperación están pendientes de revisión administrativa.</div>}
      {accessCode && <div role="status" className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-start gap-3"><KeyRound className="mt-0.5 h-5 w-5 text-emerald-800" /><div><p className="text-sm font-bold text-emerald-950">Código temporal para {accessCode.email}</p><code className="mt-2 inline-block rounded-lg bg-white px-3 py-2 text-sm font-bold text-stone-950">{accessCode.value}</code><p className="mt-2 text-xs text-emerald-800">Se muestra una sola vez. Entrégalo por un canal seguro.</p></div></div></div>}

      <div className="mt-7 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500"><tr><th className="px-5 py-4">Usuario</th><th className="px-5 py-4">Rol</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4">Creación</th><th className="px-5 py-4 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-stone-100">{filteredUsers.map((user) => <tr key={user.id}><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-600"><UserRound className="h-4 w-4" /></span><div><p className="font-bold text-stone-900">{user.full_name || "Sin nombre"}</p><p className="mt-0.5 text-xs text-stone-500">{user.email}</p></div></div></td><td className="px-5 py-4 font-semibold">{ROLE_LABELS[user.role]}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.is_active ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-600"}`}>{user.is_active ? "Activo" : "Inactivo"}</span></td><td className="whitespace-nowrap px-5 py-4 text-xs text-stone-500">{userDate.format(new Date(user.created_at))}</td><td className="px-5 py-4"><div className="flex justify-end gap-2">{canManage && <><button onClick={() => setEditor({ mode: "edit", user })} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-xs font-bold hover:bg-stone-50"><PencilLine className="h-3.5 w-3.5" /> Editar</button><button onClick={() => rotateCode(user)} className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-bold hover:bg-stone-50">Código</button></>}</div></td></tr>)}</tbody></table></div>
        {filteredUsers.length === 0 && <div className="p-10 text-center"><UserRound className="mx-auto h-7 w-7 text-stone-300" /><p className="mt-3 text-sm font-bold text-stone-700">No se encontraron usuarios</p><p className="mt-1 text-xs text-stone-500">Ajusta la búsqueda o crea una cuenta nueva.</p></div>}
      </div>

      {editor && <UserEditorDialog key={`${editor.mode}-${editor.user?.id || "new"}`} user={editor.user} currentUserId={currentUserId} accessMatrix={accessMatrix} onClose={closeEditor} onSubmit={saveUser} />}
    </section>
  );
}
