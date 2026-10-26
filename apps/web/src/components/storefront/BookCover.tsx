type BookCoverProps = {
  label: string;
  /** Tailwind height class; the box always fills its column width. */
  heightClass?: string;
  className?: string;
};

/** The "[ BOOK ] … Schematic cover" placeholder drawn in every Figma frame. */
export function BookCover({ label, heightClass = "h-36", className }: BookCoverProps) {
  return (
    <div
      role="img"
      aria-label={`Schematic cover: ${label}`}
      className={`flex w-full items-center justify-center border border-line bg-panel p-2 text-center text-sm ${heightClass} ${className ?? ""}`}
    >
      <span aria-hidden="true">
        [ BOOK ]
        <br />
        {label}
        <br />
        Schematic cover
      </span>
    </div>
  );
}
