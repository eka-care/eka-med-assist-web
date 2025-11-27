import { useMemo, useState } from "react";
import LabPackageCard from "./lab-package-card";
import { TLabPackage } from "@/types/widget";
import { Button } from "@/components/ui/button";

type LabPackageListProps = {
  packages?: TLabPackage[];
  disabled?: boolean;
  onBook?: (pkg: TLabPackage) => void;
};

export function LabPackageList({
  packages = [],
  disabled,
  onBook,
}: LabPackageListProps) {
  const [displayCount, setDisplayCount] = useState(2);
  const displayedPackages = packages.slice(0, displayCount);
  const remainingCount = useMemo(() =>Math.min(packages.length - displayCount, 2), [packages.length, displayCount]);

  if (!packages.length) {
    return (
      <div className="py-4 text-center text-sm text-slate-500">
        No lab packages available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayedPackages.map((pkg, index) => (
        <LabPackageCard
          key={`${pkg.package_name ?? "pkg"}-${index}`}
          data={pkg}
          disabled={disabled}
          onBook={onBook}
        />
      ))}

      {/* Show More Button */}
      {displayCount < packages.length && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setDisplayCount((p) => p + Math.min(packages.length - p, 2))}
            disabled={disabled}
            className="px-6 py-2">
            Show more ({remainingCount} more)
          </Button>
        </div>
      )}
    </div>
  );
}

export default LabPackageList;
