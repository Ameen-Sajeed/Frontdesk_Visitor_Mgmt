"use client";
import { useState } from "react";
import { visitorRegistrationSchema } from "@/lib/validation";

type Department = { id: string; name: string; employees: { id: string; name: string }[] };
type FieldName = keyof typeof visitorRegistrationSchema.shape;

export function RegisterVisitor({ departments }: { departments: Department[] }) {
  const [open, setOpen] = useState(false);
  const [departmentId, setDepartmentId] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const selected = departments.find((item) => item.id === departmentId);

  function resetModal() {
    setOpen(false);
    setDepartmentId("");
    setError("");
    setFieldErrors({});
  }

  function clearFieldError(name: string) {
    setFieldErrors((current) => {
      const { [name]: removed, ...remaining } = current;
      return remaining;
    });
  }

  function validateField(name: FieldName, value: string) {
    const validation = visitorRegistrationSchema.partial().safeParse({ [name]: value });
    const message = validation.success
      ? undefined
      : validation.error.flatten().fieldErrors[name]?.[0];

    setFieldErrors((current) => {
      if (!message) {
        const { [name]: removed, ...remaining } = current;
        return remaining;
      }
      return { ...current, [name]: message };
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form);

    const validation = visitorRegistrationSchema.safeParse(payload);
    if (!validation.success) {
      const errors = Object.fromEntries(
        Object.entries(validation.error.flatten().fieldErrors).map(([name, messages]) => [
          name,
          messages?.[0] ?? "Please check this field.",
        ]),
      );
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    setFieldErrors({});
    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setOpen(false);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register the visitor.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <button
        className="primary"
        onClick={() => {
          setFieldErrors({});
          setError("");
          setOpen(true);
        }}
      >
        + Register visitor
      </button>
      {open && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Register visitor">
          <div className="modal">
            <div className="modal-head">
              <div>
                <h2>Register a visitor</h2>
                <p className="small">Their department will receive an approval request.</p>
              </div>
              <button className="icon-button" onClick={resetModal} aria-label="Close">
                ×
              </button>
            </div>
            <form className="form" onSubmit={submit} noValidate>
              <div className="grid">
                <Field
                  label="Full name"
                  name="fullName"
                  required
                  error={fieldErrors.fullName}
                  onChange={clearFieldError}
                  onBlur={validateField}
                />
                <Field
                  label="Phone number"
                  name="phone"
                  type="number"
                  required
                  error={fieldErrors.phone}
                  onChange={clearFieldError}
                  onBlur={validateField}
                />
                <Field
                  label="Email address"
                  name="email"
                  type="email"
                  error={fieldErrors.email}
                  onChange={clearFieldError}
                  onBlur={validateField}
                />
                <Field
                  label="Company name"
                  name="company"
                  error={fieldErrors.company}
                  onChange={clearFieldError}
                  onBlur={validateField}
                />
                <Field
                  label="Purpose of visit"
                  name="purpose"
                  required
                  full
                  error={fieldErrors.purpose}
                  onChange={clearFieldError}
                  onBlur={validateField}
                />
                <div className="field">
                  <label>Department</label>
                  <select
                    name="departmentId"
                    required
                    value={departmentId}
                    onChange={(e) => {
                      setDepartmentId(e.target.value);
                      clearFieldError("departmentId");
                    }}
                    onBlur={(e) => validateField("departmentId", e.target.value)}
                    aria-invalid={Boolean(fieldErrors.departmentId)}
                    aria-describedby={fieldErrors.departmentId ? "departmentId-error" : undefined}
                  >
                    <option value="">Select department</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.departmentId && (
                    <p className="error" id="departmentId-error">
                      {fieldErrors.departmentId}
                    </p>
                  )}
                </div>
                <div className="field">
                  <label>Person to meet</label>
                  <select
                    key={departmentId}
                    name="hostId"
                    required
                    disabled={!selected}
                    onChange={() => clearFieldError("hostId")}
                    onBlur={(e) => validateField("hostId", e.target.value)}
                    aria-invalid={Boolean(fieldErrors.hostId)}
                    aria-describedby={fieldErrors.hostId ? "hostId-error" : undefined}
                  >
                    <option value="">Select host</option>
                    {selected?.employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.hostId && (
                    <p className="error" id="hostId-error">
                      {fieldErrors.hostId}
                    </p>
                  )}
                </div>
                <div className="field">
                  <label>Visit type</label>
                  <select name="type" defaultValue="WALK_IN">
                    <option value="WALK_IN">Walk-in</option>
                    <option value="APPOINTMENT">Appointment</option>
                  </select>
                </div>
              </div>
              {error && (
                <p className="error" style={{ marginTop: 15 }}>
                  {error}
                </p>
              )}
              <div className="form-actions">
                <button className="secondary" type="button" onClick={resetModal}>
                  Cancel
                </button>
                <button className="primary" disabled={saving}>
                  {saving ? "Registering…" : "Register visitor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
function Field({
  label,
  name,
  required,
  type = "text",
  full = false,
  error,
  onChange,
  onBlur,
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  full?: boolean;
  error?: string;
  onChange: (name: string) => void;
  onBlur: (name: FieldName, value: string) => void;
}) {
  return (
    <div className={`field ${full ? "full" : ""}`}>
      <label>{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        onChange={() => onChange(name)}
        onBlur={(event) => onBlur(name as FieldName, event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {error && (
        <p className="error" id={`${name}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
