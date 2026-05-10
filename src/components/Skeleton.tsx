interface LineProps {
  width?: string;
  height?: string;
  className?: string;
}

export function SkeletonLine({ width = "100%", height = "1rem", className = "" }: LineProps) {
  return <div className={`skeleton ${className}`} style={{ width, height }} />;
}

export function SkeletonCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 p-5 flex flex-col gap-3 ${className}`}>
      {children}
    </div>
  );
}

export function SkeletonAvatar({ size = 56 }: { size?: number }) {
  return <div className="skeleton shrink-0" style={{ width: size, height: size, borderRadius: "50%" }} />;
}
