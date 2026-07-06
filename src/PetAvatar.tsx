import type { ReactNode } from "react";
import type { Behavior, PetProfile } from "./types";

interface PetAvatarProps {
  pet: PetProfile;
  behavior?: Behavior;
  compact?: boolean;
}

const outline = "#704c35";
const face = "#563927";

export function PetAvatar({ pet, behavior = "idle", compact = false }: PetAvatarProps) {
  const props = { pet, behavior, compact };

  switch (pet.pattern) {
    case "punching-bag":
      return <PunchingBag {...props} />;
    case "keyboard-buddy":
      return <KeyboardBuddy {...props} />;
    case "capybara":
    case "snack-capybara":
      return <CapybaraBuddy {...props} />;
    case "elephant":
      return <ElephantBuddy {...props} />;
    case "blue-monster":
      return <BlueMonster {...props} />;
    case "raccoon":
      return <RaccoonBuddy {...props} />;
    case "yorkie":
      return <YorkieBuddy {...props} />;
    default:
      return <PatchCat {...props} />;
  }
}

function SvgShell({
  label,
  compact,
  children
}: {
  label: string;
  compact: boolean;
  children: ReactNode;
}) {
  return (
    <svg className="pet-svg sticker-pet" viewBox="0 0 180 150" role="img" aria-label={label}>
      {!compact && <ellipse className="soft-shadow" cx="92" cy="132" rx="52" ry="9" />}
      {children}
    </svg>
  );
}

