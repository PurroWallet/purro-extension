import React from 'react';
import hlLogo from '@/assets/logo/hl-mint-logo.png';
// import suiLogo from "@/assets/sui-white-logo.png";
// import solanaLogo from "@/assets/solana-sol-logo.png";
// import ethereumLogo from "@/assets/ethereum-eth-logo.png";
import purroAnimated from '@/assets/gif/purro.gif';

interface UniverseBackgroundProps {
  className?: string;
  children?: React.ReactNode;
}

const UniverseBackground: React.FC<UniverseBackgroundProps> = ({
  className = '',
  children,
}) => {
  const styles = {
    universeContainer: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      overflow: 'hidden' as const,
      background: 'var(--background-color)',
    },
    universeBg: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: `
        radial-gradient(ellipse at center, 
          var(--primary-color-dark) 0%, 
          var(--background-color) 40%, 
          #000 100%
        )
      `,
      zIndex: 1,
    },
    stars: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 2,
    },
    nebula: {
      position: 'absolute' as const,
      borderRadius: '50%',
      filter: 'blur(40px)',
      zIndex: 2,
    },
    shootingStar: {
      position: 'absolute' as const,
      width: '2px',
      height: '2px',
      background: 'var(--primary-color-light)',
      borderRadius: '50%',
      zIndex: 3,
    },
    planet: {
      position: 'absolute' as const,
      borderRadius: '50%',
      zIndex: 2,
    },
    universeContent: {
      position: 'relative' as const,
      zIndex: 10,
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
  };

  return (
    <>
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
          33% { transform: translateY(-20px) translateX(10px) scale(1.1); }
          66% { transform: translateY(10px) translateX(-15px) scale(0.9); }
        }
        
        @keyframes shoot {
          0% {
            transform: translateX(0) translateY(0);
            opacity: 1;
          }
          10% {
            opacity: 1;
          }
          100% {
            transform: translateX(calc(100vw + 100px)) translateY(-200px);
            opacity: 0;
          }
        }
        
        @keyframes orbit {
          0% { transform: rotate(0deg) translateX(50px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(50px) rotate(-360deg); }
        }
        
        .universe-stars-small {
          background-image: 
            radial-gradient(2px 2px at 20px 30px, var(--primary-color-light), transparent),
            radial-gradient(2px 2px at 40px 70px, var(--text-color), transparent),
            radial-gradient(1px 1px at 90px 40px, var(--primary-color-light), transparent),
            radial-gradient(1px 1px at 130px 80px, rgba(240,240,240,0.6), transparent),
            radial-gradient(2px 2px at 160px 30px, var(--text-color), transparent);
          background-repeat: repeat;
          background-size: 200px 100px;
          animation: twinkle 4s infinite;
        }
        
        .universe-stars-medium {
          background-image: 
            radial-gradient(3px 3px at 30px 50px, var(--primary-color-light), transparent),
            radial-gradient(2px 2px at 80px 20px, var(--text-color), transparent),
            radial-gradient(3px 3px at 120px 90px, rgba(143,255,253,0.7), transparent);
          background-repeat: repeat;
          background-size: 300px 150px;
          animation: twinkle 6s infinite reverse;
        }
        
        .universe-stars-large {
          background-image: 
            radial-gradient(4px 4px at 50px 60px, var(--primary-color-light), transparent),
            radial-gradient(3px 3px at 150px 40px, var(--text-color), transparent);
          background-repeat: repeat;
          background-size: 400px 200px;
          animation: twinkle 8s infinite;
        }
        
        .universe-nebula-1 {
          width: 300px;
          height: 200px;
          background: radial-gradient(circle, 
            rgba(8, 139, 136, 0.3) 0%, 
            rgba(22, 98, 96, 0.2) 50%, 
            transparent 70%
          );
          top: 20%;
          left: 10%;
          animation: float 20s infinite ease-in-out;
        }
        
        .universe-nebula-2 {
          width: 250px;
          height: 180px;
          background: radial-gradient(circle, 
            rgba(143, 255, 253, 0.2) 0%, 
            rgba(8, 139, 136, 0.15) 50%, 
            transparent 70%
          );
          top: 60%;
          right: 15%;
          animation: float 20s infinite ease-in-out;
          animation-delay: -7s;
        }
        
        .universe-nebula-3 {
          width: 200px;
          height: 150px;
          background: radial-gradient(circle, 
            rgba(22, 55, 55, 0.4) 0%, 
            rgba(8, 139, 136, 0.2) 50%, 
            transparent 70%
          );
          bottom: 30%;
          left: 60%;
          animation: float 20s infinite ease-in-out;
          animation-delay: -14s;
        }
        
        .universe-shooting-star-1 {
          top: 20%;
          left: -100px;
          animation: shoot 3s infinite linear;
          animation-delay: 1s;
        }
        
        .universe-shooting-star-2 {
          top: 50%;
          left: -100px;
          animation: shoot 4s infinite linear;
          animation-delay: 3s;
        }
        
        .universe-shooting-star-3 {
          top: 80%;
          left: -100px;
          animation: shoot 5s infinite linear;
          animation-delay: 6s;
        }
        
        .universe-planet-1 {
          width: 60px;
          height: 60px;
          background: radial-gradient(circle at 30% 30%, 
            var(--primary-color), 
            var(--primary-color-dark), 
            var(--card-color)
          );
          top: 15%;
          right: 20%;
          box-shadow: 0 0 20px rgba(8, 139, 136, 0.5);
          animation: orbit 40s infinite linear;
        }
        
        .universe-planet-2 {
          width: 40px;
          height: 40px;
         background: radial-gradient(circle at 50% 40%, 
            #4DA2FF 0%,
            #3d88e6 30%,
            #2d6ecc 60%,
            #1d54b3 80%,
            #0d3a99 100%
            );
          bottom: 25%;
          left: 15%;
          box-shadow: 0 0 15px rgba(77, 162, 255, 0.4);
          animation: orbit 60s infinite linear reverse;
        }
        
        .universe-planet-3 {
          width: 40px;
          height: 40px;
          background: radial-gradient(circle at 50% 40%, 
            #4a4a6a 0%,
            #3a3a5a 20%,
            #2a2a4a 40%,
            #1a1a3a 60%,
            #0a0a2a 80%,
            #000000 100%
            );
          top: 70%;
          right: 20%;
          box-shadow: 0 0 10px rgba(22, 55, 55, 0.3);
          animation: orbit 80s infinite linear;
        }

        .universe-planet-4 {
          width: 40px;
          height: 40px;
          background: radial-gradient(circle at 50% 40%, 
            #e6f3ff 0%,
            #b8d4ff 20%,
            #8fb3ff 40%,
            #7b94ff 60%,
            #6c7aff 80%,
            #5d5fff 100%
            );
          top: 30%;
          left: 10%;
          box-shadow: 0 0 10px rgba(22, 55, 55, 0.3);
          animation: orbit 80s infinite linear;
        }

        .purro-animate {
          width: 200px;
          height: 200px;
          animation: float 25s infinite ease-in-out;
          top: 40%;
          left: 20%;
          transform: translate(0, -50%);
          z-index: 5;
        }

        @media (max-width: 768px) {
          .universe-nebula-1, .universe-nebula-2, .universe-nebula-3 {
            width: 150px !important;
            height: 100px !important;
          }
          
          .universe-planet-1 {
            width: 40px !important;
            height: 40px !important;
          }
          
          .universe-planet-2 {
            width: 30px !important;
            height: 30px !important;
          }
          
          .universe-planet-3 {
            width: 30px !important;
            height: 30px !important;
          }

          .purro-animate {
            width: 120px !important;
            height: 120px !important;
            top: 30% !important;
            right: 5% !important;
          }
        }
      `}</style>

      <div className={`${className}`} style={styles.universeContainer}>
        {/* Background gradient */}
        <div style={styles.universeBg} />

        {/* Stars layers */}
        <div className="universe-stars-small" style={styles.stars} />
        <div className="universe-stars-medium" style={styles.stars} />
        <div className="universe-stars-large" style={styles.stars} />

        {/* Nebula effects */}
        <div className="universe-nebula-1" style={styles.nebula} />
        <div className="universe-nebula-2" style={styles.nebula} />
        <div className="universe-nebula-3" style={styles.nebula} />

        {/* Shooting stars */}
        <div className="universe-shooting-star-1" style={styles.shootingStar} />
        <div className="universe-shooting-star-2" style={styles.shootingStar} />
        <div className="universe-shooting-star-3" style={styles.shootingStar} />

        {/* Planets */}
        <div
          className="universe-planet-1 flex items-center justify-center object-contain"
          style={styles.planet}
        >
          <img src={hlLogo} alt="logo" className="size-10" />
        </div>
        <div
          className="universe-planet-2 flex items-center justify-center object-contain"
          style={styles.planet}
        >
          {/* <img src={suiLogo} alt="logo" className="size-6 object-contain" /> */}
        </div>
        <div
          className="universe-planet-3 flex items-center justify-center object-contain"
          style={styles.planet}
        >
          {/* <img src={solanaLogo} alt="logo" className="size-6 object-contain" /> */}
        </div>
        <div
          className="universe-planet-4 flex items-center justify-center object-contain"
          style={styles.planet}
        >
          {/* <img
            src={ethereumLogo}
            alt="logo"
            className="size-6 object-contain"
          /> */}
        </div>

        <div
          className="purro-animate flex items-center justify-center object-contain"
          style={styles.planet}
        >
          <img
            src={purroAnimated}
            alt="purro animated"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Content overlay */}
        {children && <div style={styles.universeContent}>{children}</div>}
      </div>
    </>
  );
};

export default UniverseBackground;
