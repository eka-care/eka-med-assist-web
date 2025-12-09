import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { Input } from "@ui/index";
import { Button } from "@ui/index";

interface MobileNumberInputProps {
  onSendMobile: ({
    content,
    tool_use_id,
    tool_use_params,
  }: {
    content: string;
    tool_use_id?: string;
    tool_use_params?: any;
  }) => void;
  isLoading?: boolean;
  error?: string | null;
  disabled?: boolean;
  placeholder?: string;
}

export function MobileNumberInput({
  onSendMobile,
  isLoading = false,
  error = null,
  disabled = false,
  placeholder = "Mobile Number",
}: MobileNumberInputProps) {
  const [mobileNumber, setMobileNumber] = useState("");
  //   const [countryCode, setCountryCode] = useState("+91");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ""); // Only allow digits
    setMobileNumber(value);
  };

  const handleSendClick = () => {
    if (mobileNumber.length === 10) {
      onSendMobile({ content: mobileNumber });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && mobileNumber.length === 10) {
      handleSendClick();
    }
  };

  const isValidMobile = mobileNumber.length === 10;

  return (
    <div className="px-4 py-3 space-y-4">
      {/* Mobile Number Input */}
      <div className="flex items-center gap-3">
        {/* Country Code Selector */}
        <Button
          variant="outline"
          size="sm"
          className="h-12 px-3 flex items-center gap-2 border-[var(--color-border)] hover:bg-[var(--color-accent)] rounded-xl"
          disabled={disabled}>
          <img
            src={import.meta.env.BASE_URL + "assets/indian-flag.svg"}
            alt="Indian flag"
            className="w-4 h-4 rounded-full"
          />
          <span className="text-sm font-medium">+91</span>
        </Button>

        {/* Mobile Number Input */}
        <div className="flex-1">
          <Input
            ref={inputRef}
            type="tel"
            value={mobileNumber}
            onChange={handleMobileChange}
            onKeyPress={handleKeyPress}
            placeholder={isLoading ? "Sending OTP..." : placeholder}
            disabled={disabled || isLoading}
            className="h-12 rounded-xl text-base border-[var(--color-muted-foreground)] focus:border-[var(--color-primary-primary)] focus:ring-2 focus:ring-[var(--color-primary-primary)]/20 bg-[var(--color-input)]"
            maxLength={10}
          />
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSendClick}
          disabled={!isValidMobile || disabled || isLoading}
          size="sm"
          className="h-12 w-12 p-0 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 rounded-lg">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary-foreground)]" />
          ) : (
            <Send className="h-4 w-4 text-[var(--color-primary-foreground)]" />
          )}
        </Button>
      </div>

      {/* Error Message */}
      {error && <div className="text-sm text-red-500 text-center">{error}</div>}
    </div>
  );
}
