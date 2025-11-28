import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@ui/index";
import { Button } from "@ui/index";

interface OTPInputProps {
  mobileNumber: string;
  onSendOTP: ({
    content,
    tool_use_id,
    tool_use_params,
  }: {
    content: string;
    tool_use_id?: string;
    tool_use_params?: any;
  }) => void;
  onEditMobile?: () => void;
  onResendOTP?: () => void;
  isLoading?: boolean;
  error?: string | null;
  resendCountdown?: number;
  disabled?: boolean;
}

export function OTPInput({
  mobileNumber,
  onSendOTP,
  //   onEditMobile,
  //   onResendOTP,
  isLoading = false,
  error = null,
  //   resendCountdown = 0,
  disabled = false,
}: OTPInputProps) {
  const [otp, setOtp] = useState("");

  // Common className for OTP slots to avoid repetition
  const otpSlotClassName =
    "min-w-[2.5rem] w-full max-w-[4rem] h-10 sm:h-12 text-center text-base sm:text-lg font-semibold border-2 border-[var(--color-border)] rounded-lg data-[active=true]:border-[var(--color-primary)] data-[active=true]:ring-2 data-[active=true]:ring-[var(--color-primary)]/20 flex-1";

  const handleOTPChange = (value: string) => {
    setOtp(value);
    // Auto-submit when 6 digits are entered
    if (value.length === 6) {
      onSendOTP({ content: value });
    }
  };

  const handleSendClick = () => {
    if (otp.length === 6) {
      onSendOTP({ content: otp });
    }
  };

  //   const handleResendClick = () => {
  //     if (resendCountdown === 0) {
  //       onResendOTP?.();
  //     }
  //   };

  return (
    <div className="px-4 py-3 space-y-4">
      {/* Mobile number display with edit option */}
      <div className="flex items-center justify-start px-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--color-muted-foreground)]">
            OTP sent to {mobileNumber}
          </span>
          {/* <button
            onClick={onEditMobile}
            className="p-1 hover:bg-[var(--color-accent)] rounded-full transition-colors"
            disabled={disabled}>
            <Edit3 className="h-3 w-3 text-[var(--color-muted-foreground)]" />
          </button> */}
        </div>
      </div>

      {/* OTP Input */}
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        <InputOTP
          maxLength={6}
          value={otp}
          onChange={handleOTPChange}
          disabled={disabled || isLoading}
          autoFocus>
          <InputOTPGroup className="gap-1 sm:gap-2">
            <InputOTPSlot index={0} className={otpSlotClassName} />
            <InputOTPSlot index={1} className={otpSlotClassName} />
            <InputOTPSlot index={2} className={otpSlotClassName} />
            <InputOTPSlot index={3} className={otpSlotClassName} />
            <InputOTPSlot index={4} className={otpSlotClassName} />
            <InputOTPSlot index={5} className={otpSlotClassName} />
          </InputOTPGroup>
        </InputOTP>

        {/* Send Button */}
        <Button
          onClick={handleSendClick}
          disabled={otp.length !== 6 || disabled || isLoading}
          size="sm"
          className="h-10 w-10 sm:h-12 sm:w-12 p-0 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 rounded-full flex-shrink-0">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary-foreground)]" />
          ) : (
            <Send className="h-4 w-4 text-[var(--color-primary-foreground)]" />
          )}
        </Button>

        {/* Resend Button */}
        {/* <button
          onClick={handleResendClick}
          disabled={resendCountdown > 0 || disabled || isLoading}
          className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 disabled:text-[var(--color-muted-foreground)] disabled:cursor-not-allowed transition-colors">
          {resendCountdown > 0 ? `Resend (${resendCountdown})` : "Resend"}
        </button> */}
      </div>

      {/* Error Message */}
      {error && <div className="text-sm text-red-500 text-center">{error}</div>}
    </div>
  );
}