function PatchCat({ pet, behavior, compact }: Required<PetAvatarProps>) {
  const sleeping = behavior === "sleep";

  return (
    <SvgShell label={`${pet.name} patch cat`} compact={compact}>
      <g className={behavior === "walk" ? "pet-walk-body" : undefined}>
        <path d="M50 83 C50 50 72 29 97 29 C122 29 145 51 145 84 C145 113 125 126 96 126 C69 126 50 112 50 83Z" fill={pet.primaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M58 61 L65 31 L83 51Z" fill={pet.primaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M126 51 L144 31 L148 62Z" fill={pet.accentColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M63 49 C73 31 92 31 98 58 C86 66 73 65 63 49Z" fill={pet.secondaryColor} />
        <path d="M113 35 C132 37 143 53 136 70 C123 66 116 54 113 35Z" fill={pet.accentColor} />
        <circle cx="67" cy="93" r="15" fill="#fffdf8" stroke={outline} strokeWidth="4" />
        <circle cx="126" cy="93" r="15" fill="#fffdf8" stroke={outline} strokeWidth="4" />
        <circle cx="63" cy="92" r="3" fill="#ee9a89" />
        <circle cx="71" cy="88" r="3" fill="#ee9a89" />
        <circle cx="75" cy="96" r="3" fill="#ee9a89" />
        <circle cx="122" cy="92" r="3" fill="#ee9a89" />
        <circle cx="130" cy="88" r="3" fill="#ee9a89" />
        <circle cx="134" cy="96" r="3" fill="#ee9a89" />
        {sleeping ? (
          <>
            <path d="M82 76 C88 82 94 82 100 76" fill="none" stroke={face} strokeWidth="4" strokeLinecap="round" />
            <path d="M111 76 C117 82 123 82 129 76" fill="none" stroke={face} strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="91" cy="75" r="4" fill={face} />
            <circle cx="119" cy="75" r="4" fill={face} />
          </>
        )}
        <path d="M105 83 C101 88 97 88 93 83" fill="none" stroke={face} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M106 83 C110 88 114 88 118 83" fill="none" stroke={face} strokeWidth="3.5" strokeLinecap="round" />
      </g>
    </SvgShell>
  );
}

function KeyboardBuddy({ pet, behavior, compact }: Required<PetAvatarProps>) {
  const sleeping = behavior === "sleep";

  return (
    <SvgShell label={`${pet.name} keyboard buddy`} compact={compact}>
      <g className={behavior === "walk" ? "pet-walk-body" : undefined}>
        <path d="M44 103 L133 113 L154 86 L70 76Z" fill="#eea43d" stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M57 98 L130 106 L142 91 L72 83Z" fill="#ffd662" stroke={outline} strokeWidth="3" strokeLinejoin="round" />
        {Array.from({ length: 18 }).map((_, index) => {
          const col = index % 6;
          const row = Math.floor(index / 6);
          return <rect key={index} x={70 + col * 10 + row * 3} y={89 + row * 6} width="7" height="4" rx="1" fill="#fff4c8" stroke="#c6862e" strokeWidth="1" />;
        })}
        <path d="M67 64 C67 35 88 20 108 25 C130 31 143 50 139 76 C135 98 118 105 99 102 C79 99 67 86 67 64Z" fill={pet.primaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M75 42 L84 22 L96 39Z" fill={pet.secondaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M122 39 L136 24 L137 49Z" fill={pet.secondaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <circle cx="80" cy="75" r="8" fill="#f19a82" opacity="0.86" />
        <circle cx="128" cy="75" r="8" fill="#f19a82" opacity="0.86" />
        {sleeping ? (
          <>
            <path d="M93 62 C98 67 104 67 109 62" fill="none" stroke={face} strokeWidth="4" strokeLinecap="round" />
            <path d="M116 62 C121 67 127 67 132 62" fill="none" stroke={face} strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M92 60 L92 68" stroke={face} strokeWidth="4" strokeLinecap="round" />
            <path d="M124 60 L124 68" stroke={face} strokeWidth="4" strokeLinecap="round" />
          </>
        )}
        <path d="M108 69 C105 76 105 81 108 88" fill="none" stroke={face} strokeWidth="4" strokeLinecap="round" />
        <path d="M91 88 C83 94 77 93 70 87" fill="none" stroke={outline} strokeWidth="5" strokeLinecap="round" />
        <path d="M125 88 C134 94 140 93 147 87" fill="none" stroke={outline} strokeWidth="5" strokeLinecap="round" />
      </g>
    </SvgShell>
  );
}

function CapybaraBuddy({ pet, behavior, compact }: Required<PetAvatarProps>) {
  const sleeping = behavior === "sleep";

  return (
    <SvgShell label={`${pet.name} capybara`} compact={compact}>
      <g className={behavior === "walk" ? "pet-walk-body" : undefined}>
        <path d="M43 111 C55 91 75 84 101 86 C126 88 141 96 149 114 C129 129 70 129 43 111Z" fill="#f0a99a" stroke="#cc7f72" strokeWidth="5" strokeLinejoin="round" />
        <path d="M45 86 C46 56 70 38 104 39 C135 40 154 58 153 86 C152 111 129 124 99 123 C68 122 44 110 45 86Z" fill={pet.primaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M68 54 C68 42 76 35 88 38 C91 50 82 58 68 54Z" fill={pet.accentColor} stroke={outline} strokeWidth="4" strokeLinejoin="round" />
        <path d="M128 54 C129 42 138 36 148 41 C148 53 139 60 128 54Z" fill={pet.accentColor} stroke={outline} strokeWidth="4" strokeLinejoin="round" />
        <ellipse cx="112" cy="80" rx="28" ry="20" fill="#a9693f" opacity="0.54" />
        {sleeping ? (
          <>
            <path d="M83 70 C88 75 94 75 99 70" fill="none" stroke={face} strokeWidth="4" strokeLinecap="round" />
            <path d="M125 70 C130 75 136 75 141 70" fill="none" stroke={face} strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M84 66 L84 73" stroke={face} strokeWidth="4" strokeLinecap="round" />
            <path d="M132 67 L132 74" stroke={face} strokeWidth="4" strokeLinecap="round" />
          </>
        )}
        <path d="M109 76 C105 82 105 90 110 96" fill="none" stroke={face} strokeWidth="4" strokeLinecap="round" />
        <circle cx="66" cy="83" r="8" fill="#e9927f" opacity="0.76" />
        <circle cx="147" cy="84" r="8" fill="#e9927f" opacity="0.76" />
        <circle cx="111" cy="102" r="12" fill="#ffd889" stroke={outline} strokeWidth="4" />
        <circle cx="107" cy="99" r="2" fill="#9d7040" />
        <circle cx="114" cy="104" r="2" fill="#9d7040" />
        <path d="M78 98 C86 108 97 110 108 104" fill="none" stroke={outline} strokeWidth="5" strokeLinecap="round" />
        <path d="M137 98 C130 108 121 110 113 104" fill="none" stroke={outline} strokeWidth="5" strokeLinecap="round" />
      </g>
    </SvgShell>
  );
}

function ElephantBuddy({ pet, behavior, compact }: Required<PetAvatarProps>) {
  const sleeping = behavior === "sleep";

  return (
    <SvgShell label={`${pet.name} elephant`} compact={compact}>
      <g className={behavior === "walk" ? "pet-walk-body" : undefined}>
        <path d="M48 87 C49 55 72 34 105 34 C135 34 154 55 153 86 C152 113 130 128 102 127 C72 126 47 113 48 87Z" fill={pet.primaryColor} stroke={pet.accentColor} strokeWidth="5" strokeLinejoin="round" />
        <path d="M60 76 C35 60 27 84 43 103 C58 103 66 91 60 76Z" fill={pet.primaryColor} stroke={pet.accentColor} strokeWidth="5" strokeLinejoin="round" />
        <path d="M139 76 C163 60 171 84 156 103 C140 103 133 91 139 76Z" fill={pet.primaryColor} stroke={pet.accentColor} strokeWidth="5" strokeLinejoin="round" />
        <path d="M48 83 C44 74 47 67 58 63" fill="none" stroke={pet.secondaryColor} strokeWidth="5" strokeLinecap="round" opacity="0.75" />
        <path d="M151 83 C155 74 152 67 141 63" fill="none" stroke={pet.secondaryColor} strokeWidth="5" strokeLinecap="round" opacity="0.75" />
        {sleeping ? (
          <>
            <path d="M81 69 C87 74 94 74 100 69" fill="none" stroke={pet.eyeColor} strokeWidth="4" strokeLinecap="round" />
            <path d="M116 69 C122 74 129 74 135 69" fill="none" stroke={pet.eyeColor} strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="89" cy="68" r="4.5" fill={pet.eyeColor} />
            <circle cx="126" cy="68" r="4.5" fill={pet.eyeColor} />
          </>
        )}
        <path d="M107 73 C99 84 99 100 111 106 C119 110 124 105 121 99" fill="none" stroke={pet.accentColor} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M91 97 C97 104 105 105 111 101" fill="none" stroke={pet.accentColor} strokeWidth="5" strokeLinecap="round" />
        <circle cx="73" cy="82" r="8" fill="#e9b0b2" opacity="0.72" />
        <circle cx="141" cy="82" r="8" fill="#e9b0b2" opacity="0.72" />
        <path d="M76 112 C83 120 93 120 100 112" fill="none" stroke={pet.accentColor} strokeWidth="7" strokeLinecap="round" />
        <path d="M126 112 C119 120 110 120 103 112" fill="none" stroke={pet.accentColor} strokeWidth="7" strokeLinecap="round" />
      </g>
    </SvgShell>
  );
}

function BlueMonster({ pet, behavior, compact }: Required<PetAvatarProps>) {
  const sleeping = behavior === "sleep";

  return (
    <SvgShell label={`${pet.name} tiny horn blob`} compact={compact}>
      <g className={behavior === "walk" ? "pet-walk-body" : undefined}>
        <path d="M71 73 C73 43 92 30 113 39 C132 47 144 65 137 93 C129 116 101 123 80 108 C70 101 67 88 71 73Z" fill={pet.primaryColor} stroke="#338f92" strokeWidth="5" strokeLinejoin="round" />
        <path d="M101 39 L111 12 L124 42Z" fill={pet.accentColor} stroke="#5e4a8f" strokeWidth="5" strokeLinejoin="round" />
        <path d="M74 77 C58 80 54 93 66 99" fill="none" stroke="#338f92" strokeWidth="9" strokeLinecap="round" />
        <path d="M136 77 C153 80 156 93 145 99" fill="none" stroke="#338f92" strokeWidth="9" strokeLinecap="round" />
        {sleeping ? (
          <>
            <path d="M88 70 C96 77 105 77 113 70" fill="none" stroke={pet.eyeColor} strokeWidth="5" strokeLinecap="round" />
            <path d="M114 70 C122 77 131 77 139 70" fill="none" stroke={pet.eyeColor} strokeWidth="5" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="96" cy="70" r="16" fill="#f9f7ff" />
            <circle cx="124" cy="70" r="16" fill="#f9f7ff" />
            <circle cx="101" cy="72" r="7" fill={pet.eyeColor} />
            <circle cx="119" cy="72" r="7" fill={pet.eyeColor} />
          </>
        )}
        <path d="M104 95 C113 101 123 100 130 93" fill="none" stroke={pet.eyeColor} strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="84" cy="93" rx="7" ry="5" fill="#44babd" />
        <ellipse cx="137" cy="93" rx="7" ry="5" fill="#44babd" />
      </g>
    </SvgShell>
  );
}

function RaccoonBuddy({ pet, behavior, compact }: Required<PetAvatarProps>) {
  const sleeping = behavior === "sleep";

  return (
    <SvgShell label={`${pet.name} raccoon`} compact={compact}>
      <g className={behavior === "walk" ? "pet-walk-body" : undefined}>
        <path d="M128 99 C151 97 157 72 138 61 C124 69 122 84 134 92" fill={pet.primaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M136 65 L151 73 M131 80 L153 88" stroke={pet.secondaryColor} strokeWidth="6" strokeLinecap="round" />
        <path d="M54 90 C57 54 78 31 105 31 C131 31 148 56 142 91 C137 119 116 130 94 127 C69 124 51 113 54 90Z" fill={pet.primaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M66 54 L77 29 L91 49Z" fill={pet.primaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M119 49 L135 31 L138 58Z" fill={pet.primaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M72 67 C80 47 94 46 104 65 C96 76 83 78 72 67Z" fill={pet.secondaryColor} />
        <path d="M104 65 C115 46 129 49 136 68 C125 79 113 77 104 65Z" fill={pet.secondaryColor} />
        <ellipse cx="103" cy="83" rx="26" ry="22" fill="#f3e5c9" />
        {sleeping ? (
          <>
            <path d="M84 69 C90 75 97 75 103 69" fill="none" stroke="#fff7e6" strokeWidth="4" strokeLinecap="round" />
            <path d="M112 69 C118 75 125 75 131 69" fill="none" stroke="#fff7e6" strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="90" cy="68" r="5" fill="#fff7e6" />
            <circle cx="119" cy="68" r="5" fill="#fff7e6" />
            <circle cx="91" cy="68" r="2.5" fill={pet.eyeColor} />
            <circle cx="118" cy="68" r="2.5" fill={pet.eyeColor} />
          </>
        )}
        <path d="M103 79 C100 85 100 91 104 96" fill="none" stroke={face} strokeWidth="4" strokeLinecap="round" />
        <path d="M82 111 C87 119 98 120 104 112" fill="none" stroke={outline} strokeWidth="7" strokeLinecap="round" />
        <path d="M126 111 C121 119 111 120 104 112" fill="none" stroke={outline} strokeWidth="7" strokeLinecap="round" />
      </g>
    </SvgShell>
  );
}

function PunchingBag({ pet, behavior, compact }: Required<PetAvatarProps>) {
  return (
    <SvgShell label={`${pet.name} training buddy`} compact={compact}>
      <g className={behavior === "walk" || behavior === "jump" ? "pet-walk-body" : undefined}>
        <ellipse cx="92" cy="128" rx="30" ry="8" fill="#3f3e38" stroke="#282723" strokeWidth="4" />
        <path d="M92 91 V123" stroke="#4c4b45" strokeWidth="8" strokeLinecap="round" />
        <path d="M76 89 H108" stroke="#4c4b45" strokeWidth="8" strokeLinecap="round" />
        <path d="M65 44 C68 24 83 16 99 20 C118 25 127 42 121 64 C116 84 101 96 84 91 C70 87 62 67 65 44Z" fill={pet.primaryColor} stroke="#2f3030" strokeWidth="5" strokeLinejoin="round" />
        <path d="M70 35 C86 48 101 50 119 44" fill="none" stroke={pet.secondaryColor} strokeWidth="10" strokeLinecap="round" />
        <path d="M68 69 C84 57 100 57 117 70" fill="none" stroke={pet.secondaryColor} strokeWidth="10" strokeLinecap="round" />
        <rect x="73" y="49" width="42" height="20" rx="10" fill="#fff4c8" stroke="#2f3030" strokeWidth="4" />
        <text x="94" y="63" textAnchor="middle" fontSize="10" fontWeight="800" fill="#3e3429">
          BOX
        </text>
      </g>
    </SvgShell>
  );
}

function YorkieBuddy({ pet, behavior, compact }: Required<PetAvatarProps>) {
  const sleeping = behavior === "sleep";

  return (
    <SvgShell label={`${pet.name} yorkie`} compact={compact}>
      <g className={behavior === "walk" ? "pet-walk-body" : undefined}>
        <path d="M54 88 C55 56 76 35 104 35 C131 35 148 56 145 88 C142 116 120 128 98 127 C73 126 52 115 54 88Z" fill={pet.primaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M66 57 C47 45 43 70 54 88 C65 86 70 73 66 57Z" fill={pet.accentColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M132 57 C151 45 155 70 144 88 C133 86 128 73 132 57Z" fill={pet.accentColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M77 46 C88 28 113 29 124 47 C109 43 93 43 77 46Z" fill={pet.secondaryColor} />
        <ellipse cx="101" cy="82" rx="24" ry="19" fill={pet.secondaryColor} />
        {sleeping ? (
          <>
            <path d="M83 70 C89 75 95 75 101 70" fill="none" stroke={face} strokeWidth="4" strokeLinecap="round" />
            <path d="M109 70 C115 75 121 75 127 70" fill="none" stroke={face} strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="88" cy="68" r="4.5" fill={face} />
            <circle cx="116" cy="68" r="4.5" fill={face} />
          </>
        )}
        <ellipse cx="102" cy="80" rx="6" ry="4" fill={face} />
        <path d="M102 84 C97 91 90 91 84 87" fill="none" stroke={face} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M103 84 C108 91 115 91 121 87" fill="none" stroke={face} strokeWidth="3.5" strokeLinecap="round" />
      </g>
    </SvgShell>
  );
}
