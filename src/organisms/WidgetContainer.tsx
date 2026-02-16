/**
 * WidgetContainer.tsx
 * Adapted from synapse-sdk/packages/widget/src/organisms/WidgetContainer.tsx
 *
 * Provides the outermost container for the chat widget with:
 * - Mobile responsiveness and visual viewport handling (keyboard)
 * - Body scroll locking when widget is open
 * - Proper z-index stacking and CSS isolation
 */
import { useEffect, useState, useRef } from "react";
import type { ReactNode } from "react";
import { Card } from "@ui/index";
import { ChatHeader } from "../molecules/chat-header";
import { CONNECTION_STATUS } from "@/types/widget";

type Environment = "development" | "production" | "staging";

interface WidgetContainerProps {
  isOpen: boolean;
  onClose?: () => void;
  onExpand?: () => void;
  onStartNewSession: () => void;
  onMenuAction?: (action: string) => void;
  title: string;
  children: ReactNode;
  sessionId?: string;
  environment?: Environment;
  displayMode?: "full" | "widget";
  connectionStatus?: CONNECTION_STATUS;
  isOnline?: boolean;
  isExpanded?: boolean;
  isFullMode?: boolean;
  footer?: ReactNode;
}

export default function WidgetContainer({
  isOpen,
  onClose,
  onExpand,
  onStartNewSession,
  onMenuAction,
  children,
  title,
  sessionId,
  environment = "production",
  displayMode,
  connectionStatus = CONNECTION_STATUS.CONNECTING,
  isOnline = true,
  isExpanded = false,
  isFullMode = false,
  footer,
}: WidgetContainerProps) {
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      const width = window?.innerWidth ?? 0;
      const userAgent = navigator?.userAgent?.toLowerCase() ?? "";
      const isMobileDevice =
        width < 768 ||
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          userAgent
        ) ||
        displayMode === "full";

      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [displayMode]);

  // Handle visual viewport changes (keyboard appearing/disappearing)
  useEffect(() => {
    if (!isOpen || !isMobile || !containerRef.current) return;

    const container = containerRef.current;
    let rafId: number | null = null;
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

    // Use Visual Viewport API if available for better keyboard handling
    if (window.visualViewport) {
      const updateViewport = () => {
        if (container && window.visualViewport) {
          const viewportHeight = window.visualViewport.height;
          const viewportTop = window.visualViewport.offsetTop;

          rafId = requestAnimationFrame(() => {
            container.style.transition = "none";
            container.style.top = `${viewportTop}px`;
            container.style.left = "0";
            container.style.right = "0";
            container.style.bottom = "auto";
            container.style.width = "100vw";
            container.style.height = `${viewportHeight}px`;
            container.style.maxHeight = `${viewportHeight}px`;
            container.style.minHeight = `${viewportHeight}px`;

            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
              container.style.transition = "";
            }, 100);
          });
        }
      };

      const handleResize = () => updateViewport();

      const handleScroll = () => {
        if (container && window.visualViewport) {
          const viewportTop = window.visualViewport.offsetTop;
          rafId = requestAnimationFrame(() => {
            container.style.transition = "none";
            container.style.top = `${viewportTop}px`;
            setTimeout(() => {
              container.style.transition = "";
            }, 50);
          });
        }
      };

      window.visualViewport.addEventListener("resize", handleResize);
      window.visualViewport.addEventListener("scroll", handleScroll);
      updateViewport();

      return () => {
        if (rafId) cancelAnimationFrame(rafId);
        if (resizeTimeout) clearTimeout(resizeTimeout);
        window.visualViewport?.removeEventListener("resize", handleResize);
        window.visualViewport?.removeEventListener("scroll", handleScroll);
      };
    } else {
      // Fallback for browsers without Visual Viewport API
      const handleResize = () => {
        if (container) {
          container.style.transition = "none";
          container.style.top = "0";
          container.style.left = "0";
          container.style.right = "0";
          container.style.bottom = "auto";
          container.style.width = "100vw";
          container.style.height = "100svh";
          container.style.maxHeight = "100svh";
          setTimeout(() => {
            container.style.transition = "";
          }, 100);
        }
      };

      window.addEventListener("resize", handleResize);
      handleResize();

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [isOpen, isMobile]);

  // Lock body scroll when widget is open
  useEffect(() => {
    if (isOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalBodyPaddingRight = document.body.style.paddingRight;
      const originalHtmlOverflow = document.documentElement.style.overflow;

      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;

      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";

      if (scrollbarWidth > 0 && !isMobile) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.body.style.paddingRight = originalBodyPaddingRight;
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [isOpen, isMobile]);

  const containerStyles = isMobile
    ? "fixed inset-0 z-[2147483647] bg-[var(--color-card)] border-border rounded-none flex flex-col h-[100dvh] w-screen py-0 gap-0 overflow-hidden"
    : isExpanded
    ? "fixed inset-4 z-[2147483647] bg-[var(--color-card)] border-border rounded-lg shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] py-0 gap-0"
    : "w-full max-w-sm bg-[var(--color-card)] border-border shadow-lg rounded-lg flex flex-col py-0 gap-0";

  return (
    <div
      ref={containerRef}
      className="medassist-widget-container"
      style={{
        position: "fixed",
        zIndex: 2147483647,
        margin: 0,
        padding: 0,
        ...(isMobile && {
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100vw",
          height: "100svh",
          maxHeight: "100svh",
        }),
      }}>
      <style>{`
        .medassist-widget-container,
        .medassist-widget-container *,
        .medassist-widget-container *::before,
        .medassist-widget-container *::after {
          box-sizing: border-box;
        }
        .medassist-widget-container {
          text-align: left;
          text-decoration: none;
          list-style: none;
          margin: 0 !important;
          padding: 0 !important;
        }
        @supports (height: 100svh) {
          .medassist-widget-container {
            max-height: 100svh;
          }
        }
        @media (max-width: 768px) {
          .medassist-widget-container {
            height: 100svh;
            max-height: 100svh;
          }
        }
      `}</style>
      <Card className={containerStyles}>
        {/* Header */}
        <div className="flex-shrink-0 sticky top-0 z-50">
          <ChatHeader
            title={title}
            onClose={onClose}
            onExpand={onExpand}
            onMenuAction={onMenuAction}
            isExpanded={isExpanded}
            isMobile={isMobile}
            onStartSession={onStartNewSession}
            connectionStatus={connectionStatus}
            isOnline={isOnline}
            isFullMode={isFullMode}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {children}
        </div>

        {/* Footer (MessageInput, mobile verification, branding) */}
        {footer && (
          <div className="flex-shrink-0 sticky bottom-0 z-50">{footer}</div>
        )}

        {/* Dev-mode session ID */}
        {sessionId && environment === "development" && (
          <div className="px-4 flex justify-center items-center">
            <p className="text-[8px] text-gray-600 font-mono opacity-50">
              Session ID: {sessionId}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

