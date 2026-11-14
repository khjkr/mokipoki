import React from 'react';

export interface AvatarConfig {
  base: 'moki' | 'poki';
  skinColor?: string;
  face: 'smile' | 'wink' | 'sparkle' | 'drowsy' | 'silly';
  backHair?: 'tail' | 'long_twintail' | 'none';
  wings?: 'angel_wings' | 'demon_wings' | 'sparkle_aura' | 'none';
  bottom?: 'denim_pants' | 'pink_overalls' | 'pleated_skirt' | 'none';
  top?: 'mint_hoodie' | 'yellow_knit' | 'striped_tee' | 'sailor_top' | 'none';
  frontHair?: 'comma_bangs' | 'tuft_hair' | 'mini_horn' | 'none';
  headwear?: 'cherry_beanie' | 'brown_beret' | 'cat_ears' | 'flower_pin' | 'round_glasses' | 'none';
  handheld?: 'magic_wand' | 'boba_tea' | 'heart_balloon' | 'gameboy' | 'none';
  bg?: 'pastel_circle' | 'cozy_room' | 'starry_sky' | 'transparent';
  effect?: 'sparkles' | 'hearts' | 'none';
}

export const DEFAULT_AVATAR_MOKI: AvatarConfig = {
  base: 'moki',
  face: 'smile',
  top: 'mint_hoodie',
  headwear: 'cherry_beanie',
  handheld: 'heart_balloon',
  bg: 'pastel_circle',
  effect: 'sparkles'
};

export const DEFAULT_AVATAR_POKI: AvatarConfig = {
  base: 'poki',
  face: 'wink',
  top: 'striped_tee',
  bottom: 'denim_pants',
  headwear: 'cat_ears',
  handheld: 'gameboy',
  bg: 'pastel_circle',
  effect: 'sparkles'
};

interface Props {
  config: AvatarConfig;
  size?: number;
  animated?: boolean;
  className?: string;
  onClick?: () => void;
}

