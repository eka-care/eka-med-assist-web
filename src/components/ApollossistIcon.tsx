import { useEffect, useRef, useState } from "react";

interface ApolloAssistIconProps {
  size?: number;
  className?: string;
  isAnimating?: boolean;
}

const ApolloAssistIcon = ({
  size = 24,
  className = "",
  isAnimating = false,
}: ApolloAssistIconProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Animation is active when either prop isAnimating or internal hover state
  const isActive = isAnimating || isHovered;

  useEffect(() => {
    const createInlineIcon = () => {
      if (!containerRef.current) return;

      // Calculate scaled dimensions based on size
      const scale = size / 200; // Original animation is 200px
      const blueSize = 80 * scale;
      const yellowSize = 60 * scale;
      const blueLeft = 70 * scale;
      const blueTop = 80 * scale;
      const yellowLeft = 50 * scale;
      const yellowTop = 40 * scale;

      const iconHTML = `
        <div class="apollo-icon-container ${
          isActive ? "is-active" : ""
        }" style="
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
              <div class="layer" style="
                position: absolute;
                inset: 0;
                border-radius: 50%;
                background-color: #f5ae25;
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
              <div class="layer" style="
                position: absolute;
                inset: 0;
                border-radius: 50%;
                background-color: #fdb931;
              "></div>
            </div>
          </div>
        </div>
      `;

      // Set the HTML content
      containerRef.current.innerHTML = iconHTML;
    };

    createInlineIcon();
  }, [size, isActive]);

  return (
    <>
      <style>
        {`
          :root {
            --apollo-blue: #2582a1;
            --apollo-yellow: #fdb931;
            --apollo-yellow-darker: #f5ae25;
          }

          .apollo-circle {
            position: absolute;
            border-radius: 50%;
            overflow: hidden;
          }

          .apollo-circle .pulse {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            will-change: transform;
            animation: breathe 8s ease-in-out infinite;
          }

          .layer {
            position: absolute;
            inset: 0;
            border-radius: 50%;
          }

          .layer::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background-size: 300% 300%;
            opacity: 0;
            transition: opacity 0.4s ease-in-out;
            will-change: opacity;
          }

          .apollo-circle.blue { 
            width: 80px; 
            height: 80px; 
            left: 70px; 
            top: 80px; 
          }

          .apollo-circle.yellow { 
            width: 60px; 
            height: 60px; 
            left: 50px; 
            top: 40px; 
          }

          .apollo-circle.yellow .pulse {
            animation-delay: -4s;
          }

          .apollo-circle.blue .layer { 
            background-color: var(--apollo-yellow-darker);
          }

          .apollo-circle.yellow .layer { 
            background-color: var(--apollo-yellow);
          }

          .apollo-circle.blue .layer::before {
            background-image: linear-gradient(45deg, var(--apollo-blue), var(--apollo-yellow), var(--apollo-blue)); 
          }

          .apollo-circle.yellow .layer::before {
            background-image: linear-gradient(45deg, transparent 30%, rgba(37, 130, 161, 0.7) 50%, transparent 70%);
          }

          @keyframes breathe {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.03); }
          }

          .apollo-icon-container.is-active .pulse {
            animation: active-pulse 4s ease-in-out infinite, breathe 8s ease-in-out infinite reverse;
          }

          .apollo-icon-container.is-active .layer::before {
            opacity: 1;
            animation: fluid-gradient 4s ease-in-out infinite;
          }

          .apollo-icon-container.is-active .apollo-circle.yellow .pulse,
          .apollo-icon-container.is-active .apollo-circle.yellow .layer::before {
            animation-delay: -2s;
          }

          @keyframes active-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.08); }
            75% { transform: scale(0.95); }
          }

          @keyframes fluid-gradient {
            0%   { background-position: 0% 50%; }
            50%  { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}
      </style>
      <div
        ref={containerRef}
        className={className}
        style={{
          width: size,
          height: size,
          display: "inline-block",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
    </>
  );
};

export default ApolloAssistIcon;
