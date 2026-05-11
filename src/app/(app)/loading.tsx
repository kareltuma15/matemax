import { SkeletonCard, SkeletonLine, SkeletonAvatar } from "@/components/Skeleton";

export default function AppLoading() {
  return (
    <div className="flex flex-col gap-4 pt-2">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 mb-2">
        <SkeletonAvatar size={40} />
        <div className="flex flex-col gap-2 flex-1">
          <SkeletonLine width="40%" height="1.1rem" />
          <SkeletonLine width="25%" height="0.75rem" />
        </div>
      </div>

      {/* Card skeletons */}
      <SkeletonCard>
        <SkeletonLine width="50%" height="1rem" />
        <SkeletonLine width="80%" height="0.85rem" />
        <SkeletonLine width="60%" height="0.85rem" />
      </SkeletonCard>

      <SkeletonCard>
        <SkeletonLine width="35%" height="1rem" />
        <SkeletonLine width="90%" height="3rem" />
      </SkeletonCard>

      <SkeletonCard>
        <SkeletonLine width="45%" height="1rem" />
        <div className="flex gap-2">
          <SkeletonLine width="30%" height="2rem" />
          <SkeletonLine width="30%" height="2rem" />
          <SkeletonLine width="30%" height="2rem" />
        </div>
      </SkeletonCard>
    </div>
  );
}
