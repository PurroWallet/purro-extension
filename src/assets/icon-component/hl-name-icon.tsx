import { cn } from "@/client/lib/utils";

// You can customize the SVG size here
const HL_NAME_ICON_SIZE = 500;

export const HlNameIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      version="1.1"
      id="Layer_1"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      x="0px"
      y="0px"
      viewBox={`0 0 ${HL_NAME_ICON_SIZE} ${HL_NAME_ICON_SIZE}`}
      enableBackground={`new 0 0 ${HL_NAME_ICON_SIZE} ${HL_NAME_ICON_SIZE}`}
      xmlSpace="preserve"
      className={cn(className)}
    >
      {/* Ellipses */}
      <ellipse
        className="st1"
        cx="182.8"
        cy="249.7"
        rx="44"
        ry="63.6"
        fill="#FFFFFF"
      />
      <ellipse
        className="st1"
        cx="317.2"
        cy="249.7"
        rx="44"
        ry="63.6"
        fill="#FFFFFF"
      />
      {/* Gradients */}
      <defs>
        <linearGradient
          id="SVGID_1_"
          gradientUnits="userSpaceOnUse"
          x1="250"
          y1="499.7026"
          x2="250"
          y2="-0.2974"
        >
          <stop offset="8.527564e-07" stopColor="#71C494" />
          <stop offset="0.3161" stopColor="#36629B" />
          <stop offset="0.6529" stopColor="#36629B" />
          <stop offset="1" stopColor="#71C494" />
        </linearGradient>
      </defs>
      {/* Main Path */}
      <path
        className="st0"
        d="M217.6,78.9c0,0-118.1-55.6-195.9,140.8s69.8,304.3,183.7,272.9C150,461.6,38.6,419.3,54.8,302.3
        S155.9,115.1,217.6,78.9z M282.4,420.3c0,0,118.1,55.6,195.9-140.8S408.5-24.7,294.6,6.6C350,37.5,461.4,79.9,445.2,196.8
        S344.1,384,282.4,420.3z M420.6,217.3c0,0,55.6-118.1-140.8-195.9S-24.4,91.2,6.9,205.1C37.8,149.7,80.2,38.3,197.1,54.5
        S384.3,155.6,420.6,217.3z M79.4,282.1c0,0-55.6,118.1,140.8,195.9s304.3-69.8,272.9-183.7c-30.9,55.4-73.2,166.8-190.2,150.6
        S115.7,343.8,79.4,282.1z"
        fill="url(#SVGID_1_)"
      />
    </svg>
  );
};
