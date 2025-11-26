import { Building2, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { TLabPackage } from "@/types/widget";

type LabPackageCardProps = {
  data: TLabPackage;
  className?: string;
  disabled?: boolean;
  onBook?: (pkg: TLabPackage) => void;
};

export function LabPackageCard({
  data,
  className,
  disabled,
  onBook,
}: LabPackageCardProps) {
  const { package_name, hospital_name, city, description, link } = data;

  const handleBook = () => {
    if (disabled) return;
    if (onBook) {
      onBook(data);
      return;
    }
    if (link) {
      const win = window.open(link, "_blank", "noopener,noreferrer");
      if (!win) {
        window.location.href = link;
      }
    }
  };

  const showCta = !!link || !!onBook;

  return (
    <Card
      className={cn(
        "w-full max-w-md rounded-xl border border-slate-200 shadow-sm p-0 gap-1",
        className
      )}
      aria-label="Lab package card">
      <CardHeader className="bg-blue-50 p-4">
        {package_name ? (
          <h3 className="text-lg font-bold text-slate-900 leading-snug">
            {package_name}
          </h3>
        ) : null}
      </CardHeader>

      <CardContent className="px-4 py-2">
        {description ? (
          <p className="text-xs leading-relaxed text-slate-500 mb-4">
            {description}
          </p>
        ) : null}

        {/* Info rows */}
        <div className="space-y-2 mb-4">
          {hospital_name ? (
            <div className="flex items-center gap-2 text-sm text-slate-900">
              <Building2
                className="h-4 w-4 text-blue-700 flex-shrink-0"
                aria-hidden
              />
              <span className="text-slate-700">{hospital_name}</span>
            </div>
          ) : null}

          {city ? (
            <div className="flex items-center gap-2 text-sm text-slate-900">
              <MapPin
                className="h-4 w-4 text-blue-700 flex-shrink-0"
                aria-hidden
              />
              <span className="text-slate-700">{city}</span>
            </div>
          ) : null}
        </div>

        <Separator className="bg-slate-200 mb-2" />

        {showCta ? (
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={handleBook}
            className="w-full h-11 rounded-lg border-2 border-blue-500 bg-white text-blue-600 hover:bg-blue-50 disabled:opacity-60">
            Book this Package
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default LabPackageCard;
