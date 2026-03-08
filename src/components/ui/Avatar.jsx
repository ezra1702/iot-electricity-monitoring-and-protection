/**
 * User avatar — shows uploaded photo or gradient initials fallback.
 */
export function Avatar({ user, size = 32, radius = 10, fontSize = 13 }) {
  if (user?.photo) {
    return (
      <img
        src={user.photo}
        alt={user.name}
        style={{
          width: size, height: size, borderRadius: radius,
          objectFit: "cover", flexShrink: 0,
          border: "2px solid rgba(249,115,22,.4)",
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size, height: size, borderRadius: radius, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize, fontWeight: 700, color: "#fff",
        background: "linear-gradient(135deg,#fb923c,#c2410c)",
      }}
    >
      {user?.name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}
