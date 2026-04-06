interface InkInputProps {
  label: string;
  className?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  name?: string;
  id?: string;
}

export function InkInput({
  label,
  className = "",
  placeholder,
  value,
  onChange,
  type = "text",
  name,
  id,
}: InkInputProps) {
  const inputId = id || name || label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label
        htmlFor={inputId}
        className="font-marker text-lg text-ink"
      >
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="bg-kraft border-0 border-b-3 border-ink font-typewriter text-ink text-base py-2 px-1 outline-none placeholder:text-ink/40 focus:border-punk-pink"
      />
    </div>
  );
}
