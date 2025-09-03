import { useEffect, useState } from "react";

interface TipsDisplayProps {
  tips: string[];
  onTipsExpire?: () => void;
}

export function TipsDisplay({ tips, onTipsExpire }: TipsDisplayProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (tips.length === 0) {
      setVisible(false);
      return;
    }

    // Show tips when they arrive
    setVisible(true);

    // Auto-hide after 7 seconds
    const timer = setTimeout(() => {
      setVisible(false);
      onTipsExpire?.();
    }, 7000);

    return () => clearTimeout(timer);
  }, [tips, onTipsExpire]);

  if (!visible || tips.length === 0) {
    return null;
  }

  return (
    <div className="py-2 space-y-3">
      {/* Main question */}

      {/* Tips section */}
      <div className="flex gap-3">
        {/* Left border line */}
        <div className="w-px bg-gray-300 flex-shrink-0"></div>

        {/* Tips content */}
        <div className="flex-1 space-y-2">
          {tips.map((tip, index) => (
            <div key={index} className="flex items-start gap-2">
              {/* Lightbulb icon */}
              <div className="flex-shrink-0 mt-0.5">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-yellow-500">
                  <path
                    d="M9 21C9 21.55 9.45 22 10 22H14C14.55 22 15 21.55 15 21V20H9V21ZM12 2C8.14 2 5 5.14 5 9C5 11.38 6.19 13.47 8 14.74V17C8 17.55 8.45 18 9 18H15C15.55 18 16 17.55 16 17V14.74C17.81 13.47 19 11.38 19 9C19 5.14 15.86 2 12 2ZM15 13.7L14 14.5V16H10V14.5L9 13.7C7.8 12.8 7 11.4 7 9C7 6.24 9.24 4 12 4S17 6.24 17 9C17 11.4 16.2 12.8 15 13.7Z"
                    fill="currentColor"
                  />
                </svg>
              </div>

              {/* Tip text */}
              <div className="flex-1">
                <span className="text-sm text-gray-600 font-medium">Tip: </span>
                <span className="text-sm text-gray-500 italic">{tip}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
