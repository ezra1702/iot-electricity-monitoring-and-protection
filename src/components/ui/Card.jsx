/**
 * Base card container with consistent border, shadow, and background.
 */
export function Card({ children, style = {}, onClick, onMouseEnter, onMouseLeave }) {
  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        background: "var(--card)",
        border: "1px solid var(--bd)",
        borderRadius: 16,
        boxShadow: "var(--shadow)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
