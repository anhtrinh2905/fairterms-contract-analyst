type LogoMarkProps = {
  size?: number;
  className?: string;
};

export function LogoMark({ size = 36, className = "" }: LogoMarkProps) {
  const cls = ["ft-logo-wrap", className].filter(Boolean).join(" ");

  return (
    <span className={cls} style={{ width: size, height: size }}>
      <img
        src="/fairterms/logo_light_mode.png"
        alt=""
        width={size}
        height={size}
        className="ft-logo ft-logo--light"
        decoding="async"
      />
      <img
        src="/fairterms/logo_dark_mode.png"
        alt=""
        width={size}
        height={size}
        className="ft-logo ft-logo--dark"
        decoding="async"
      />
    </span>
  );
}
