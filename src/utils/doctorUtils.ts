// Helper functions for doctor card components
export const getInitials = (name?: string): string => {
  if (!name) return "DR";
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
  const dayNum = date.toLocaleDateString(undefined, { day: "2-digit" });
  return { weekday, dayNum };
};

