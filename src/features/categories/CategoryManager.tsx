import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Lock } from "lucide-react";
import { Sheet } from "../../components/ui/Sheet";
import { Field, TextInput } from "../../components/ui/Field";
import { Segmented } from "../../components/ui/Segmented";
import { Button } from "../../components/ui/Button";
import { useSettings } from "../../state/SettingsContext";
import { useToast } from "../../state/ToastContext";
import { useLive } from "../../hooks/useLive";
import { db } from "../../db/db";
import type { Category, TxType } from "../../db/types";
import { createCategory, updateCategory, deleteCategory } from "../../services/categories";
import { getIcon, ICON_KEYS } from "../../lib/icons";
import { withAlpha } from "../../components/CategoryIcon";
import { ConfirmDialog } from "../../components/ui/Dialog";
import { isAppError } from "../../lib/errors";

const COLORS = [
  "#35D39A", "#6EA8FE", "#A78BFA", "#F97316", "#EC4899",
  "#F59E0B", "#22C55E", "#38BDF8", "#14B8A6", "#EF4444", "#64748B", "#8B5CF6",
];

interface CategoryManagerProps {
  open: boolean;
  onClose: () => void;
}

export function CategoryManager({ open, onClose }: CategoryManagerProps) {
  const { t } = useSettings();
  const toast = useToast();
  const categories = useLive<Category[]>(() => db.categories.toArray(), [open], []);

  const [editing, setEditing] = useState<Category | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<TxType>("expense");
  const [icon, setIcon] = useState("shapes");
  const [color, setColor] = useState(COLORS[0]);
  const [nameError, setNameError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const grouped = useMemo(
    () => ({
      expense: categories.filter((c) => c.type === "expense"),
      income: categories.filter((c) => c.type === "income"),
    }),
    [categories],
  );

  const openAdd = () => {
    setEditing(null);
    setType("expense");
    setName("");
    setIcon("shapes");
    setColor(COLORS[0]);
    setNameError(undefined);
    setFormOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setType(cat.type);
    setName(cat.name);
    setIcon(cat.icon);
    setColor(cat.color);
    setNameError(undefined);
    setFormOpen(true);
  };

  const onSave = async () => {
    if (!name.trim()) {
      setNameError(t("cat.validation.name"));
      return;
    }
    setSaving(true);
    try {
      if (editing) await updateCategory(editing.id, { name, type, icon, color });
      else await createCategory({ name, type, icon, color });
      toast.success(t("cat.saved"));
      setFormOpen(false);
    } catch (err) {
      if (isAppError(err) && err.fields?.name) setNameError(t("cat.validation.name"));
      toast.error(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteCategory(confirmDelete.id);
      toast.success(t("cat.deleted"));
    } catch (err) {
      toast.error(isAppError(err) && err.code === "IS_DEFAULT" ? t("cat.builtin") : t("common.error"));
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  return (
    <>
      <Sheet open={open && !formOpen} onClose={onClose} title={t("cat.manage")}>
        <div className="pt-1">
          <Button fullWidth icon={<Plus size={16} />} onClick={openAdd} className="mb-4">
            {t("cat.add")}
          </Button>

          {(["expense", "income"] as TxType[]).map((groupType) => (
            <div key={groupType} className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {t(groupType === "expense" ? "common.expense" : "common.income")}
              </p>
              <ul className="space-y-2">
                {grouped[groupType].map((cat) => {
                  const Icon = getIcon(cat.icon);
                  return (
                    <li key={cat.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface2 px-3 py-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: withAlpha(cat.color, 0.16), color: cat.color }}>
                        <Icon size={17} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">{cat.name}</span>
                      {cat.isDefault ? (
                        <Lock size={15} className="text-muted" aria-label={t("cat.builtin")} />
                      ) : (
                        <span className="flex gap-1">
                          <button onClick={() => openEdit(cat)} className="rounded-full p-2 text-muted hover:text-ink" aria-label={t("common.edit")}>
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => setConfirmDelete(cat)} className="rounded-full p-2 text-muted hover:text-danger" aria-label={t("common.delete")}>
                            <Trash2 size={15} />
                          </button>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </Sheet>

      {/* Add/edit form */}
      <Sheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? t("cat.edit") : t("cat.add")}
        footer={
          <Button fullWidth size="lg" loading={saving} onClick={onSave}>
            {t("common.save")}
          </Button>
        }
      >
        <div className="space-y-4 pt-1">
          <Field label={t("common.name")} error={nameError} required>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} error={nameError} autoFocus />
          </Field>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink">{t("common.type")}</span>
            <Segmented<TxType>
              value={type}
              onChange={setType}
              options={[
                { value: "expense", label: t("common.expense") },
                { value: "income", label: t("common.income") },
              ]}
            />
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink">{t("cat.icon")}</span>
            <div className="grid grid-cols-8 gap-2">
              {ICON_KEYS.map((key) => {
                const Icon = getIcon(key);
                const active = key === icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIcon(key)}
                    className={`flex aspect-square items-center justify-center rounded-xl border ${active ? "border-primary bg-primary/15 text-primary" : "border-line bg-surface2 text-muted"}`}
                    aria-label={key}
                  >
                    <Icon size={17} />
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink">{t("cat.color")}</span>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full border-2 ${c === color ? "border-ink" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        </div>
      </Sheet>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title={t("cat.deleteConfirm.title")}
        body={t("cat.deleteConfirm.body", { name: confirmDelete?.name ?? "" })}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        loading={deleting}
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}
