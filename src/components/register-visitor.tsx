"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { visitorRegistrationSchema } from "@/lib/validation";
import { Loader } from "@/components/loader";
import { useTableNavigation } from "@/components/table-navigation";

type Department = {
  id: string;
  name: string;
  employees: {
    id: string;
    name: string;
    designation?: string | null;
    userId: string | null;
    availabilityStatus: string;
    customStatus: string | null;
    customStatusEmoji: string | null;
  }[];
};
type FieldName = keyof typeof visitorRegistrationSchema.shape;
type FormValues = Record<FieldName, string>;
type VisitorMatch = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  company: string | null;
  designation?: string | null;
};
const initialValues: FormValues = {
  fullName: "",
  phone: "",
  email: "",
  company: "",
  designation: "",
  purpose: "",
  departmentId: "",
  hostId: "",
  type: "WALK_IN",
  priority: "0",
};

export function RegisterVisitor({ departments }: { departments: Department[] }) {
  const { refresh } = useTableNavigation();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<FormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [matches, setMatches] = useState<VisitorMatch[]>([]);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [activeMatch, setActiveMatch] = useState(-1);
  const [returningVisitor, setReturningVisitor] = useState(false);
  const [detailsConfirmed, setDetailsConfirmed] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [availabilityUpdates, setAvailabilityUpdates] = useState<
    Record<
      string,
      {
        availabilityStatus: string;
        customStatus: string | null;
        customStatusEmoji: string | null;
      }
    >
  >({});
  const phoneFieldRef = useRef<HTMLDivElement>(null);
  const selectedPhoneRef = useRef<string | null>(null);
  const selected = departments.find((item) => item.id === values.departmentId);
  const selectedHost = selected?.employees.find((employee) => employee.id === values.hostId);

  useEffect(() => {
    if (!open || !selected) return;
    let active = true;
    fetch(`/api/presence?departmentId=${selected.id}`)
      .then((response) => response.json())
      .then((data) => {
        if (active && Array.isArray(data.onlineUserIds)) setOnlineUserIds(data.onlineUserIds);
      })
      .catch(() => {
        if (active) setOnlineUserIds([]);
      });
    return () => {
      active = false;
    };
  }, [open, selected?.id]);

  useEffect(() => {
    const handlePresence = (event: Event) => {
      const detail = (
        event as CustomEvent<{ userId: string; departmentId?: string; online: boolean }>
      ).detail;
      if (detail.departmentId !== selected?.id) return;
      setOnlineUserIds((current) =>
        detail.online
          ? current.includes(detail.userId)
            ? current
            : [...current, detail.userId]
          : current.filter((id) => id !== detail.userId),
      );
    };
    const handleAvailability = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          userId: string;
          departmentId?: string;
          availabilityStatus: string;
          customStatus: string | null;
          customStatusEmoji: string | null;
        }>
      ).detail;
      if (detail.departmentId !== selected?.id) return;
      setAvailabilityUpdates((current) => ({ ...current, [detail.userId]: detail }));
    };
    window.addEventListener("arrivo:host-presence", handlePresence);
    window.addEventListener("arrivo:host-availability", handleAvailability);
    return () => {
      window.removeEventListener("arrivo:host-presence", handlePresence);
      window.removeEventListener("arrivo:host-availability", handleAvailability);
    };
  }, [selected?.id]);

  useEffect(() => {
    const phone = values.phone.trim();
    if (selectedPhoneRef.current === phone) {
      selectedPhoneRef.current = null;
      return;
    }
    if (phone.replace(/\D/g, "").length < 3) {
      setMatches([]);
      setLookupOpen(false);
      return;
    }
    let isCurrent = true;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/visitors?phone=${encodeURIComponent(phone)}`);
        if (isCurrent && response.ok) {
          const nextMatches = await response.json();
          setMatches(nextMatches);
          setLookupOpen(nextMatches.length > 0);
          setActiveMatch(-1);
          const exactMatch = nextMatches.find(
            (visitor: VisitorMatch) =>
              visitor.phone.replace(/\D/g, "") === phone.replace(/\D/g, ""),
          );
          if (exactMatch) {
            selectedPhoneRef.current = phone;
            setValues((current) => ({
              ...current,
              fullName: exactMatch.fullName,
              email: exactMatch.email ?? "",
              company: exactMatch.company ?? "",
              designation: exactMatch.designation ?? "",
            }));
            setReturningVisitor(true);
            setDetailsConfirmed(false);
          }
        }
      } catch {
        if (isCurrent) {
          setMatches([]);
          setLookupOpen(false);
        }
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
    setLookupOpen(false);
    setFieldErrors({});
    setError("");
    setReturningVisitor(false);
    setDetailsConfirmed(false);
  }
  function clearFieldError(name: string) {
    setFieldErrors((current) => {
      const { [name]: removed, ...remaining } = current;
      return remaining;
    });
  }
  function updateField(name: FieldName, value: string) {
    if (name === "phone") selectedPhoneRef.current = null;
    setValues((current) => ({ ...current, [name]: value }));
    if (name === "phone") {
      setLookupOpen(value.replace(/\D/g, "").length >= 3);
      setActiveMatch(-1);
    }
    clearFieldError(name);
  }
  function chooseReturningVisitor(visitor: VisitorMatch) {
    selectedPhoneRef.current = visitor.phone;
    setValues((current) => ({
      ...current,
      fullName: visitor.fullName,
      email: visitor.email ?? "",
      company: visitor.company ?? "",
      designation: visitor.designation ?? "",
      phone: visitor.phone,
    }));
    setMatches([]);
    setLookupOpen(false);
    setActiveMatch(-1);
    setReturningVisitor(true);
    setDetailsConfirmed(false);
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
    if (returningVisitor && !detailsConfirmed) {
      setError("Confirm the returning visitor details before registering the visit.");
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
      refresh();
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
          setLookupOpen(false);
          setFieldErrors({});
          setError("");
          setReturningVisitor(false);
          setDetailsConfirmed(false);
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
                />
                <div className="field" ref={phoneFieldRef}>
                  <label htmlFor="phone">Phone number</label>
                  <input
                    id="phone"
                    name="phone"
                    type="text"
                    required
                    value={values.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    onFocus={() => matches.length && setLookupOpen(true)}
                    onKeyDown={(event) => {
                      if (!lookupOpen || !matches.length) return;
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setActiveMatch((current) => Math.min(current + 1, matches.length - 1));
                      }
                      if (event.key === "ArrowUp") {
                        event.preventDefault();
                        setActiveMatch((current) => Math.max(current - 1, 0));
                      }
                      if (event.key === "Escape") {
                        setLookupOpen(false);
                      }
                      if (event.key === "Enter" && activeMatch >= 0) {
                        event.preventDefault();
                        chooseReturningVisitor(matches[activeMatch]);
                      }
                    }}
                    aria-invalid={Boolean(fieldErrors.phone)}
                    aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
                  />
                  {fieldErrors.phone && (
                    <p className="error" id="phone-error">
                      {fieldErrors.phone}
                    </p>
                  )}
                  {lookupOpen && matches.length > 0 && (
                    <div className="lookup-results" role="listbox" aria-label="Returning visitors">
                      {matches.map((visitor) => (
                        <button
                          key={visitor.id}
                          type="button"
                          role="option"
                          aria-selected={activeMatch === matches.indexOf(visitor)}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            chooseReturningVisitor(visitor);
                          }}
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
                </div>
                <Field
                  label="Email address"
                  name="email"
                  type="email"
                  value={values.email}
                  error={fieldErrors.email}
                  onChange={updateField}
                />
                <Field
                  label="Company name"
                  name="company"
                  value={values.company}
                  error={fieldErrors.company}
                  onChange={updateField}
                />
                <Field
                  label="Designation"
                  name="designation"
                  value={values.designation}
                  error={fieldErrors.designation}
                  onChange={updateField}
                />
                <SelectField
                  label="Visit type"
                  name="type"
                  value={values.type}
                  onChange={(val) => updateField("type", val)}
                >
                  <option value="WALK_IN">Walk-in</option>
                  <option value="APPOINTMENT">Appointment</option>
                </SelectField>
                <Field
                  label="Purpose of visit"
                  name="purpose"
                  required
                  full
                  value={values.purpose}
                  error={fieldErrors.purpose}
                  onChange={updateField}
                />
                <SelectField
                  label="Department"
                  name="departmentId"
                  value={values.departmentId}
                  error={fieldErrors.departmentId}
                  onChange={(val) => {
                    updateField("departmentId", val);
                    updateField("hostId", "");
                  }}
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
                  onChange={(val) => updateField("hostId", val)}
                >
                  <option value="">Select host</option>
                  {selected?.employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} {employee.designation ? `(${employee.designation})` : ""}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="Initial priority"
                  name="priority"
                  value={values.priority}
                  error={fieldErrors.priority}
                  onChange={(val) => updateField("priority", val)}
                >
                  <option value="0">Normal</option>
                  <option value="1">Medium</option>
                  <option value="2">High</option>
                </SelectField>
                {selectedHost && (
                  <HostAvailability
                    host={selectedHost}
                    online={Boolean(
                      selectedHost.userId && onlineUserIds.includes(selectedHost.userId),
                    )}
                    update={
                      selectedHost.userId ? availabilityUpdates[selectedHost.userId] : undefined
                    }
                  />
                )}
                {returningVisitor && (
                  <label className="returning-visitor-confirmation full">
                    <input
                      type="checkbox"
                      checked={detailsConfirmed}
                      onChange={(event) => setDetailsConfirmed(event.target.checked)}
                    />
                    <span>Returning visitor found. I have confirmed or updated these details.</span>
                  </label>
                )}
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
                  {saving ? <Loader label="Registering" /> : "Register visitor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function HostAvailability({
  host,
  online,
  update,
}: {
  host: Department["employees"][number];
  online: boolean;
  update?: {
    availabilityStatus: string;
    customStatus: string | null;
    customStatusEmoji: string | null;
  };
}) {
  const status = update?.availabilityStatus ?? host.availabilityStatus;
  const customStatus = update?.customStatus ?? host.customStatus;
  const customEmoji = update?.customStatusEmoji ?? host.customStatusEmoji;
  const isAway = status === "AWAY" || status === "CUSTOM";
  const label = !online
    ? "Not currently online"
    : status === "CUSTOM"
      ? `${customEmoji ? `${customEmoji} ` : ""}${customStatus || "Custom status"}`
      : status === "AWAY"
        ? "Away"
        : "Available";

  return (
    <div
      className={`host-availability ${!online ? "offline" : isAway ? "away" : "online"}`}
      role="status"
    >
      <span className="presence-dot" aria-hidden="true" />
      <span>
        <strong>{host.name}</strong> · {label}
      </span>
    </div>
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
  children,
}: {
  label: string;
  name: FieldName;
  value: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <select
        name={name}
        value={value}
        disabled={disabled}
        required={name !== "type"}
        onChange={(event) => onChange(event.target.value)}
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
