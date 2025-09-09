import { useEffect, useRef } from "react";

interface ApolloAssistIconProps {
  size?: number;
  className?: string;
}

const ApolloAssistIcon = ({ size = 24, className = "" }: ApolloAssistIconProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const createInlineIcon = () => {
      if (!containerRef.current) return;

      // Calculate scaled dimensions based on size
      const scale = size / 200; // Original animation is 200px
      const blueSize = 80 * scale;
      const yellowSize = 60 * scale;
      const blueLeft = 60 * scale;
      const blueTop = 90 * scale;
      const yellowLeft = 40 * scale;
      const yellowTop = 50 * scale;

      const iconHTML = `
        <div class="apollo-icon-container" style="
          width: ${size}px;
          height: ${size}px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-radius: 50%;
          background: #fff;
        ">
          <div class="apollo-circle blue" style="
            position: absolute;
            border-radius: 50%;
            overflow: hidden;
            width: ${blueSize}px;
            height: ${blueSize}px;
            left: ${blueLeft}px;
            top: ${blueTop}px;
          ">
            <div class="pulse" style="
              position: absolute;
              inset: 0;
              border-radius: 50%;
              will-change: transform;
            ">
              <div class="layer a" style="
                position: absolute;
                inset: 0;
                border-radius: 50%;
                background-size: 200% 200%;
                will-change: opacity, transform, background-position;
                background-image: linear-gradient(0deg, #2582a1, #fdb931);
                animation: spinBlue 16s linear infinite, fadeA 16s ease-in-out infinite;
              "></div>
              <div class="layer b" style="
                position: absolute;
                inset: 0;
                border-radius: 50%;
                background-size: 200% 200%;
                will-change: opacity, transform, background-position;
                background-image: linear-gradient(0deg, #fdb931, #2582a1);
                animation: spinBlue 16s linear infinite, fadeB 16s ease-in-out infinite;
              "></div>
            </div>
          </div>
          
          <div class="apollo-circle yellow" style="
            position: absolute;
            border-radius: 50%;
            overflow: hidden;
            width: ${yellowSize}px;
            height: ${yellowSize}px;
            left: ${yellowLeft}px;
            top: ${yellowTop}px;
          ">
            <div class="pulse" style="
              position: absolute;
              inset: 0;
              border-radius: 50%;
              will-change: transform;
            ">
              <div class="layer a" style="
                position: absolute;
                inset: 0;
                border-radius: 50%;
                background-size: 200% 200%;
                will-change: opacity, transform, background-position;
                background-image: linear-gradient(0deg, #fdb931, #2582a1);
                animation: spinYellow 17s linear infinite 0.8s, fadeB 16s ease-in-out infinite 0.8s;
              "></div>
              <div class="layer b" style="
                position: absolute;
                inset: 0;
                border-radius: 50%;
                background-size: 200% 200%;
                will-change: opacity, transform, background-position;
                background-image: linear-gradient(0deg, #2582a1, #fdb931);
                animation: spinYellow 17s linear infinite 0.8s, fadeA 16s ease-in-out infinite 0.8s;
              "></div>
            </div>
          </div>
        </div>
      `;

      // Add CSS animations if not already present
      const existingStyle = document.getElementById("apollo-icon-styles");
      if (!existingStyle) {
        const styleElement = document.createElement("style");
        styleElement.id = "apollo-icon-styles";
        styleElement.textContent = `
          @keyframes spinBlue {
            0% { transform: rotate(0deg); }
            22% { transform: rotate(147deg); }
            38% { transform: rotate(311deg); }
            61% { transform: rotate(73deg); }
            79% { transform: rotate(222deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes spinYellow {
            0% { transform: rotate(0deg); }
            18% { transform: rotate(260deg); }
            36% { transform: rotate(105deg); }
            59% { transform: rotate(330deg); }
            83% { transform: rotate(185deg); }
            100% { transform: rotate(540deg); }
          }
          
          @keyframes fadeA {
            0%, 35% { opacity: 1; }
            45%, 65% { opacity: 0; }
            100% { opacity: 1; }
          }
          
          @keyframes fadeB {
            0%, 35% { opacity: 0; }
            45%, 65% { opacity: 1; }
            100% { opacity: 0; }
          }
          
          .apollo-circle.blue .pulse {
            animation: pulseBlue 16s ease-in-out infinite;
          }
          
          .apollo-circle.yellow .pulse {
            animation: pulseYellow 16s ease-in-out infinite 0.8s;
          }
          
          @keyframes pulseBlue {
            0%, 35% { transform: scale(1); }
            45% { transform: scale(1.02); }
            55% { transform: scale(0.98); }
            70%, 100% { transform: scale(1); }
          }
          
          @keyframes pulseYellow {
            0%, 20% { transform: scale(1); }
            35% { transform: scale(1.06); }
            55% { transform: scale(0.97); }
            70%, 100% { transform: scale(1); }
          }
        `;
        document.head.appendChild(styleElement);
      }

      // Set the HTML content
      containerRef.current.innerHTML = iconHTML;
    };

    createInlineIcon();
  }, [size]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: size,
        height: size,
        display: "inline-block",
      }}
    />
  );
};

export default ApolloAssistIcon;
