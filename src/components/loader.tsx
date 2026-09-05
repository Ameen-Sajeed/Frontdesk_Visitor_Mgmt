export function Loader({ label }: { label?: string }) {
  return (
    <span className="loader" role="status" aria-label={label}>
      <span className="loader-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {label && <span>{label}</span>}
    </span>
  );
}