export const AvatarRenderer: React.FC<Props> = ({
  config,
  size = 120,
  animated = true,
  className = '',
  onClick
}) => {
  const isPoki = config.base === 'poki';
  const skin = config.skinColor || (isPoki ? '#FFE8D6' : '#FFF9F2');
  const outline = '#2B2321';

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center select-none ${animated ? 'avatar-float' : ''} ${className}`}
      style={{
        width: size,
        height: size,
        cursor: onClick ? 'pointer' : 'default',
        filter: 'drop-shadow(0 6px 12px rgba(43, 35, 33, 0.08))'
      }}
    >
      <svg
        viewBox="0 0 512 512"
        width="100%"
        height="100%"
        style={{ overflow: 'visible' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="pastelCircle" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF2D6" />
            <stop offset="100%" stopColor="#FFE0B2" />
          </radialGradient>
          <linearGradient id="mintGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#BFF0EA" />
            <stop offset="100%" stopColor="#96E3D8" />
          </linearGradient>
          <linearGradient id="cherryGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FF7B90" />
            <stop offset="100%" stopColor="#E63946" />
          </linearGradient>
          <linearGradient id="knitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFE66D" />
            <stop offset="100%" stopColor="#F4D35E" />
          </linearGradient>
          <linearGradient id="denimGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#A8DADC" />
            <stop offset="100%" stopColor="#457B9D" />
          </linearGradient>
        </defs>

        {/* Z-1: Background */}
        {config.bg === 'pastel_circle' && (
          <circle cx="256" cy="256" r="230" fill="url(#pastelCircle)" opacity="0.85" />
        )}
        {config.bg === 'starry_sky' && (
          <circle cx="256" cy="256" r="230" fill="#2B2D42" />
        )}

        {/* Z-2: Back Hair / Tail */}
        {config.backHair === 'tail' && (
          <path
            d="M 370 340 C 440 330 460 260 410 230 C 370 200 350 250 365 310 Z"
            fill={isPoki ? '#F4A261' : '#E9C46A'}
            stroke={outline}
            strokeWidth="10"
            strokeLinejoin="round"
          />
        )}

        {/* Z-3: Wings / Aura */}
        {config.wings === 'angel_wings' && (
          <g opacity="0.9">
            <path
              d="M 160 250 C 90 220 70 140 140 130 C 180 120 200 170 190 220 Z"
              fill="#FFFFFF"
              stroke={outline}
              strokeWidth="9"
            />
            <path
              d="M 352 250 C 422 220 442 140 372 130 C 332 120 312 170 322 220 Z"
              fill="#FFFFFF"
              stroke={outline}
              strokeWidth="9"
            />
          </g>
        )}

        {/* Z-4: Base Body (KKuTu Moremi SD style) */}
        <g id="base-body">
          {/* Poki bunny/squirrel perky ears */}
          {isPoki && (
            <g>
              <ellipse cx="180" cy="120" rx="36" ry="75" transform="rotate(-15 180 120)" fill={skin} stroke={outline} strokeWidth="11" />
              <ellipse cx="180" cy="120" rx="18" ry="50" transform="rotate(-15 180 120)" fill="#FFCCD5" />
              <ellipse cx="332" cy="120" rx="36" ry="75" transform="rotate(15 332 120)" fill={skin} stroke={outline} strokeWidth="11" />
              <ellipse cx="332" cy="120" rx="18" ry="50" transform="rotate(15 332 120)" fill="#FFCCD5" />
            </g>
          )}

          {/* Moki cute mochi cheek tufts */}
          {!isPoki && (
            <g>
              <ellipse cx="140" cy="270" rx="28" ry="20" fill={skin} stroke={outline} strokeWidth="11" />
              <ellipse cx="372" cy="270" rx="28" ry="20" fill={skin} stroke={outline} strokeWidth="11" />
            </g>
          )}

          {/* Main Round Mochi Head & Chubby Body */}
          <path
            d="M 150 200 C 120 270 120 380 200 420 C 240 435 272 435 312 420 C 392 380 392 270 362 200 C 332 130 180 130 150 200 Z"
            fill={skin}
            stroke={outline}
            strokeWidth="12"
            strokeLinejoin="round"
          />

          {/* Stubby Little Feet */}
          <ellipse cx="205" cy="425" rx="30" ry="18" fill={skin} stroke={outline} strokeWidth="10" />
          <ellipse cx="307" cy="425" rx="30" ry="18" fill={skin} stroke={outline} strokeWidth="10" />

          {/* Stubby Hands */}
          <ellipse cx="145" cy="330" rx="22" ry="22" fill={skin} stroke={outline} strokeWidth="10" />
          <ellipse cx="367" cy="330" rx="22" ry="22" fill={skin} stroke={outline} strokeWidth="10" />
        </g>

        {/* Z-5: Face / Emotions */}
        <g id="face">
          {/* Rosy Cheeks */}
          <ellipse cx="185" cy="295" rx="22" ry="14" fill="#FFAAA6" opacity="0.65" />
          <ellipse cx="327" cy="295" rx="22" ry="14" fill="#FFAAA6" opacity="0.65" />

          {/* Eyes & Mouth per emotion */}
          {config.face === 'smile' && (
            <g>
              <circle cx="200" cy="265" r="13" fill={outline} />
              <circle cx="203" cy="261" r="4.5" fill="#FFFFFF" />
              <circle cx="312" cy="265" r="13" fill={outline} />
              <circle cx="315" cy="261" r="4.5" fill="#FFFFFF" />
              <path d="M 242 290 Q 256 304 270 290" fill="none" stroke={outline} strokeWidth="7" strokeLinecap="round" />
            </g>
          )}

          {config.face === 'wink' && (
            <g>
              <path d="M 188 260 L 210 268 L 188 276" fill="none" stroke={outline} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="312" cy="265" r="14" fill={outline} />
              <circle cx="316" cy="261" r="5" fill="#FFFFFF" />
              <path d="M 240 286 Q 256 312 272 286 Z" fill="#E63946" stroke={outline} strokeWidth="6" />
            </g>
          )}

          {config.face === 'sparkle' && (
            <g>
              <circle cx="200" cy="265" r="17" fill={outline} />
              <polygon points="200,253 204,265 216,265 206,272 210,283 200,276 190,283 194,272 184,265 196,265" fill="#FFF275" />
              <circle cx="312" cy="265" r="17" fill={outline} />
              <polygon points="312,253 316,265 328,265 318,272 322,283 312,276 302,283 306,272 296,265 308,265" fill="#FFF275" />
              <path d="M 244 290 Q 256 308 268 290" fill="none" stroke={outline} strokeWidth="6" strokeLinecap="round" />
            </g>
          )}

          {config.face === 'drowsy' && (
            <g>
              <line x1="185" y1="268" x2="215" y2="268" stroke={outline} strokeWidth="8" strokeLinecap="round" />
              <line x1="297" y1="268" x2="327" y2="268" stroke={outline} strokeWidth="8" strokeLinecap="round" />
              <ellipse cx="256" cy="292" rx="7" ry="8" fill={outline} />
              <text x="340" y="240" fontSize="32" fontWeight="bold" fill="#7209B7">zZ</text>
            </g>
          )}

          {config.face === 'silly' && (
            <g>
              <circle cx="200" cy="265" r="8" fill={outline} />
              <circle cx="312" cy="265" r="8" fill={outline} />
              <path d="M 238 290 Q 248 298 256 290 Q 264 282 274 290" fill="none" stroke={outline} strokeWidth="6" strokeLinecap="round" />
            </g>
          )}
        </g>

        {/* Z-6: Bottom */}
        {config.bottom === 'denim_pants' && (
          <path
            d="M 180 375 C 180 420 220 422 245 422 L 256 395 L 267 422 C 292 422 332 420 332 375 Z"
            fill="url(#denimGrad)"
            stroke={outline}
            strokeWidth="9"
          />
        )}

        {/* Z-7: Top */}
        {config.top === 'mint_hoodie' && (
          <g>
            <path
              d="M 158 315 C 158 395 354 395 354 315 C 330 305 310 320 256 320 C 202 320 182 305 158 315 Z"
              fill="url(#mintGrad)"
              stroke={outline}
              strokeWidth="10"
              strokeLinejoin="round"
            />
            <path d="M 216 350 Q 256 370 296 350 L 290 380 L 222 380 Z" fill="#74D3C5" stroke={outline} strokeWidth="5" />
            <line x1="240" y1="322" x2="238" y2="345" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
            <line x1="272" y1="322" x2="274" y2="345" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
          </g>
        )}

        {config.top === 'yellow_knit' && (
          <path
            d="M 158 318 C 158 392 354 392 354 318 C 325 310 300 322 256 322 C 212 322 187 310 158 318 Z"
            fill="url(#knitGrad)"
            stroke={outline}
            strokeWidth="10"
          />
        )}

        {config.top === 'striped_tee' && (
          <g>
            <clipPath id="teeClip">
              <path d="M 158 318 C 158 390 354 390 354 318 Z" />
            </clipPath>
            <path d="M 158 318 C 158 390 354 390 354 318 Z" fill="#FFFFFF" stroke={outline} strokeWidth="10" />
            <g clipPath="url(#teeClip)">
              <rect x="150" y="332" width="220" height="12" fill="#E63946" />
              <rect x="150" y="354" width="220" height="12" fill="#E63946" />
              <rect x="150" y="376" width="220" height="12" fill="#E63946" />
            </g>
          </g>
        )}

        {/* Z-8: Front Hair / Horn */}
        {config.frontHair === 'mini_horn' && (
          <polygon points="256,90 242,165 270,165" fill="#FFE66D" stroke={outline} strokeWidth="8" strokeLinejoin="round" />
        )}

        {/* Z-9: Headwear */}
        {config.headwear === 'cherry_beanie' && (
          <g>
            <path
              d="M 152 195 C 145 110 367 110 360 195 C 330 180 182 180 152 195 Z"
              fill="url(#cherryGrad)"
              stroke={outline}
              strokeWidth="11"
              strokeLinejoin="round"
            />
            <rect x="150" y="172" width="212" height="32" rx="16" fill="#D90429" stroke={outline} strokeWidth="9" />
            <path d="M 256 120 Q 240 95 235 90 M 256 120 Q 272 95 277 90" fill="none" stroke="#2B9348" strokeWidth="6" strokeLinecap="round" />
            <circle cx="230" cy="88" r="14" fill="#FF4D6D" stroke={outline} strokeWidth="5" />
            <circle cx="282" cy="88" r="14" fill="#FF4D6D" stroke={outline} strokeWidth="5" />
          </g>
        )}

        {config.headwear === 'cat_ears' && (
          <g>
            <polygon points="175,175 145,95 215,135" fill="#2B2D42" stroke={outline} strokeWidth="9" strokeLinejoin="round" />
            <polygon points="175,160 155,110 198,135" fill="#FFAAA6" />
            <polygon points="337,175 367,95 297,135" fill="#2B2D42" stroke={outline} strokeWidth="9" strokeLinejoin="round" />
            <polygon points="337,160 357,110 314,135" fill="#FFAAA6" />
          </g>
        )}

        {config.headwear === 'round_glasses' && (
          <g>
            <circle cx="198" cy="265" r="32" fill="none" stroke="#6C757D" strokeWidth="8" />
            <circle cx="314" cy="265" r="32" fill="none" stroke="#6C757D" strokeWidth="8" />
            <line x1="230" y1="265" x2="282" y2="265" stroke="#6C757D" strokeWidth="8" />
          </g>
        )}

        {/* Z-10: Handheld */}
        {config.handheld === 'heart_balloon' && (
          <g>
            <path d="M 370 330 Q 420 300 405 200" fill="none" stroke="#6C757D" strokeWidth="5" strokeLinecap="round" />
            <path
              d="M 405 190 C 375 140 330 185 405 240 C 480 185 435 140 405 190 Z"
              fill="#FF4D6D"
              stroke={outline}
              strokeWidth="9"
              transform="scale(0.8) translate(100, -20)"
            />
          </g>
        )}

        {config.handheld === 'gameboy' && (
          <g transform="translate(350, 310) rotate(-10)">
            <rect x="0" y="0" width="46" height="70" rx="8" fill="#48CAE4" stroke={outline} strokeWidth="7" />
            <rect x="7" y="8" width="32" height="26" rx="4" fill="#90E0EF" stroke={outline} strokeWidth="4" />
            <circle cx="15" cy="46" r="5" fill="#03045E" />
            <circle cx="31" cy="52" r="5" fill="#D90429" />
          </g>
        )}

        {/* Z-11: Front Effect */}
        {config.effect === 'sparkles' && (
          <g fill="#FFE66D" stroke={outline} strokeWidth="3">
            <polygon points="120,160 124,175 139,179 124,183 120,198 116,183 101,179 116,175" />
            <polygon points="385,150 388,162 400,165 388,168 385,180 382,168 370,165 382,162" />
            <polygon points="395,350 398,360 408,363 398,366 395,376 392,366 382,363 392,360" fill="#FF85A1" />
          </g>
        )}
      </svg>
    </div>
  );
};
export const DEFAULT_MOKI = DEFAULT_AVATAR_MOKI;
export const DEFAULT_POKI = DEFAULT_AVATAR_POKI;
export default AvatarRenderer;
