"use client";

import { useEffect, useState, type ReactNode } from "react";
import { visitorRegistrationSchema } from "@/lib/validation";

type Department = { id: string; name: string; employees: { id: string; name: string }[] };
type FieldName = keyof typeof visitorRegistrationSchema.shape;
type FormValues = Record<FieldName, string>;
type VisitorMatch = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  company: string | null;
};
const initialValues: FormValues = {
  fullName: "",
  phone: "",
  email: "",
  company: "",
  purpose: "",
  departmentId: "",
  hostId: "",
  type: "WALK_IN",
};

export function RegisterVisitor({ departments }: { departments: Department[] }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<FormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [matches, setMatches] = useState<VisitorMatch[]>([]);
  const selected = departments.find((item) => item.id === values.departmentId);

  useEffect(() => {
    const phone = values.phone.trim();
    if (phone.replace(/\D/g, "").length < 4) {
      setMatches([]);
      return;
    }
    let isCurrent = true;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/visitors?phone=${encodeURIComponent(phone)}`);
        if (isCurrent && response.ok) setMatches(await response.json());
      } catch {
        if (isCurrent) setMatches([]);
      }
    }, 300);
    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [values.phone]);

  function resetModal() {
    setOpen(false);
    setValues(initialValues);
    setMatches([]);
    setFieldErrors({});
    setError("");
  }
  function clearFieldError(name: string) {
    setFieldErrors((current) => {
      const { [name]: removed, ...remaining } = current;
      return remaining;
    });
  }
  function updateField(name: FieldName, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    clearFieldError(name);
  }
  function validateField(name: FieldName, value: string) {
    const result = visitorRegistrationSchema.partial().safeParse({ [name]: value });
    const message = result.success ? undefined : result.error.flatten().fieldErrors[name]?.[0];
    setFieldErrors((current) => {
      if (!message) {
        const { [name]: removed, ...remaining } = current;
        return remaining;
      }
      return { ...current, [name]: message };
    });
  }
  function chooseReturningVisitor(visitor: VisitorMatch) {
    setValues((current) => ({
      ...current,
      fullName: visitor.fullName,
      email: visitor.email ?? "",
      company: visitor.company ?? "",
    }));
    setMatches([]);
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const validation = visitorRegistrationSchema.safeParse(values);
    if (!validation.success) {
      setFieldErrors(
        Object.fromEntries(
          Object.entries(validation.error.flatten().fieldErrors).map(([name, messages]) => [
            name,
            messages?.[0] ?? "Please check this field.",
          ]),
        ),
      );
      return;
    }
    setSaving(true);
    setFieldErrors({});
    try {
      const response = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      resetModal();
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
          setValues(initialValues);
          setMatches([]);
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
                  value={values.fullName}
                  error={fieldErrors.fullName}
                  onChange={updateField}
                  onBlur={validateField}
                />
                <Field
                  label="Phone number"
                  name="phone"
                  type="tel"
                  required
                  value={values.phone}
                  error={fieldErrors.phone}
                  onChange={updateField}
                  onBlur={validateField}
                >
                  {matches.length > 0 && (
                    <div className="lookup-results" role="listbox" aria-label="Returning visitors">
                      {matches.map((visitor) => (
                        <button
                          key={visitor.id}
                          type="button"
                          onClick={() => chooseReturningVisitor(visitor)}
                        >
                          <strong>{visitor.fullName}</strong>
                          <span>
                            {visitor.phone}
                            {visitor.company ? ` · ${visitor.company}` : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </Field>
                <Field
                  label="Email address"
                  name="email"
                  type="email"
                  value={values.email}
                  error={fieldErrors.email}
                  onChange={updateField}
                  onBlur={validateField}
                />
                <Field
                  label="Company name"
                  name="company"
                  value={values.company}
                  error={fieldErrors.company}
                  onChange={updateField}
                  onBlur={validateField}
                />
                <Field
                  label="Purpose of visit"
                  name="purpose"
                  required
                  full
                  value={values.purpose}
                  error={fieldErrors.purpose}
                  onChange={updateField}
                  onBlur={validateField}
                />
                <SelectField
                  label="Department"
                  name="departmentId"
                  value={values.departmentId}
                  error={fieldErrors.departmentId}
                  onChange={(value) => {
                    updateField("departmentId", value);
                    updateField("hostId", "");
                  }}
                  onBlur={validateField}
                >
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="Person to meet"
                  name="hostId"
                  value={values.hostId}
                  error={fieldErrors.hostId}
                  disabled={!selected}
                  onChange={(value) => updateField("hostId", value)}
                  onBlur={validateField}
                >
                  <option value="">Select host</option>
                  {selected?.employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="Visit type"
                  name="type"
                  value={values.type}
                  onChange={(value) => updateField("type", value)}
                  onBlur={validateField}
                >
                  <option value="WALK_IN">Walk-in</option>
                  <option value="APPOINTMENT">Appointment</option>
                </SelectField>
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

type FieldProps = {
  label: string;
  name: FieldName;
  required?: boolean;
  type?: string;
  full?: boolean;
  value: string;
  error?: string;
  onChange: (name: FieldName, value: string) => void;
  onBlur: (name: FieldName, value: string) => void;
  children?: ReactNode;
};
function Field({
  label,
  name,
  required,
  type = "text",
  full,
  value,
  error,
  onChange,
  onBlur,
  children,
}: FieldProps) {
  return (
    <div className={`field ${full ? "full" : ""}`}>
      <label>{label}</label>
      <input
        name={name}
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(name, event.target.value)}
        onBlur={(event) => onBlur(name, event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {error && (
        <p className="error" id={`${name}-error`}>
          {error}
        </p>
      )}
      {children}
    </div>
  );
}
function SelectField({
  label,
  name,
  value,
  error,
  disabled,
  onChange,
  onBlur,
  children,
}: Omit<FieldProps, "type" | "full" | "required"> & { disabled?: boolean }) {
  return (
    <div className="field">
      <label>{label}</label>
      <select
        name={name}
        value={value}
        disabled={disabled}
        required={name !== "type"}
        onChange={(event) => onChange(name, event.target.value)}
        onBlur={(event) => onBlur(name, event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
      >
        {children}
      </select>
      {error && (
        <p className="error" id={`${name}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
